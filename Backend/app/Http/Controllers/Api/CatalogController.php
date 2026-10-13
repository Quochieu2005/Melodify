<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Album;
use App\Models\Artist;
use App\Models\ArtistFollower;
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
use App\Models\SongVideo;
use App\Models\Topic;
use App\Models\TopicSong;
use App\Services\Music\LyricsClient;
use App\Services\Music\NhacCuaTuiClient;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
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
        $topicFilter = trim((string) $request->input('topic', ''));
        $genreFilter = trim((string) $request->input('genre', ''));
        $topic = $topicFilter !== '' ? Topic::query()->where('slug', $topicFilter)->first() : null;
        $genre = $genreFilter !== '' ? Genre::query()->where('slug', $genreFilter)->first() : null;
        $topicId = $topic !== null ? (string) $topic->getKey() : ($topicFilter !== '' ? $topicFilter : null);
        $genreId = $genre !== null ? (string) $genre->getKey() : ($genreFilter !== '' ? $genreFilter : null);
        $perPage = min(max($request->integer('per_page', 20), 1), 50);
        $query = Playlist::query()
            ->whereIn('status', ['active'])
            ->whereIn('visibility', ['public', 'unlisted']);

        if ($request->filled('q')) {
            $term = trim((string) $request->input('q'));
            $query->where('name', 'like', "%{$term}%");
        }

        $items = $query
            ->orderBy('sort_order')
            ->orderByDesc('created_at')
            ->get()
            ->filter(function (Playlist $playlist) use ($topicId, $genreId): bool {
                return ($topicId === null || $this->relationContainsId($playlist->topic_ids ?? [], $topicId))
                    && ($genreId === null || $this->relationContainsId($playlist->genre_ids ?? [], $genreId));
            })
            ->values();
        $page = max($request->integer('page', 1), 1);
        $total = $items->count();
        $pageItems = $items->forPage($page, $perPage)->values();

        return response()->json([
            'data' => $pageItems->map(fn (Playlist $playlist): array => $this->playlistData($playlist))->all(),
            'meta' => [
                'current_page' => $page,
                'last_page' => max((int) ceil($total / $perPage), 1),
                'per_page' => $perPage,
                'total' => $total,
            ],
        ]);
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

    public function homeDiscovery(): JsonResponse
    {
        $dateKey = now(config('app.timezone', 'Asia/Ho_Chi_Minh'))->toDateString();
        $fullAudioBySong = SongAudioFile::query()
            ->where('status', 'active')
            ->where('file_type', 'full')
            ->get()
            ->filter(fn (SongAudioFile $audio): bool => ! (bool) $audio->premium_only)
            ->keyBy(fn (SongAudioFile $audio): string => (string) $audio->song_id);

        $freeFullSongs = Song::query()
            ->where('status', 'published')
            ->get()
            ->filter(fn (Song $song): bool => $fullAudioBySong->has((string) $song->getKey()))
            ->values();

        $singleCandidates = $freeFullSongs
            ->filter(fn (Song $song): bool => (int) ($song->is_hot ?? 0) === 0)
            ->sortByDesc(fn (Song $song): int => (int) ($song->release_date?->getTimestamp() ?? $song->created_at?->getTimestamp() ?? 0))
            ->take(50)
            ->values();

        $tiktokPlaylists = Playlist::query()
            ->where('status', 'active')
            ->whereIn('visibility', ['public', 'unlisted'])
            ->get()
            ->filter(function (Playlist $playlist): bool {
                $searchable = Str::lower(trim((string) $playlist->name.' '.(string) $playlist->slug));

                return Str::contains($searchable, 'tiktok');
            })
            ->values();
        $tiktokPlaylistIds = $tiktokPlaylists->map(fn (Playlist $playlist): string => (string) $playlist->getKey())->all();
        $tiktokSongIds = empty($tiktokPlaylistIds)
            ? []
            : PlaylistSong::query()
                ->whereIn('playlist_id', $tiktokPlaylistIds)
                ->get()
                ->pluck('song_id')
                ->map(fn (mixed $songId): string => (string) $songId)
                ->unique()
                ->flip()
                ->all();
        $tiktokSongs = $freeFullSongs
            ->filter(fn (Song $song): bool => isset($tiktokSongIds[(string) $song->getKey()]))
            ->values();

        return response()->json([
            'data' => [
                'single_new_releases' => $this->dailySongOrder($singleCandidates, $dateKey.'|single')
                    ->take(15)
                    ->map(fn (Song $song): array => $this->localSongData($song))
                    ->values()
                    ->all(),
                'tiktok_top_mix' => $this->dailySongOrder($tiktokSongs, $dateKey.'|tiktok')
                    ->take(15)
                    ->map(fn (Song $song): array => $this->localSongData($song))
                    ->values()
                    ->all(),
            ],
            'meta' => [
                'date' => $dateKey,
                'refresh_hours' => 24,
            ],
        ]);
    }

    public function videos(Request $request): JsonResponse
    {
        $perPage = min(max($request->integer('per_page', 20), 1), 50);
        $query = SongVideo::query()->where('status', 'active');

        if ($request->filled('q')) {
            $term = trim((string) $request->input('q'));
            $query->where(function ($nestedQuery) use ($term): void {
                $nestedQuery
                    ->where('title', 'like', "%{$term}%")
                    ->orWhere('slug', 'like', "%{$term}%");
            });
        }

        $items = $query
            ->orderBy('sort_order')
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return response()->json([
            'data' => collect($items->items())->map(fn (SongVideo $video): array => $this->videoData($video))->values()->all(),
            'meta' => [
                'current_page' => $items->currentPage(),
                'last_page' => $items->lastPage(),
                'per_page' => $items->perPage(),
                'total' => $items->total(),
            ],
        ]);
    }

    public function video(string $slug): JsonResponse
    {
        $video = SongVideo::query()->where('status', 'active')->where('slug', $slug)->first();
        if (! $video) {
            try {
                $video = SongVideo::query()->where('status', 'active')->find($slug);
            } catch (\Throwable) {
                $video = null;
            }
        }

        abort_unless($video, 404);

        return response()->json(['data' => $this->videoData($video)]);
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
        $artistId = (string) $artist->getKey();
        $data = [
            'id' => $artistId,
            'name' => $artist->name,
            'real_name' => $this->artistRealName($artist),
            'slug' => $artist->slug,
            'bio' => $artist->bio,
            'avatar_url' => $artist->avatar_url,
            'verified' => (bool) $artist->verified,
            'status' => $artist->status,
        ];

        if (! $includeFeaturedSongs) {
            return $data;
        }

        $linkedSongIds = SongArtist::query()
            ->where('artist_id', $artistId)
            ->pluck('song_id')
            ->map(fn ($id): string => (string) $id)
            ->values()
            ->all();
        $createdSongIds = Song::query()
            ->where('created_by_artist_id', $artistId)
            ->pluck((new Song())->getKeyName())
            ->map(fn ($id): string => (string) $id)
            ->values()
            ->all();
        $songIds = collect($linkedSongIds)
            ->concat($createdSongIds)
            ->unique()
            ->values()
            ->all();

        $songs = $songIds === []
            ? []
            : Song::query()
                ->whereIn((new Song())->getKeyName(), $songIds)
                ->whereIn('status', ['published', 'draft'])
                ->orderBy('title')
                ->get()
                ->map(fn (Song $song): array => $this->localSongData($song))
                ->values()
                ->all();

        $data['songs'] = $songs;
        $data['song_count'] = count($songs);
        $data['featured_songs'] = collect($songs)
            ->filter(fn (array $song): bool => (int) ($song['is_featured'] ?? 0) === 1)
            ->take(20)
            ->values()
            ->all();
        $data['featured_song_count'] = count($data['featured_songs']);
        $data['followers_count'] = ArtistFollower::query()
            ->where('artist_id', $artistId)
            ->count();

        $data['albums'] = Album::query()
            ->where('status', 'published')
            ->get()
            ->filter(fn (Album $album): bool => (string) ($album->artist_id ?? '') === $artistId
                || in_array($artistId, array_map('strval', (array) ($album->artist_ids ?? [])), true))
            ->map(fn (Album $album): array => $this->albumData($album))
            ->values()
            ->all();

        $playlistIdsFromSongs = $songIds === []
            ? []
            : PlaylistSong::query()
                ->whereIn('song_id', $songIds)
                ->pluck('playlist_id')
                ->map(fn ($id): string => (string) $id)
                ->unique()
                ->values()
                ->all();

        $data['playlists'] = Playlist::query()
            ->where('status', 'active')
            ->whereIn('visibility', ['public', 'unlisted'])
            ->get()
            ->filter(fn (Playlist $playlist): bool => in_array($artistId, array_map('strval', (array) ($playlist->artist_ids ?? [])), true)
                || in_array((string) $playlist->getKey(), $playlistIdsFromSongs, true))
            ->map(fn (Playlist $playlist): array => $this->playlistData($playlist))
            ->values()
            ->all();

        $data['videos'] = SongVideo::query()
            ->where('status', 'active')
            ->get()
            ->filter(fn (SongVideo $video): bool => in_array($artistId, array_map('strval', (array) ($video->artist_ids ?? [])), true)
                || in_array((string) ($video->song_id ?? ''), $songIds, true))
            ->map(fn (SongVideo $video): array => $this->videoData($video))
            ->values()
            ->all();

        return $data;
    }

    private function artistRealName(Artist $artist): ?string
    {
        $realName = trim((string) ($artist->real_name ?? $artist->full_name ?? ''));
        if ($realName !== '') {
            return $realName;
        }

        $bio = trim((string) ($artist->bio ?? ''));
        if ($bio === '') {
            return null;
        }

        $firstPart = trim((string) (preg_split('/\s*[,،]\s*/u', $bio, 2)[0] ?? ''));
        if ($firstPart === '' || mb_strlen($firstPart) > 160 || preg_match('/^(ca sĩ|nghệ sĩ|nhóm|ban nhạc)\b/iu', $firstPart)) {
            return null;
        }

        return $firstPart;
    }

    private function playlistData(Playlist $playlist, bool $includeSongs = false): array
    {
        $artists = $this->playlistArtists($playlist);

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
            'artist_ids' => array_values(array_filter(array_map(
                'strval',
                collect((array) ($playlist->artist_ids ?? []))
                    ->concat(collect($artists)->pluck('id'))
                    ->unique()
                    ->all(),
            ))),
            'artists' => $artists,
            'genre_ids' => array_values(array_map('strval', (array) ($playlist->genre_ids ?? []))),
            'topic_ids' => array_values(array_map('strval', (array) ($playlist->topic_ids ?? []))),
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

    /**
     * A playlist can have its own artist_ids, but imported playlists often only
     * have artists attached to their songs. Resolve both sources for one
     * consistent response in the gallery and detail pages.
     */
    private function playlistArtists(Playlist $playlist): array
    {
        $artistIds = [];
        $artistNames = [];
        $seenArtistIds = [];
        $seenArtistNames = [];

        foreach ((array) ($playlist->artist_ids ?? []) as $artistId) {
            $normalizedId = trim((string) $artistId);
            if ($normalizedId !== '' && ! isset($seenArtistIds[$normalizedId])) {
                $artistIds[] = $normalizedId;
                $seenArtistIds[$normalizedId] = true;
            }
        }

        $playlistSongs = PlaylistSong::query()
            ->where('playlist_id', (string) $playlist->getKey())
            ->orderBy('position')
            ->get();

        foreach ($playlistSongs as $playlistSong) {
            $songId = (string) $playlistSong->song_id;
            $song = Song::query()->find($songId);

            foreach (SongArtist::query()->where('song_id', $songId)->get() as $artistLink) {
                $normalizedId = trim((string) $artistLink->artist_id);
                if ($normalizedId !== '' && ! isset($seenArtistIds[$normalizedId])) {
                    $artistIds[] = $normalizedId;
                    $seenArtistIds[$normalizedId] = true;
                }
            }

            foreach (preg_split('/\s*,\s*|\s+feat\.\s+|\s+ft\.\s+/i', trim((string) ($song?->artist_name ?? '')), -1, PREG_SPLIT_NO_EMPTY) ?: [] as $artistName) {
                $normalizedName = mb_strtolower(trim($artistName));
                if ($normalizedName !== '' && ! isset($seenArtistNames[$normalizedName])) {
                    $artistNames[] = trim($artistName);
                    $seenArtistNames[$normalizedName] = true;
                }
            }
        }

        $artists = [];
        $seenResolvedNames = [];

        foreach ($artistIds as $artistId) {
            $artist = Artist::query()->find($artistId);
            if (! $artist) {
                continue;
            }

            $normalizedName = mb_strtolower(trim((string) $artist->name));
            if ($normalizedName === '' || isset($seenResolvedNames[$normalizedName])) {
                continue;
            }

            $artists[] = [
                'id' => (string) $artist->getKey(),
                'name' => $artist->name,
                'slug' => $artist->slug,
                'avatar_url' => $artist->avatar_url,
            ];
            $seenResolvedNames[$normalizedName] = true;
        }

        foreach ($artistNames as $artistName) {
            $normalizedName = mb_strtolower(trim($artistName));
            if ($normalizedName === '' || isset($seenResolvedNames[$normalizedName])) {
                continue;
            }

            $artist = Artist::query()->where('name', $artistName)->first();
            $artists[] = [
                'id' => $artist ? (string) $artist->getKey() : null,
                'name' => $artist?->name ?: $artistName,
                'slug' => $artist?->slug,
                'avatar_url' => $artist?->avatar_url,
            ];
            $seenResolvedNames[$normalizedName] = true;
        }

        return $artists;
    }

    private function relationContainsId(mixed $value, string $id): bool
    {
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            $value = is_array($decoded) ? $decoded : [];
        }

        return in_array($id, array_map('strval', is_array($value) ? $value : []), true);
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
            'is_hot' => 0,
            'preview_limit_seconds' => null,
            'audio_url' => filled($id) ? route('api.v1.songs.external-audio', ['externalId' => $id]) : null,
            'stream_url' => filled($id) ? route('api.v1.songs.external-audio', ['externalId' => $id]) : null,
            'preview_url' => null,
            'cover_url' => $track['artworkUrl100'] ?? null,
            'country_code' => $track['countryCode'] ?? null,
            'country' => filled($track['countryCode'] ?? null) ? config('music.countries.'.$track['countryCode']) : null,
            'source_url' => $track['trackViewUrl'] ?? null,
            'external_source' => 'nhaccuatui',
        ];
    }

    private function videoData(SongVideo $video): array
    {
        $streamUrl = $video->video_url;
        $embedUrl = null;
        $watchUrl = null;
        $playerType = 'native';
        if ($video->source === 'nhaccuatui' && filled($video->slug ?: $video->getKey())) {
            $streamUrl = route('api.v1.videos.stream', ['slug' => $video->slug ?: $video->getKey()]);
        }
        if ($video->source === 'youtube' && filled($video->external_id)) {
            $watchUrl = 'https://www.youtube.com/watch?v='.$video->external_id;
            $embedUrl = 'https://www.youtube.com/embed/'.$video->external_id;
            $streamUrl = $embedUrl;
            $playerType = 'youtube';
        }

        return [
            'id' => (string) $video->getKey(),
            'slug' => $video->slug,
            'title' => $video->title,
            'video_url' => $streamUrl,
            'embed_url' => $embedUrl,
            'watch_url' => $watchUrl,
            'player_type' => $playerType,
            'youtube_video_id' => $video->source === 'youtube' ? $video->external_id : null,
            'thumbnail_url' => $video->thumbnail_url,
            'duration_seconds' => $video->duration_seconds !== null ? (int) $video->duration_seconds : null,
            'source' => $video->source,
            'external_id' => $video->external_id,
            'external_source' => $video->external_source,
            'source_url' => $video->source_url,
            'artist_ids' => $video->artist_ids ?? [],
            'artists' => $video->artists ?? [],
        ];
    }

    private function dailySongOrder(Collection $songs, string $seed): Collection
    {
        return $songs
            ->sortBy(fn (Song $song): string => hash('sha256', $seed.'|'.(string) $song->getKey()))
            ->values();
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

        if (! $song) {
            $normalizedSlug = Str::slug($slug);
            $song = Song::query()->get()->first(
                fn (Song $candidate): bool => Str::slug((string) $candidate->title) === $normalizedSlug,
            );
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
        $videos = SongVideo::query()
            ->where('song_id', $songId)
            ->where('status', 'active')
            ->orderBy('sort_order')
            ->orderBy('created_at')
            ->get();

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
        $artistCredits = SongArtist::query()
            ->where('song_id', $songId)
            ->get()
            ->map(function (SongArtist $artistLink): ?array {
                $linkedArtist = Artist::query()->find($artistLink->artist_id);

                return $linkedArtist ? [
                    'id' => (string) $linkedArtist->getKey(),
                    'name' => $linkedArtist->name,
                    'slug' => $linkedArtist->slug,
                    'avatar_url' => $linkedArtist->avatar_url,
                ] : null;
            })
            ->filter()
            ->values()
            ->all();

        $creditNames = collect($artistCredits)
            ->pluck('name')
            ->map(fn (string $name): string => mb_strtolower(trim($name)))
            ->all();
        $artistNames = preg_split('/\s*,\s*/', trim((string) $song->artist_name), -1, PREG_SPLIT_NO_EMPTY) ?: [];

        foreach ($artistNames as $artistName) {
            $normalizedName = mb_strtolower(trim($artistName));
            if ($normalizedName === '' || in_array($normalizedName, $creditNames, true)) {
                continue;
            }

            $matchedArtist = Artist::query()->where('name', trim($artistName))->first();
            $artistCredits[] = [
                'id' => $matchedArtist ? (string) $matchedArtist->getKey() : null,
                'name' => trim($artistName),
                'slug' => $matchedArtist?->slug,
                'avatar_url' => $matchedArtist?->avatar_url,
            ];
            $creditNames[] = $normalizedName;
        }

        $primaryArtist = $artistCredits[0] ?? null;
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
            'artist' => ($song->artist_name || $primaryArtist) ? [
                'id' => $primaryArtist['id'] ?? null,
                'name' => $song->artist_name ?: $primaryArtist['name'],
            ] : null,
            'artists' => $artistCredits,
            'publisher' => $song->createdByAdmin?->name ?: $song->createdByArtist?->name ?: 'Melodify',
            'release_date' => $song->release_date?->toDateString(),
            'premium_only' => (bool) ($audio?->premium_only ?? false),
            'has_full_audio' => $audio !== null,
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
            'is_hot' => (int) ($song->is_hot ?? 0),
            'preview_limit_seconds' => (int) ($song->is_hot ?? 0) === 1 ? 30 : null,
            'cover_url' => $song->cover_url,
            'audio_url' => $audioUrl,
            'stream_url' => $audioUrl,
            'preview_url' => $song->preview_url,
            'video_url' => $videos->first() ? $this->videoData($videos->first())['video_url'] : null,
            'videos' => $videos->map(fn (SongVideo $video): array => $this->videoData($video))->values()->all(),
            'source_url' => $song->external_url ?: $song->itunes_url,
            'external_source' => $song->external_source,
            'country_code' => $song->country_code,
            'country' => filled($song->country_code) ? config('music.countries.'.$song->country_code, $song->country_code) : null,
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
