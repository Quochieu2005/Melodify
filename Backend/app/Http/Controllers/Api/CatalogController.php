<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Album;
use App\Models\Artist;
use App\Models\Banner;
use App\Models\Genre;
use App\Models\Favorite;
use App\Models\Playlist;
use App\Models\PlaylistSong;
use App\Models\Song;
use App\Models\SongAudioFile;
use App\Models\SongArtist;
use App\Models\SongGenre;
use App\Models\SongPlayEvent;
use App\Models\SongShare;
use App\Models\Topic;
use App\Models\TopicSong;
use App\Services\Music\LyricsClient;
use App\Services\Music\NhacCuaTuiClient;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use RuntimeException;

class CatalogController extends Controller
{
    public function __construct(
        private readonly NhacCuaTuiClient $nhaccuatui,
        private readonly LyricsClient $lyricsClient,
    ) {}

    public function topics(Request $request): JsonResponse
    {
        return $this->collection($request, Topic::class, ['active'], fn (Topic $topic): array => $this->topicData($topic));
    }

    public function topic(string $slug): JsonResponse
    {
        return $this->show(Topic::class, $slug, ['active'], fn (Topic $topic): array => $this->topicData($topic, true));
    }

    public function genres(Request $request): JsonResponse
    {
        return $this->collection($request, Genre::class, ['active'], fn (Genre $genre): array => $this->genreData($genre));
    }

    public function genre(string $slug): JsonResponse
    {
        return $this->show(Genre::class, $slug, ['active'], fn (Genre $genre): array => $this->genreData($genre, true));
    }

    public function banners(Request $request): JsonResponse
    {
        if ($request->boolean('daily')) {
            $limit = min(max($request->integer('limit', 5), 1), 5);
            $dateKey = now('Asia/Ho_Chi_Minh')->toDateString();
            $activeBanners = Banner::query()
                ->where('status', 'active')
                ->get()
                ->filter(fn (Banner $banner): bool => filled($banner->image_url))
                ->unique(fn (Banner $banner): string => (string) ($banner->image_public_id ?: $banner->image_url))
                ->values();
            $items = $activeBanners
                ->sortByDesc(fn (Banner $banner): string => sha1($dateKey.'|'.(string) $banner->getKey()))
                ->take($limit)
                ->values();

            return response()->json([
                'data' => $items->map(fn (Banner $banner): array => $this->bannerData($banner))->all(),
                'meta' => [
                    'current_page' => 1,
                    'last_page' => 1,
                    'per_page' => $items->count(),
                    'total' => $items->count(),
                    'available' => $activeBanners->count(),
                    'date' => $dateKey,
                ],
            ]);
        }

        return $this->collection($request, Banner::class, ['active'], fn (Banner $banner): array => $this->bannerData($banner), 'title');
    }

    public function banner(string $slug): JsonResponse
    {
        return $this->show(Banner::class, $slug, ['active'], fn (Banner $banner): array => $this->bannerData($banner));
    }

    public function albums(Request $request): JsonResponse
    {
        return $this->collection($request, Album::class, ['published'], fn (Album $album): array => $this->albumData($album), 'title');
    }

    public function album(string $slug): JsonResponse
    {
        return $this->show(Album::class, $slug, ['published'], fn (Album $album): array => $this->albumData($album, true));
    }

    public function artists(Request $request): JsonResponse
    {
        return $this->collection($request, Artist::class, ['active'], fn (Artist $artist): array => $this->artistData($artist));
    }

    public function artist(string $slug): JsonResponse
    {
        return $this->show(Artist::class, $slug, ['active'], fn (Artist $artist): array => $this->artistData($artist, true));
    }

    public function playlists(Request $request): JsonResponse
    {
        return $this->collection(
            $request,
            Playlist::class,
            ['active'],
            fn (Playlist $playlist): array => $this->playlistData($playlist),
            'name',
            fn ($query) => $query->whereIn('visibility', ['public', 'unlisted']),
        );
    }

    public function playlist(string $slug): JsonResponse
    {
        return $this->show(
            Playlist::class,
            $slug,
            ['active'],
            fn (Playlist $playlist): array => $this->playlistData($playlist, true),
            fn ($query) => $query->whereIn('visibility', ['public', 'unlisted']),
        );
    }

    public function songs(Request $request): JsonResponse
    {
        try {
            $perPage = min(max($request->integer('per_page', 10), 1), 10);
            $query = trim((string) ($request->input('q') ?: $request->input('query') ?: 'a'));
            $result = $this->nhaccuatui->searchSongs($query, $perPage);
            $items = data_get($result, 'results', []);

            return response()->json([
                'data' => collect($items)->map(fn (array $track): array => $this->nctTrackData($track))->values()->all(),
                'meta' => [
                    'current_page' => 1,
                    'last_page' => 1,
                    'per_page' => $perPage,
                    'total' => count($items),
                    'source' => 'NhacCuaTui',
                ],
            ]);
        } catch (RuntimeException $exception) {
            return $this->externalApiError($exception);
        }
    }

    public function popularSongs(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'period' => ['nullable', 'in:all,7,30'],
            'sort' => ['nullable', 'in:views,favorites,shares'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);
        $search = trim((string) ($filters['q'] ?? ''));
        $period = (string) ($filters['period'] ?? 'all');
        $sort = (string) ($filters['sort'] ?? 'views');
        $from = $period === 'all' ? null : now()->subDays((int) $period)->startOfDay();
        $limit = (int) ($filters['limit'] ?? 20);
        $songs = Song::query()->whereIn('status', ['published', 'draft']);

        if ($search !== '') {
            $songs->where(function ($query) use ($search): void {
                $query
                    ->where('title', 'like', "%{$search}%")
                    ->orWhere('artist_name', 'like', "%{$search}%");
            });
        }

        $items = $songs
            ->limit(500)
            ->get()
            ->map(function (Song $song) use ($from): array {
                return [
                    'song' => $song,
                    'views' => $this->songViewCount($song, $from),
                    'favorites' => $this->songFavoriteCount($song, $from),
                    'shares' => $this->songShareCount($song, $from),
                ];
            })
            ->sort(function (array $left, array $right) use ($sort): int {
                $views = $right[$sort] <=> $left[$sort];

                return $views !== 0
                    ? $views
                    : strcasecmp((string) $left['song']->title, (string) $right['song']->title);
            })
            ->take($limit)
            ->values()
            ->map(function (array $item): array {
                return array_merge($this->localSongData($item['song']), [
                    'views' => $item['views'],
                    'favorites' => $item['favorites'],
                    'shares' => $item['shares'],
                ]);
            });

        return response()->json([
            'data' => $items->all(),
            'meta' => [
                'total' => $items->count(),
                'period' => $period,
                'sort' => $sort,
                'source' => 'MongoDB',
            ],
        ]);
    }

    public function recordSongView(string $slug, Request $request): JsonResponse
    {
        $song = $this->localSongById($slug);

        abort_unless($song, 404, 'Bài hát chưa được lưu trong kho nhạc.');

        $data = $request->validate([
            'visitor_id' => ['nullable', 'string', 'max:120'],
            'source' => ['nullable', 'string', 'max:30'],
        ]);
        $visitorId = trim((string) ($data['visitor_id'] ?? ''));
        $visitorId = $visitorId !== '' ? $visitorId : hash('sha256', (string) $request->ip());
        $songId = (string) $song->getKey();
        $recentView = SongPlayEvent::query()
            ->where('song_id', $songId)
            ->where('visitor_id', $visitorId)
            ->where('started_at', '>=', now()->subMinutes(30))
            ->exists();

        if (! $recentView) {
            SongPlayEvent::query()->create([
                'song_id' => $songId,
                'visitor_id' => $visitorId,
                'source' => $data['source'] ?? 'web',
                'started_at' => now(),
                'completed' => false,
            ]);
        }

        return response()->json([
            'recorded' => ! $recentView,
            'views' => $this->songViewCount($song),
        ]);
    }

    public function toggleSongFavorite(string $slug, Request $request): JsonResponse
    {
        $song = $this->localSongById($slug);

        abort_unless($song, 404, 'Bài hát chưa được lưu trong kho nhạc.');

        $data = $request->validate([
            'visitor_id' => ['nullable', 'string', 'max:120'],
        ]);
        $actorId = $this->engagementActorId($request, $data['visitor_id'] ?? null);
        $favorite = Favorite::query()
            ->where('user_id', $actorId)
            ->where('song_id', (string) $song->getKey())
            ->first();

        if ($favorite) {
            $favorite->delete();
            $favorited = false;
        } else {
            Favorite::query()->create([
                'user_id' => $actorId,
                'song_id' => (string) $song->getKey(),
            ]);
            $favorited = true;
        }

        return response()->json([
            'favorited' => $favorited,
            'favorites' => $this->songFavoriteCount($song),
        ]);
    }

    public function recordSongShare(string $slug, Request $request): JsonResponse
    {
        $song = $this->localSongById($slug);

        abort_unless($song, 404, 'Bài hát chưa được lưu trong kho nhạc.');

        $data = $request->validate([
            'visitor_id' => ['nullable', 'string', 'max:120'],
            'source' => ['nullable', 'string', 'max:30'],
        ]);
        $actorId = $this->engagementActorId($request, $data['visitor_id'] ?? null);

        SongShare::query()->create([
            'song_id' => (string) $song->getKey(),
            'visitor_id' => $actorId,
            'source' => $data['source'] ?? 'web',
        ]);

        return response()->json([
            'recorded' => true,
            'shares' => $this->songShareCount($song),
        ]);
    }

    public function song(string $slug): JsonResponse
    {
        $localSong = $this->localSongById($slug);

        if ($localSong) {
            return response()->json(['data' => $this->localSongData($localSong, true, true)]);
        }

        try {
            $track = $this->nhaccuatui->getSong($slug);

            return response()->json(['data' => $this->nctTrackData($track)]);
        } catch (RuntimeException $exception) {
            return $this->externalApiError($exception);
        }
    }

    public function lyrics(string $slug, Request $request): JsonResponse
    {
        $localSong = $this->localSongById($slug);

        if ($localSong) {
            return response()->json([
                'data' => $this->localLyricsData($localSong),
                'meta' => [
                    'song_id' => (string) $localSong->getKey(),
                    'language' => $request->input('language'),
                    'source' => 'MongoDB',
                ],
            ]);
        }

        try {
            $track = $this->nhaccuatui->getSong($slug);
            $lyrics = $this->nhaccuatui->getLyrics($slug, $track);

            if (! $lyrics) {
                $lyrics = $this->lyricsClient->find(
                    (string) ($track['trackName'] ?? ''),
                    (string) ($track['artistName'] ?? ''),
                    $track['collectionName'] ?? null,
                    isset($track['trackTimeMillis']) ? (int) round(((int) $track['trackTimeMillis']) / 1000) : null,
                );
            }

            return response()->json([
                'data' => $this->lyricsData($track, $lyrics),
                'meta' => [
                    'song_id' => $slug,
                    'language' => $request->input('language'),
                    'source' => $lyrics['source'] ?? 'NhacCuaTui',
                ],
            ]);
        } catch (RuntimeException $exception) {
            return $this->externalApiError($exception);
        }
    }

    private function collection(Request $request, string $model, array $statuses, callable $transform, string $searchField = 'name', ?Closure $scope = null): JsonResponse
    {
        $perPage = min(max($request->integer('per_page', 20), 1), 50);
        $query = $model::query()->whereIn('status', $statuses);

        if ($scope !== null) {
            $query = $scope($query);
        }

        if ($request->filled('q')) {
            $term = trim((string) $request->input('q'));
            $query->where($searchField, 'like', "%{$term}%");
        }

        $items = $query
            ->orderBy('sort_order')
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return response()->json([
            'data' => collect($items->items())->map($transform)->values()->all(),
            'meta' => [
                'current_page' => $items->currentPage(),
                'last_page' => $items->lastPage(),
                'per_page' => $items->perPage(),
                'total' => $items->total(),
            ],
        ]);
    }

    private function show(string $model, string $slug, array $statuses, callable $transform, ?Closure $scope = null): JsonResponse
    {
        $query = $model::query()->whereIn('status', $statuses);

        if ($scope !== null) {
            $query = $scope($query);
        }

        $item = (clone $query)->where('slug', $slug)->first();

        if (! $item) {
            try {
                $item = (clone $query)->find($slug);
            } catch (\Throwable) {
                $item = null;
            }
        }

        abort_unless($item, 404);

        return response()->json(['data' => $transform($item)]);
    }

    private function topicData(Topic $topic, bool $includeSongs = false): array
    {
        $data = [
            'id' => (string) $topic->getKey(),
            'name' => $topic->name,
            'slug' => $topic->slug,
            'type' => $topic->type ?? 'topic',
            'type_custom' => $topic->type_custom,
            'description' => $topic->description,
            'image_url' => $topic->image_url,
            'sort_order' => (int) ($topic->sort_order ?? 0),
            'status' => $topic->status,
            'song_count' => TopicSong::query()->where('topic_id', (string) $topic->getKey())->count(),
        ];

        if ($includeSongs) {
            $data['songs'] = $this->songsForTopic($topic);
        }

        return $data;
    }

    private function genreData(Genre $genre, bool $includeSongs = false): array
    {
        $data = [
            'id' => (string) $genre->getKey(),
            'name' => $genre->name,
            'slug' => $genre->slug,
            'description' => $genre->description,
            'image_url' => $genre->image_url,
            'sort_order' => (int) ($genre->sort_order ?? 0),
            'status' => $genre->status,
            'song_count' => $genre->songs()->count(),
        ];

        if ($includeSongs) {
            $data['songs'] = Song::query()
                ->whereIn('status', ['published', 'draft'])
                ->whereIn('_id', $genre->songs()->pluck('song_id')->all())
                ->orderBy('title')
                ->get()
                ->map(fn (Song $song): array => $this->localSongData($song))
                ->values()
                ->all();
        }

        return $data;
    }

    private function bannerData(Banner $banner): array
    {
        return [
            'id' => (string) $banner->getKey(),
            'title' => $banner->title,
            'slug' => $banner->slug,
            'image_url' => $banner->image_url,
            'link_url' => $banner->link_url,
            'sort_order' => (int) ($banner->sort_order ?? 0),
            'status' => $banner->status,
        ];
    }

    private function albumData(Album $album, bool $includeSongs = false): array
    {
        $artist = $album->artist;

        $data = [
            'id' => (string) $album->getKey(),
            'title' => $album->title,
            'slug' => $album->slug,
            'artist_id' => $album->artist_id ? (string) $album->artist_id : null,
            'artist' => $artist ? $this->artistData($artist) : null,
            'release_date' => $album->release_date?->toDateString(),
            'cover_url' => $album->cover_url,
            'status' => $album->status,
            'song_count' => Song::query()->where('album_id', (string) $album->getKey())->count(),
        ];

        if ($includeSongs) {
            $data['songs'] = Song::query()
                ->where('album_id', (string) $album->getKey())
                ->whereIn('status', ['published', 'draft'])
                ->orderBy('title')
                ->get()
                ->map(fn (Song $song): array => $this->localSongData($song))
                ->values()
                ->all();
        }

        return $data;
    }

    private function artistData(Artist $artist, bool $includeFeaturedSongs = false): array
    {
        $data = [
            'id' => (string) $artist->getKey(),
            'name' => $artist->name,
            'slug' => $artist->slug,
            'bio' => $artist->bio,
            'avatar_url' => $artist->avatar_url,
            'verified' => (bool) $artist->verified,
            'status' => $artist->status,
        ];

        if (! $includeFeaturedSongs) {
            return $data;
        }

        $songIds = SongArtist::query()
            ->where('artist_id', (string) $artist->getKey())
            ->pluck('song_id')
            ->map(fn ($id): string => (string) $id)
            ->values()
            ->all();

        $data['featured_songs'] = $songIds === []
            ? []
            : Song::query()
                ->whereIn((new Song())->getKeyName(), $songIds)
                ->where('is_featured', 1)
                ->where('status', 'published')
                ->orderByDesc('release_date')
                ->limit(20)
                ->get()
                ->map(fn (Song $song): array => $this->localSongData($song))
                ->values()
                ->all();
        $data['featured_song_count'] = count($data['featured_songs']);

        return $data;
    }

    private function playlistData(Playlist $playlist, bool $includeSongs = false): array
    {
        $data = [
            'id' => (string) $playlist->getKey(),
            'name' => $playlist->name,
            'slug' => $playlist->slug,
            'type' => $playlist->type,
            'type_custom' => $playlist->type_custom,
            'description' => $playlist->description,
            'cover_url' => $playlist->cover_url,
            'visibility' => $playlist->visibility,
            'is_system' => (bool) $playlist->is_system,
            'sort_order' => (int) ($playlist->sort_order ?? 0),
            'status' => $playlist->status,
            'song_count' => PlaylistSong::query()->where('playlist_id', (string) $playlist->getKey())->count(),
        ];

        if ($includeSongs) {
            $data['songs'] = PlaylistSong::query()
                ->where('playlist_id', (string) $playlist->getKey())
                ->orderBy('position')
                ->get()
                ->map(fn ($link): ?array => ($song = $this->localSongById((string) $link->song_id))
                    ? $this->localSongData($song)
                    : null)
                ->filter()
                ->values()
                ->all();
        }

        return $data;
    }

    private function nctTrackData(array $track): array
    {
        $id = (string) ($track['trackId'] ?? '');
        $title = (string) ($track['trackName'] ?? 'Bài hát');
        $artist = [
            'id' => filled($track['artistId'] ?? null) ? (string) $track['artistId'] : null,
            'name' => $track['artistName'] ?? 'Nghệ sĩ chưa xác định',
        ];

        return [
            'id' => $id,
            'title' => $title,
            'slug' => Str::slug($title) ?: $id,
            'artist' => $artist,
            'duration_seconds' => isset($track['trackTimeMillis']) ? (int) round(((int) $track['trackTimeMillis']) / 1000) : null,
            'audio_url' => filled($id) ? route('api.v1.songs.external-audio', ['externalId' => $id]) : null,
            'stream_url' => filled($id) ? route('api.v1.songs.external-audio', ['externalId' => $id]) : null,
            'preview_url' => null,
            'cover_url' => $track['artworkUrl100'] ?? null,
            'source_url' => $track['trackViewUrl'] ?? null,
            'external_source' => 'nhaccuatui',
        ];
    }

    private function lyricsData(array $track, ?array $lyrics): array
    {
        if (! $lyrics) {
            return [];
        }

        $plainLyrics = $lyrics['plainLyrics'] ?? null;
        $syncedLyrics = $lyrics['syncedLyrics'] ?? null;

        if (! filled($plainLyrics) && ! filled($syncedLyrics)) {
            return [];
        }

        return [[
            'id' => (string) ($lyrics['id'] ?? sha1(($track['trackId'] ?? '').'lyrics')),
            'song_id' => (string) ($track['trackId'] ?? ''),
            'language' => 'unknown',
            'content' => $plainLyrics ?: $syncedLyrics,
            'plain_lyrics' => $plainLyrics,
            'synced_lyrics' => $syncedLyrics,
            'is_synced' => filled($syncedLyrics),
            'source' => $lyrics['source'] ?? 'NhacCuaTui',
        ]];
    }

    private function localSongById(string $slug): ?Song
    {
        $song = Song::query()->where('slug', $slug)->first();

        if (! $song) {
            try {
                $song = Song::query()->find($slug);
            } catch (\Throwable) {
                $song = null;
            }
        }

        return $song ?: Song::query()
            ->whereIn('external_source', ['nhaccuatui', 'itunes'])
            ->where('external_id', $slug)
            ->first();
    }

    private function localSongData(Song $song, bool $includeLyrics = false, bool $refreshExternalAudio = false): array
    {
        $songId = (string) $song->getKey();
        $audio = SongAudioFile::query()
            ->where('song_id', $songId)
            ->where('status', 'active')
            ->where('file_type', 'full')
            ->first();

        $externalId = $audio?->external_id;
        if (blank($externalId) && $song->external_source === 'nhaccuatui') {
            $externalId = $song->external_id;
        }

        if ($refreshExternalAudio && filled($externalId)) {
            try {
                $externalTrack = $this->nhaccuatui->getSong((string) $externalId);
                if (filled($externalTrack['streamUrl'] ?? null)) {
                    $audio ??= new SongAudioFile();
                    $audio->song_id = $songId;
                    $audio->file_type = 'full';
                    $audio->file_url = $externalTrack['streamUrl'];
                    $audio->external_id = (string) ($externalTrack['trackId'] ?? $externalId);
                    $audio->source = 'nhaccuatui';
                    $audio->duration_seconds = isset($externalTrack['trackTimeMillis'])
                        ? (int) round(((int) $externalTrack['trackTimeMillis']) / 1000)
                        : $audio->duration_seconds;
                    $audio->premium_only = false;
                    $audio->status = 'active';
                    $audio->save();
                }
            } catch (RuntimeException) {
                // Keep the last signed URL when NhacCuaTui is temporarily unavailable.
            }
        }
        $artistLink = SongArtist::query()->where('song_id', $songId)->first();
        $artist = $artistLink ? Artist::query()->find($artistLink->artist_id) : null;
        $album = filled($song->album_id) ? Album::query()->find($song->album_id) : null;
        $genreLink = SongGenre::query()->where('song_id', $songId)->first();
        $genre = $genreLink ? Genre::query()->find($genreLink->genre_id) : null;
        $topicLinks = TopicSong::query()->where('song_id', $songId)->orderBy('position')->get();
        $playlistLinks = PlaylistSong::query()->where('song_id', $songId)->orderBy('position')->get();

        $audioUrl = $audio?->file_url;
        if ($song->external_source === 'nhaccuatui' || $audio?->source === 'nhaccuatui') {
            $audioUrl = route('api.v1.songs.audio', ['slug' => $song->slug ?: $song->getKey()]);
        }

        $data = [
            'id' => (string) $song->getKey(),
            'external_id' => $song->external_id,
            'title' => $song->title,
            'slug' => $song->slug,
            'artist' => ($song->artist_name || $artist) ? [
                'id' => $artist ? (string) $artist->getKey() : null,
                'name' => $song->artist_name ?: $artist->name,
            ] : null,
            'album' => $album ? [
                'id' => (string) $album->getKey(),
                'title' => $album->title,
            ] : null,
            'genre' => $genre ? [
                'id' => (string) $genre->getKey(),
                'name' => $genre->name,
            ] : null,
            'topics' => $topicLinks
                ->map(fn ($link): ?array => ($topic = Topic::query()->find($link->topic_id)) ? [
                    'id' => (string) $topic->getKey(),
                    'name' => $topic->name,
                    'type' => $topic->type,
                ] : null)
                ->filter()
                ->values()
                ->all(),
            'playlists' => $playlistLinks
                ->map(fn ($link): ?array => ($playlist = Playlist::query()->find($link->playlist_id)) ? [
                    'id' => (string) $playlist->getKey(),
                    'name' => $playlist->name,
                ] : null)
                ->filter()
                ->values()
                ->all(),
            'duration_seconds' => $song->duration_seconds !== null ? (int) $song->duration_seconds : null,
            'is_featured' => (int) ($song->is_featured ?? 0),
            'cover_url' => $song->cover_url,
            'audio_url' => $audioUrl,
            'stream_url' => $audioUrl,
            'preview_url' => $song->preview_url,
            'source_url' => $song->external_url ?: $song->itunes_url,
            'external_source' => $song->external_source,
            'favorite_count' => $this->songFavoriteCount($song),
            'share_count' => $this->songShareCount($song),
            'status' => $song->status,
        ];

        if ($includeLyrics) {
            $data['lyrics'] = $this->localLyricsData($song);
        }

        return $data;
    }

    private function songViewCount(Song $song, ?\DateTimeInterface $from = null): int
    {
        $query = SongPlayEvent::query()->where('song_id', (string) $song->getKey());

        if ($from !== null) {
            $query->where('started_at', '>=', $from);
        }

        return $query->count();
    }

    private function songFavoriteCount(Song $song, ?\DateTimeInterface $from = null): int
    {
        $query = Favorite::query()->where('song_id', (string) $song->getKey());

        if ($from !== null) {
            $query->where('created_at', '>=', $from);
        }

        return $query->count();
    }

    private function songShareCount(Song $song, ?\DateTimeInterface $from = null): int
    {
        $query = SongShare::query()->where('song_id', (string) $song->getKey());

        if ($from !== null) {
            $query->where('created_at', '>=', $from);
        }

        return $query->count();
    }

    private function engagementActorId(Request $request, ?string $visitorId): string
    {
        $visitorId = trim((string) $visitorId);

        return $visitorId !== ''
            ? $visitorId
            : 'visitor:'.hash('sha256', (string) $request->ip());
    }

    private function localLyricsData(Song $song): array
    {
        return $song->lyrics()
            ->orderBy('language')
            ->get()
            ->map(function ($lyric) use ($song): array {
                if ($song->external_source === 'nhaccuatui'
                    && (blank($lyric->synced_lyrics) || preg_match('#^https?://.+\.lrc(?:\?.*)?$#i', (string) $lyric->synced_lyrics) === 1)
                    && filled($song->external_id)) {
                    try {
                        $externalLyrics = $this->nhaccuatui->getLyrics((string) $song->external_id);
                        if (filled($externalLyrics['syncedLyrics'] ?? null)) {
                            $lyric->synced_lyrics = $externalLyrics['syncedLyrics'];
                            $lyric->is_synced = true;
                            $lyric->content = $lyric->plain_lyrics ?: $lyric->synced_lyrics;
                            $lyric->source = 'NhacCuaTui';
                            $lyric->save();
                        }
                    } catch (RuntimeException) {
                        // Keep the local lyrics when the upstream service is unavailable.
                    }
                }

                return [
                    'id' => (string) $lyric->getKey(),
                    'song_id' => (string) $song->getKey(),
                    'language' => $lyric->language,
                    'content' => $lyric->content,
                    'plain_lyrics' => $lyric->plain_lyrics,
                    'synced_lyrics' => $lyric->synced_lyrics,
                    'is_synced' => (bool) $lyric->is_synced,
                    'source' => $lyric->source ?? 'MongoDB',
                ];
            })
            ->values()
            ->all();
    }

    private function songsForTopic(Topic $topic): array
    {
        return TopicSong::query()
            ->where('topic_id', (string) $topic->getKey())
            ->orderBy('position')
            ->get()
            ->map(fn ($link): ?array => ($song = $this->localSongById((string) $link->song_id))
                ? $this->localSongData($song)
                : null)
            ->filter()
            ->values()
            ->all();
    }

    private function externalApiError(RuntimeException $exception): JsonResponse
    {
        report($exception);

        return response()->json(['message' => $exception->getMessage()], 503);
    }
}
