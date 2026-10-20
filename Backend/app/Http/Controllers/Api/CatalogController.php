<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Admin;
use App\Models\Album;
use App\Models\AlbumFavorite;
use App\Models\AlbumShare;
use App\Models\Artist;
use App\Models\ArtistFollower;
use App\Models\ArtistViewEvent;
use App\Models\Banner;
use App\Models\ChartShare;
use App\Models\Favorite;
use App\Models\Genre;
use App\Models\Playlist;
use App\Models\PlaylistFavorite;
use App\Models\PlaylistShare;
use App\Models\PlaylistSong;
use App\Models\Song;
use App\Models\SongArtist;
use App\Models\SongAudioFile;
use App\Models\SongGenre;
use App\Models\SongPlayEvent;
use App\Models\SongShare;
use App\Models\SongVideo;
use App\Models\Topic;
use App\Models\TopicSong;
use App\Models\User;
use App\Services\Music\LyricsClient;
use App\Services\Music\NhacCuaTuiClient;
use App\Services\Music\SongImportService;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use MongoDB\BSON\Regex;
use MongoDB\BSON\UTCDateTime;
use RuntimeException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

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
            $payload = Cache::store('file')->remember('api:banners:daily:'.$dateKey.':'.$limit.':'.$this->catalogContentRevision(), now()->addDay(), function () use ($dateKey, $limit): array {
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

                return [
                    'data' => $items->map(fn (Banner $banner): array => $this->bannerData($banner))->all(),
                    'meta' => [
                        'current_page' => 1,
                        'last_page' => 1,
                        'per_page' => $items->count(),
                        'total' => $items->count(),
                        'available' => $activeBanners->count(),
                        'date' => $dateKey,
                    ],
                ];
            });

            return response()->json($payload);
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

    public function album(string $slug, Request $request): JsonResponse
    {
        $filters = $request->validate([
            'visitor_id' => ['nullable', 'string', 'max:120'],
        ]);
        $payload = $this->responsePayload($this->show(Album::class, $slug, ['published'], fn (Album $album): array => $this->albumData($album, true)));
        $albumId = (string) data_get($payload, 'data.id', '');
        if ($albumId !== '') {
            $actorId = $this->engagementActorId($request, $filters['visitor_id'] ?? null);
            $payload['data']['favorite_count'] = AlbumFavorite::query()->where('album_id', $albumId)->count();
            $payload['data']['share_count'] = AlbumShare::query()->where('album_id', $albumId)->count();
            $payload['data']['is_favorite'] = AlbumFavorite::query()
                ->where('album_id', $albumId)
                ->where('user_id', $actorId)
                ->exists();
        }

        return response()->json($payload);
    }

    public function toggleAlbumFavorite(string $slug, Request $request): JsonResponse
    {
        $album = $this->findPublishedAlbum($slug);
        abort_unless($album, 404, 'Không tìm thấy album.');

        $data = $request->validate(['visitor_id' => ['nullable', 'string', 'max:120']]);
        $albumId = (string) $album->getKey();
        $actorId = $this->engagementActorId($request, $data['visitor_id'] ?? null);
        $favorite = AlbumFavorite::query()->where('album_id', $albumId)->where('user_id', $actorId)->first();

        if ($favorite) {
            $favorite->delete();
            $favorited = false;
        } else {
            AlbumFavorite::query()->create(['album_id' => $albumId, 'user_id' => $actorId]);
            $favorited = true;
        }

        return response()->json([
            'favorited' => $favorited,
            'favorites' => AlbumFavorite::query()->where('album_id', $albumId)->count(),
        ]);
    }

    public function recordAlbumShare(string $slug, Request $request): JsonResponse
    {
        $album = $this->findPublishedAlbum($slug);
        abort_unless($album, 404, 'Không tìm thấy album.');

        $data = $request->validate([
            'visitor_id' => ['nullable', 'string', 'max:120'],
            'source' => ['nullable', 'string', 'in:facebook,copy_link,web', 'max:30'],
        ]);
        $albumId = (string) $album->getKey();
        AlbumShare::query()->create([
            'album_id' => $albumId,
            'visitor_id' => $this->engagementActorId($request, $data['visitor_id'] ?? null),
            'source' => $data['source'] ?? 'web',
        ]);

        return response()->json([
            'recorded' => true,
            'shares' => AlbumShare::query()->where('album_id', $albumId)->count(),
        ]);
    }

    public function artists(Request $request): JsonResponse
    {
        return $this->collection($request, Artist::class, ['active'], fn (Artist $artist): array => $this->artistData($artist));
    }

    public function forYouArtists(Request $request): JsonResponse
    {
        $requestedGenreIds = collect($request->input('genre_ids', []))
            ->filter(fn ($id): bool => is_string($id) || is_numeric($id))
            ->map(fn ($id): string => trim((string) $id))
            ->filter()
            ->unique()
            ->take(50)
            ->values();

        if ($requestedGenreIds->isEmpty()) {
            return response()->json(['data' => []]);
        }

        $genreIds = Genre::query()
            ->whereIn((new Genre)->getKeyName(), $requestedGenreIds->all())
            ->where('status', 'active')
            ->get()
            ->map(fn (Genre $genre): string => (string) $genre->getKey())
            ->values();

        if ($genreIds->isEmpty()) {
            return response()->json(['data' => []]);
        }

        $linkedSongIds = SongGenre::query()
            ->whereIn('genre_id', $genreIds->all())
            ->pluck('song_id')
            ->map(fn ($id): string => (string) $id)
            ->unique()
            ->values();

        if ($linkedSongIds->isEmpty()) {
            return response()->json(['data' => []]);
        }

        $publishedSongIds = Song::query()
            ->whereIn((new Song)->getKeyName(), $linkedSongIds->all())
            ->where('status', 'published')
            ->get()
            ->map(fn (Song $song): string => (string) $song->getKey())
            ->values();

        if ($publishedSongIds->isEmpty()) {
            return response()->json(['data' => []]);
        }

        $artistIds = SongArtist::query()
            ->whereIn('song_id', $publishedSongIds->all())
            ->pluck('artist_id')
            ->map(fn ($id): string => (string) $id)
            ->filter()
            ->unique()
            ->values();

        if ($artistIds->isEmpty()) {
            return response()->json(['data' => []]);
        }

        $artists = Artist::query()
            ->whereIn('status', ['active'])
            ->whereIn((new Artist)->getKeyName(), $artistIds->all())
            ->orderBy('name')
            ->get();

        return response()->json([
            'data' => $artists->map(fn (Artist $artist): array => $this->artistData($artist))->values()->all(),
        ]);
    }

    public function forYouSong(Request $request): JsonResponse
    {
        $requestedGenreIds = collect($request->input('genre_ids', []))
            ->filter(fn ($id): bool => is_string($id) || is_numeric($id))
            ->map(fn ($id): string => trim((string) $id))
            ->filter()
            ->unique()
            ->take(50)
            ->values();
        $requestedArtistIds = collect($request->input('artist_ids', []))
            ->filter(fn ($id): bool => is_string($id) || is_numeric($id))
            ->map(fn ($id): string => trim((string) $id))
            ->filter()
            ->unique()
            ->take(100)
            ->values();

        if ($requestedGenreIds->isEmpty() || $requestedArtistIds->isEmpty()) {
            return response()->json(['data' => null]);
        }

        $genreIds = Genre::query()
            ->whereIn((new Genre)->getKeyName(), $requestedGenreIds->all())
            ->where('status', 'active')
            ->get()
            ->map(fn (Genre $genre): string => (string) $genre->getKey())
            ->values();
        if ($genreIds->isEmpty()) {
            return response()->json(['data' => null]);
        }

        $genreSongIds = SongGenre::query()
            ->whereIn('genre_id', $genreIds->all())
            ->pluck('song_id')
            ->map(fn ($id): string => (string) $id)
            ->unique()
            ->values();
        if ($genreSongIds->isEmpty()) {
            return response()->json(['data' => null]);
        }

        $publishedSongs = Song::query()
            ->whereIn((new Song)->getKeyName(), $genreSongIds->all())
            ->where('status', 'published')
            ->get();
        $publishedSongIds = $publishedSongs->map(fn (Song $song): string => (string) $song->getKey())->values();
        if ($publishedSongIds->isEmpty()) {
            return response()->json(['data' => null]);
        }

        $eligibleArtistIds = SongArtist::query()
            ->whereIn('song_id', $publishedSongIds->all())
            ->pluck('artist_id')
            ->map(fn ($id): string => (string) $id)
            ->filter()
            ->unique()
            ->values();
        $activeArtistIds = Artist::query()
            ->whereIn((new Artist)->getKeyName(), $eligibleArtistIds->all())
            ->where('status', 'active')
            ->get()
            ->map(fn (Artist $artist): string => (string) $artist->getKey())
            ->values();
        $artistIds = $requestedArtistIds->intersect($activeArtistIds)->values();
        if ($artistIds->isEmpty()) {
            return response()->json(['data' => null]);
        }

        $artistSongIds = SongArtist::query()
            ->whereIn('artist_id', $artistIds->all())
            ->pluck('song_id')
            ->map(fn ($id): string => (string) $id)
            ->unique()
            ->values();
        $matchingSongIds = $publishedSongIds->intersect($artistSongIds)->values();
        if ($matchingSongIds->isEmpty()) {
            return response()->json(['data' => null]);
        }

        $excludedSongIds = collect($request->input('exclude_song_ids', []))
            ->filter(fn ($id): bool => is_string($id) || is_numeric($id))
            ->map(fn ($id): string => trim((string) $id))
            ->filter()
            ->values();
        $eligibleSongIds = $matchingSongIds->reject(fn (string $id): bool => $excludedSongIds->contains($id))->values();
        if ($eligibleSongIds->isEmpty()) {
            $eligibleSongIds = $matchingSongIds;
        }

        $eligibleSongLookup = array_flip($eligibleSongIds->all());
        $candidateSongs = $publishedSongs
            ->filter(fn (Song $song): bool => isset($eligibleSongLookup[(string) $song->getKey()]))
            ->values();
        $candidatePayloads = collect($this->localSongsData($candidateSongs))
            ->filter(fn (array $song): bool => filled($song['audio_url'] ?? null)
                && (empty($song['premium_only']) || filled($song['preview_url'] ?? null)))
            ->values();

        return response()->json([
            'data' => $candidatePayloads->isEmpty() ? null : $candidatePayloads->random(),
        ]);
    }

    public function trendingArtists(): JsonResponse
    {
        $dateKey = now(config('app.timezone', 'Asia/Ho_Chi_Minh'))->toDateString();
        $revision = $this->catalogContentRevision();
        $payload = Cache::store('file')->remember('api:trending-artists:v8:'.$dateKey.':'.$revision, now()->addMinute(), function () use ($dateKey): array {
            $data = $this->trendingArtistsForHome(50);

            return [
                'data' => $data,
                'meta' => [
                    'date' => $dateKey,
                    'limit' => 50,
                    'period_days' => 7,
                    'ranking' => ($data[0]['ranking_source'] ?? null) === 'catalog'
                        ? 'available_weekly_activity + followers + catalog_order'
                        : 'weekly_plays + weekly_views',
                    'source' => ($data[0]['ranking_source'] ?? null) === 'catalog' ? 'catalog' : 'weekly',
                    'total' => count($data),
                ],
            ];
        });

        return response()->json($payload);
    }

    public function artist(string $slug, Request $request): JsonResponse
    {
        $summary = $request->boolean('summary');

        $payload = $this->responsePayload($this->show(Artist::class, $slug, ['active'], fn (Artist $artist): array => $this->artistData($artist, ! $summary, $summary)));
        $artistId = (string) data_get($payload, 'data.id', '');
        $payload['data']['followers_count'] = ArtistFollower::query()->where('artist_id', $artistId)->count();
        $payload['data']['is_following'] = $request->user() && ArtistFollower::query()->where('artist_id', $artistId)->where('user_id', (string) $request->user()->getKey())->exists();

        return response()->json($payload)->header('Cache-Control', 'private, no-store');
    }

    public function recordArtistView(string $slug, Request $request): JsonResponse
    {
        $data = $request->validate([
            'visitor_id' => ['nullable', 'string', 'max:120'],
        ]);
        $query = Artist::query()->where('status', 'active');
        $artist = (clone $query)->where('slug', $slug)->first();
        if (! $artist && preg_match('/^[a-f0-9]{24}$/i', $slug)) {
            $artist = (clone $query)->find($slug);
        }
        abort_unless($artist, 404, 'Không tìm thấy nghệ sĩ.');

        $artistId = (string) $artist->getKey();
        $actor = $request->user()
            ? 'user:'.$request->user()->getKey()
            : 'visitor:'.(trim((string) ($data['visitor_id'] ?? '')) ?: $request->ip());
        $visitorHash = hash('sha256', $actor);
        $cacheKey = 'artist-view:'.$artistId.':'.$visitorHash;
        // Repeated renders, refreshes and canonical redirects count as one visit.
        if (! Cache::store('file')->add($cacheKey, true, now()->addMinutes(30))) {
            return response()->json(['recorded' => false]);
        }

        try {
            ArtistViewEvent::query()->create([
                'artist_id' => $artistId,
                'visitor_hash' => $visitorHash,
                'viewed_at' => now(),
            ]);
        } catch (\Throwable $error) {
            Cache::store('file')->forget($cacheKey);
            throw $error;
        }

        $dateKey = now(config('app.timezone', 'Asia/Ho_Chi_Minh'))->toDateString();
        $revision = $this->catalogContentRevision();
        Cache::store('file')->forget('api:home-bootstrap:v14:'.$dateKey.':'.$revision);
        Cache::store('file')->forget('api:trending-artists:v8:'.$dateKey.':'.$revision);

        return response()->json(['recorded' => true]);
    }

    public function search(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'q' => ['required', 'string', 'max:100'],
            'type' => ['nullable', 'in:all,song,playlist,artist,album,video,user'],
            'page' => ['nullable', 'integer', 'min:1', 'max:1000'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:24'],
            'suggest' => ['nullable', 'boolean'],
        ]);
        $term = trim($filters['q']);
        abort_if($term === '', 422, 'Vui lòng nhập từ khóa tìm kiếm.');
        $type = $filters['type'] ?? 'all';
        $limit = (int) ($filters['limit'] ?? ($type === 'all' ? 6 : 24));
        $page = (int) ($filters['page'] ?? 1);
        $includeTotals = ! ($filters['suggest'] ?? false);
        $literal = new Regex(preg_quote($term, '/'), 'i');
        $normalized = preg_replace('/[^a-z0-9]/', '', Str::slug($term));
        $slugPattern = new Regex($normalized !== '' ? implode('[^a-z0-9]*', str_split($normalized)) : '(?!)', 'i');
        $specs = [
            'song' => [Song::class, 'title', 'published'], 'playlist' => [Playlist::class, 'name', 'active'],
            'artist' => [Artist::class, 'name', 'active'], 'album' => [Album::class, 'title', 'published'],
            'video' => [SongVideo::class, 'title', 'active'], 'user' => [User::class, 'name', 'active'],
        ];
        $results = [];
        $totals = [];
        foreach ($specs as $kind => [$model, $field, $status]) {
            if ($type !== 'all' && $type !== $kind) {
                continue;
            }
            $query = $model::query()->where('status', $status)->where(function ($query) use ($field, $literal, $slugPattern, $kind): void {
                $query->where($field, 'regex', $literal)->orWhere($kind === 'user' ? 'username' : 'slug', 'regex', $slugPattern);
            });
            if ($kind === 'playlist') {
                $query->where('visibility', 'public');
            }
            if ($includeTotals) {
                $totals[$kind] = (clone $query)->count();
            }
            $items = $query->orderBy($field)->skip(($page - 1) * $limit)->take($limit)->get();
            $results[$kind] = match ($kind) {
                'song' => $this->localSongsData($items),
                'playlist' => $items->map(fn (Playlist $item): array => $this->playlistData($item))->all(),
                'album' => $items->map(fn (Album $item): array => $this->albumData($item))->all(),
                'artist' => $items->map(fn (Artist $item): array => $this->artistData($item) + ['followers_count' => ArtistFollower::query()->where('artist_id', (string) $item->getKey())->count()])->all(),
                'video' => $items->map(fn (SongVideo $item): array => $this->videoData($item))->all(),
                'user' => $items->map(fn (User $item): array => FollowController::userSummary($item))->all(),
            };
        }

        return response()->json(['data' => $results, 'meta' => ['query' => $term, 'type' => $type, 'page' => $page, 'per_page' => $limit, 'totals' => $totals]]);
    }

    public function playlists(Request $request): JsonResponse
    {
        $cacheKey = 'api:catalog:playlists:'.$this->catalogContentRevision().':'.sha1(json_encode($request->query(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        $payload = Cache::store('file')->remember($cacheKey, now()->addMinutes(5), function () use ($request): array {
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
            $playlistIds = $pageItems->map(fn (Playlist $playlist): string => (string) $playlist->getKey())->all();
            $songCounts = PlaylistSong::query()
                ->whereIn('playlist_id', $playlistIds)
                ->get()
                ->groupBy(fn (PlaylistSong $link): string => (string) $link->playlist_id)
                ->map(fn (Collection $links): int => $links->count())
                ->all();
            $artistsByPlaylist = $this->playlistArtistsForCollection($pageItems);

            return [
                'data' => $pageItems->map(fn (Playlist $playlist): array => $this->playlistData(
                    $playlist,
                    false,
                    $artistsByPlaylist[(string) $playlist->getKey()] ?? [],
                    (int) ($songCounts[(string) $playlist->getKey()] ?? 0),
                ))->all(),
                'meta' => [
                    'current_page' => $page,
                    'last_page' => max((int) ceil($total / $perPage), 1),
                    'per_page' => $perPage,
                    'total' => $total,
                ],
            ];
        });

        return response()->json($payload);
    }

    public function playlist(string $slug, Request $request): JsonResponse
    {
        $playlist = $this->findPublicPlaylist($slug);
        if (! $playlist && $request->user()) {
            $playlist = Playlist::query()->where('status', 'active')->where('user_id', (string) $request->user()->getKey())
                ->where(function ($query) use ($slug): void {
                    $query->where('slug', $slug)->orWhere('_id', $slug);
                })->first();
        }
        abort_unless($playlist, 404, 'Không tìm thấy playlist.');

        $query = $request->validate([
            'visitor_id' => ['nullable', 'string', 'max:120'],
        ]);
        $actorId = $this->engagementActorId($request, $query['visitor_id'] ?? null);
        $playlistId = (string) $playlist->getKey();
        $cacheKey = 'api:playlist-detail:v1:'.$this->catalogContentRevision().':'.sha1($playlistId);
        $data = Cache::store('file')->remember($cacheKey, now()->addMinute(), function () use ($playlist, $playlistId): array {
            $artists = $this->playlistArtistsForCollection(collect([$playlist]))[$playlistId] ?? [];
            $songCount = PlaylistSong::query()->where('playlist_id', $playlistId)->count();
            $playlistData = $this->playlistData($playlist, false, $artists, $songCount);
            $playlistData['songs'] = $this->playlistSongsData($playlist);

            return $playlistData;
        });

        $data['favorite_count'] = PlaylistFavorite::query()->where('playlist_id', $playlistId)->count();
        $data['share_count'] = PlaylistShare::query()->where('playlist_id', $playlistId)->count();
        $data['is_favorite'] = PlaylistFavorite::query()
            ->where('playlist_id', $playlistId)
            ->where('user_id', $actorId)
            ->exists();

        return response()->json(['data' => $data]);
    }

    public function togglePlaylistFavorite(string $slug, Request $request): JsonResponse
    {
        $playlist = $this->findPublicPlaylist($slug);
        abort_unless($playlist, 404, 'Không tìm thấy playlist.');

        $data = $request->validate([
            'visitor_id' => ['nullable', 'string', 'max:120'],
        ]);
        $playlistId = (string) $playlist->getKey();
        $actorId = $this->engagementActorId($request, $data['visitor_id'] ?? null);
        $favorite = PlaylistFavorite::query()
            ->where('playlist_id', $playlistId)
            ->where('user_id', $actorId)
            ->first();

        if ($favorite) {
            $favorite->delete();
            $favorited = false;
        } else {
            PlaylistFavorite::query()->create([
                'playlist_id' => $playlistId,
                'user_id' => $actorId,
            ]);
            $favorited = true;
        }

        return response()->json([
            'favorited' => $favorited,
            'favorites' => PlaylistFavorite::query()->where('playlist_id', $playlistId)->count(),
        ]);
    }

    public function recordPlaylistShare(string $slug, Request $request): JsonResponse
    {
        $playlist = $this->findPublicPlaylist($slug);
        abort_unless($playlist, 404, 'Không tìm thấy playlist.');

        $data = $request->validate([
            'visitor_id' => ['nullable', 'string', 'max:120'],
            'source' => ['nullable', 'string', 'in:facebook,copy_link', 'max:30'],
        ]);
        $playlistId = (string) $playlist->getKey();

        PlaylistShare::query()->create([
            'playlist_id' => $playlistId,
            'visitor_id' => $this->engagementActorId($request, $data['visitor_id'] ?? null),
            'source' => $data['source'] ?? 'copy_link',
        ]);

        return response()->json([
            'recorded' => true,
            'shares' => PlaylistShare::query()->where('playlist_id', $playlistId)->count(),
        ]);
    }

    public function charts(): JsonResponse
    {
        $dateKey = now(config('app.timezone', 'Asia/Ho_Chi_Minh'))->toDateString();
        $items = collect($this->cachedChartPayloads($dateKey))
            ->map(fn (array $chart): array => array_merge($chart, [
                'songs' => collect($chart['songs'])->take(5)->values()->all(),
            ]))
            ->values()
            ->all();

        return response()->json([
            'data' => $items,
            'meta' => [
                'date' => $dateKey,
                'refresh_minutes' => 1,
                'source' => 'MongoDB',
            ],
        ]);
    }

    public function chart(string $slug): JsonResponse
    {
        $dateKey = now(config('app.timezone', 'Asia/Ho_Chi_Minh'))->toDateString();
        $chart = collect($this->cachedChartPayloads($dateKey))->first(fn (array $item): bool => $item['slug'] === $slug);

        abort_unless($chart, 404, 'Không tìm thấy bảng xếp hạng.');

        return response()->json([
            'data' => array_merge($chart, [
                'share_count' => ChartShare::query()->where('chart_slug', $slug)->count(),
            ]),
            'meta' => [
                'date' => $dateKey,
                'refresh_minutes' => 1,
                'source' => 'MongoDB',
            ],
        ]);
    }

    public function recordChartShare(string $slug, Request $request): JsonResponse
    {
        abort_unless(collect($this->chartDefinitions())->contains(fn (array $chart): bool => $chart['slug'] === $slug), 404, 'Không tìm thấy bảng xếp hạng.');

        $data = $request->validate([
            'visitor_id' => ['nullable', 'string', 'max:120'],
            'source' => ['nullable', 'string', 'in:facebook,copy_link,web', 'max:30'],
        ]);
        ChartShare::query()->create([
            'chart_slug' => $slug,
            'visitor_id' => $this->engagementActorId($request, $data['visitor_id'] ?? null),
            'source' => $data['source'] ?? 'web',
        ]);

        return response()->json([
            'recorded' => true,
            'shares' => ChartShare::query()->where('chart_slug', $slug)->count(),
        ]);
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
        $revision = $this->catalogContentRevision();
        $payload = Cache::store('file')->remember('api:home-discovery:v2:'.$dateKey.':'.$revision, now()->addMinute(), function () use ($dateKey): array {
            // Include every published song in the discovery pool, including VIP
            // songs and songs whose audio is still being attached by an admin.
            // The audio endpoint is responsible for enforcing the VIP check.
            $publishedSongs = Song::query()
                ->where('status', 'published')
                ->orderByDesc('release_date')
                ->orderByDesc('created_at')
                ->limit(500)
                ->get();
            $publishedSongIds = $publishedSongs->map(fn (Song $song): string => (string) $song->getKey())->values()->all();
            $fullAudioBySong = $publishedSongIds === [] ? collect() : SongAudioFile::query()
                ->whereIn('song_id', $publishedSongIds)
                ->where('status', 'active')
                ->where('file_type', 'full')
                ->get()
                ->keyBy(fn (SongAudioFile $audio): string => (string) $audio->song_id);

            $singleCandidates = $publishedSongs
                ->sortByDesc(fn (Song $song): int => (int) ($song->release_date?->getTimestamp() ?? $song->created_at?->getTimestamp() ?? 0))
                ->take(50)
                ->values();

            $dayStart = now(config('app.timezone', 'Asia/Ho_Chi_Minh'))->startOfDay();
            $playCounts = $publishedSongIds === [] ? collect() : SongPlayEvent::query()
                ->whereIn('song_id', $publishedSongIds)
                ->where('started_at', '>=', $dayStart)
                ->get(['song_id'])
                ->groupBy(fn (SongPlayEvent $event): string => (string) $event->song_id)
                ->map(fn (Collection $events): int => $events->count());
            $popularCandidates = $publishedSongs
                ->sort(function (Song $left, Song $right) use ($playCounts, $dateKey): int {
                    $leftCount = (int) $playCounts->get((string) $left->getKey(), 0);
                    $rightCount = (int) $playCounts->get((string) $right->getKey(), 0);
                    $countOrder = $rightCount <=> $leftCount;

                    if ($countOrder !== 0) {
                        return $countOrder;
                    }

                    return strcmp(
                        hash('sha256', $dateKey.'|popular|'.(string) $left->getKey()),
                        hash('sha256', $dateKey.'|popular|'.(string) $right->getKey()),
                    );
                })
                ->take(50)
                ->values();
            $discoverySongs = $singleCandidates->concat($popularCandidates)->unique(fn (Song $song): string => (string) $song->getKey())->values();
            $artistCredits = $this->songArtistsForCollection($discoverySongs);
            $songData = fn (Song $song): array => $this->compactSongData(
                $song,
                $fullAudioBySong->get((string) $song->getKey()),
                $artistCredits[(string) $song->getKey()] ?? [],
            );

            return [
                'data' => [
                    'single_new_releases' => $this->dailySongOrder($singleCandidates, $dateKey.'|single')
                        ->take(15)
                        ->map($songData)
                        ->values()
                        ->all(),
                    'popular_songs' => $this->dailySongOrder($popularCandidates, $dateKey.'|popular')
                        ->take(15)
                        ->map($songData)
                        ->values()
                        ->all(),
                ],
                'meta' => [
                    'date' => $dateKey,
                    'refresh_minutes' => 1,
                ],
            ];
        });

        return response()->json($payload);
    }

    /**
     * Return all data needed by the Home page in one request.
     *
     * The individual catalog endpoints remain available for their gallery pages,
     * but combining them here prevents the local PHP server from serialising six
     * independent browser requests during the initial Home render.
     */
    public function homeBootstrap(): JsonResponse
    {
        $dateKey = now(config('app.timezone', 'Asia/Ho_Chi_Minh'))->toDateString();
        $revision = $this->catalogContentRevision();
        $payload = Cache::store('file')->remember('api:home-bootstrap:v14:'.$dateKey.':'.$revision, now()->addMinute(), function () use ($dateKey): array {
            $banners = $this->responsePayload($this->banners(Request::create('/api/v1/banners', 'GET', [
                'daily' => 1,
                'limit' => 5,
            ])));
            $charts = $this->responsePayload($this->charts());
            $topics = $this->responsePayload($this->topics(Request::create('/api/v1/topics', 'GET', [
                'per_page' => 12,
            ])));
            $genres = $this->responsePayload($this->genres(Request::create('/api/v1/genres', 'GET', [
                'per_page' => 12,
            ])));
            $albums = $this->responsePayload($this->albums(Request::create('/api/v1/albums', 'GET', [
                'per_page' => 12,
            ])));
            $playlists = $this->responsePayload($this->playlists(Request::create('/api/v1/playlists', 'GET', [
                'per_page' => 12,
            ])));
            $discovery = $this->responsePayload($this->homeDiscovery());

            return [
                'data' => [
                    'banners' => data_get($banners, 'data', []),
                    'charts' => data_get($charts, 'data', []),
                    'topics' => data_get($topics, 'data', []),
                    'genres' => data_get($genres, 'data', []),
                    'albums' => data_get($albums, 'data', []),
                    'playlists' => data_get($playlists, 'data', []),
                    'discovery' => data_get($discovery, 'data', [
                        'single_new_releases' => [],
                        'popular_songs' => [],
                    ]),
                    'trending_artists' => $this->trendingArtistsForHome(),
                ],
                'meta' => [
                    'date' => $dateKey,
                    'refresh_minutes' => 1,
                ],
            ];
        });

        return response()->json($payload);
    }

    /**
     * Rank artists with both plays and profile visits in the last seven days.
     *
     * @return array<int, array<string, mixed>>
     */
    private function trendingArtistsForHome(int $limit = 4): array
    {
        $artists = Artist::query()
            ->where('status', 'active')
            ->orderBy('sort_order')
            ->orderByDesc('created_at')
            ->get();

        if ($artists->isEmpty()) {
            return [];
        }

        $artistById = $artists->keyBy(fn (Artist $artist): string => (string) $artist->getKey());
        $artistByName = $artists->keyBy(fn (Artist $artist): string => mb_strtolower(trim((string) $artist->name)));
        $weekEnd = now(config('app.timezone', 'Asia/Ho_Chi_Minh'));
        $weekStart = $weekEnd->copy()->subDays(7);
        $dateRange = [
            '$gte' => new UTCDateTime($weekStart->getTimestampMs()),
            '$lte' => new UTCDateTime($weekEnd->getTimestampMs()),
        ];
        $weeklyViewRows = ArtistViewEvent::query()->raw(
            fn ($collection) => $collection->aggregate([
                ['$match' => ['viewed_at' => $dateRange]],
                ['$group' => ['_id' => '$artist_id', 'views' => ['$sum' => 1]]],
            ], ['typeMap' => ['root' => 'array', 'document' => 'array', 'array' => 'array']])->toArray(),
        );
        $weeklyArtistViews = collect($weeklyViewRows)->mapWithKeys(
            fn ($row): array => [(string) data_get($row, '_id', '') => (int) data_get($row, 'views', 0)],
        );
        $weeklyPlayRows = SongPlayEvent::query()->raw(
            fn ($collection) => $collection->aggregate([
                ['$match' => ['started_at' => $dateRange]],
                ['$group' => ['_id' => '$song_id', 'plays' => ['$sum' => 1]]],
            ], ['typeMap' => ['root' => 'array', 'document' => 'array', 'array' => 'array']])->toArray(),
        );
        $weeklySongPlays = collect($weeklyPlayRows)->mapWithKeys(function ($row): array {
            return [(string) data_get($row, '_id', '') => (int) data_get($row, 'plays', 0)];
        });
        $songIds = $weeklySongPlays->keys()->filter()->values()->all();
        $songs = $songIds === []
            ? collect()
            : Song::query()
                ->whereIn((new Song)->getKeyName(), $songIds)
                ->where('status', 'published')
                ->with(['createdByAdmin', 'createdByArtist'])
                ->get();
        $artistCredits = $this->songArtistsForCollection($songs);
        $weeklyArtistPlays = [];
        $songsByArtist = [];

        foreach ($songs as $song) {
            $songId = (string) $song->getKey();
            $songPlays = (int) $weeklySongPlays->get($songId, 0);
            $artistIds = collect($artistCredits[$songId] ?? [])
                ->pluck('id')
                ->map(fn ($artistId): string => (string) $artistId)
                ->filter(fn (string $artistId): bool => $artistById->has($artistId))
                ->values();

            if ($artistIds->isEmpty()) {
                // Legacy/manual songs may not have pivot credits. Only resolve an exact
                // single-name match; never infer multiple artists from a display string
                // or treat the uploader as a performer.
                $artistName = mb_strtolower(trim((string) ($song->artist_name ?? '')));
                $artist = $artistName !== '' ? $artistByName->get($artistName) : null;
                if ($artist) {
                    $artistIds->push((string) $artist->getKey());
                }
            }

            foreach ($artistIds->unique()->all() as $artistId) {
                $weeklyArtistPlays[$artistId] = ($weeklyArtistPlays[$artistId] ?? 0) + $songPlays;
                $songsByArtist[$artistId][] = ['song' => $song, 'weekly_plays' => $songPlays];
            }
        }

        $rankedArtists = $artists
            ->filter(fn (Artist $artist): bool => ($weeklyArtistPlays[(string) $artist->getKey()] ?? 0) > 0
                && $weeklyArtistViews->get((string) $artist->getKey(), 0) > 0)
            ->sort(function (Artist $left, Artist $right) use ($weeklyArtistPlays, $weeklyArtistViews): int {
                $leftScore = ($weeklyArtistPlays[(string) $left->getKey()] ?? 0) + $weeklyArtistViews->get((string) $left->getKey(), 0);
                $rightScore = ($weeklyArtistPlays[(string) $right->getKey()] ?? 0) + $weeklyArtistViews->get((string) $right->getKey(), 0);
                if ($leftScore !== $rightScore) {
                    return $rightScore <=> $leftScore;
                }
                $playOrder = ($weeklyArtistPlays[(string) $right->getKey()] ?? 0) <=> ($weeklyArtistPlays[(string) $left->getKey()] ?? 0);
                if ($playOrder !== 0) {
                    return $playOrder;
                }

                $sortOrder = ((int) ($left->sort_order ?? 0)) <=> ((int) ($right->sort_order ?? 0));

                return $sortOrder !== 0 ? $sortOrder : strcmp(mb_strtolower((string) $left->name), mb_strtolower((string) $right->name));
            })
            ->values();
        $catalogFallback = $rankedArtists->isEmpty();
        $fallbackFollowerCounts = collect();
        if ($catalogFallback) {
            // New installations have no seven-day listening/profile events yet.
            // Show real catalog artists with published, correctly credited songs
            // until weekly activity exists; never manufacture sample records.
            $catalogSongs = Song::query()
                ->where('status', 'published')
                ->orderByDesc('release_date')
                ->orderByDesc('created_at')
                ->limit(500)
                ->with(['createdByAdmin', 'createdByArtist'])
                ->get();
            $artistCredits = $this->songArtistsForCollection($catalogSongs);
            $songsByArtist = [];

            foreach ($catalogSongs as $song) {
                $songId = (string) $song->getKey();
                $artistIds = collect($artistCredits[$songId] ?? [])
                    ->pluck('id')
                    ->map(fn ($artistId): string => (string) $artistId)
                    ->filter(fn (string $artistId): bool => $artistById->has($artistId))
                    ->values();

                if ($artistIds->isEmpty()) {
                    $artistName = mb_strtolower(trim((string) ($song->artist_name ?? '')));
                    $artist = $artistName !== '' ? $artistByName->get($artistName) : null;
                    if ($artist) {
                        $artistIds->push((string) $artist->getKey());
                    }
                }

                foreach ($artistIds->unique()->all() as $artistId) {
                    $songsByArtist[$artistId][] = ['song' => $song, 'weekly_plays' => (int) $weeklySongPlays->get($songId, 0)];
                }
            }

            $candidateArtistIds = array_keys($songsByArtist);
            $fallbackFollowerRows = $candidateArtistIds === [] ? [] : ArtistFollower::query()->raw(
                fn ($collection) => $collection->aggregate([
                    ['$match' => ['artist_id' => ['$in' => $candidateArtistIds]]],
                    ['$group' => ['_id' => '$artist_id', 'count' => ['$sum' => 1]]],
                ], ['typeMap' => ['root' => 'array', 'document' => 'array', 'array' => 'array']])->toArray(),
            );
            $fallbackFollowerCounts = collect($fallbackFollowerRows)->mapWithKeys(
                fn ($row): array => [(string) data_get($row, '_id', '') => (int) data_get($row, 'count', 0)],
            );
            $rankedArtists = $artists
                ->filter(fn (Artist $artist): bool => isset($songsByArtist[(string) $artist->getKey()]))
                ->sort(function (Artist $left, Artist $right) use ($weeklyArtistPlays, $weeklyArtistViews, $fallbackFollowerCounts): int {
                    $leftId = (string) $left->getKey();
                    $rightId = (string) $right->getKey();
                    $leftActivity = ($weeklyArtistPlays[$leftId] ?? 0) + $weeklyArtistViews->get($leftId, 0);
                    $rightActivity = ($weeklyArtistPlays[$rightId] ?? 0) + $weeklyArtistViews->get($rightId, 0);
                    if ($leftActivity !== $rightActivity) {
                        return $rightActivity <=> $leftActivity;
                    }

                    $followerOrder = $fallbackFollowerCounts->get($rightId, 0) <=> $fallbackFollowerCounts->get($leftId, 0);

                    return $followerOrder !== 0 ? $followerOrder : ((int) ($left->sort_order ?? 0) <=> (int) ($right->sort_order ?? 0));
                })
                ->values();
        }
        $limit = min(max($limit, 1), 50);

        // Collaborations can rank for multiple artists, but show each featured song
        // only once. Later artists receive their next-best distinct song when available.
        $usedFeaturedSongIds = [];
        $topSongs = [];
        foreach ($rankedArtists as $artist) {
            if (count($topSongs) >= $limit) {
                break;
            }
            $artistId = (string) $artist->getKey();
            $candidates = $songsByArtist[$artistId] ?? [];
            usort($candidates, function (array $left, array $right) use ($catalogFallback): int {
                $playOrder = $right['weekly_plays'] <=> $left['weekly_plays'];
                if ($playOrder !== 0) {
                    return $playOrder;
                }
                if ($catalogFallback) {
                    $leftDate = (int) ($left['song']->release_date?->getTimestamp() ?? $left['song']->created_at?->getTimestamp() ?? 0);
                    $rightDate = (int) ($right['song']->release_date?->getTimestamp() ?? $right['song']->created_at?->getTimestamp() ?? 0);
                    if ($leftDate !== $rightDate) {
                        return $rightDate <=> $leftDate;
                    }
                }

                $titleOrder = strcmp((string) $left['song']->title, (string) $right['song']->title);

                return $titleOrder !== 0
                    ? $titleOrder
                    : strcmp((string) $left['song']->getKey(), (string) $right['song']->getKey());
            });

            foreach ($candidates as $candidate) {
                /** @var Song $song */
                $song = $candidate['song'];
                $songId = (string) $song->getKey();
                if (isset($usedFeaturedSongIds[$songId])) {
                    continue;
                }

                $usedFeaturedSongIds[$songId] = true;
                $topSongs[$artistId] = [
                    'id' => $songId,
                    'slug' => $song->slug,
                    'title' => $song->title,
                    'cover_url' => $song->cover_url,
                    'publisher' => $song->createdByAdmin?->name ?: $song->createdByArtist?->name ?: 'Melodify',
                    'artist' => $artistCredits[$songId][0] ?? null,
                    'artists' => $artistCredits[$songId] ?? [],
                    'weekly_plays' => (int) $candidate['weekly_plays'],
                ];
                break;
            }
        }

        $rankedArtists = $rankedArtists
            ->filter(fn (Artist $artist): bool => isset($topSongs[(string) $artist->getKey()]))
            ->values();
        $rankedArtistIds = $rankedArtists->map(fn (Artist $artist): string => (string) $artist->getKey())->values()->all();
        $followerRows = $catalogFallback || $rankedArtistIds === [] ? [] : ArtistFollower::query()->raw(
            fn ($collection) => $collection->aggregate([
                ['$match' => ['artist_id' => ['$in' => $rankedArtistIds]]],
                ['$group' => ['_id' => '$artist_id', 'count' => ['$sum' => 1]]],
            ], ['typeMap' => ['root' => 'array', 'document' => 'array', 'array' => 'array']])->toArray(),
        );
        $followerCounts = $catalogFallback ? $fallbackFollowerCounts : collect($followerRows)->mapWithKeys(function ($row): array {
            return [
                (string) data_get($row, '_id', '') => (int) data_get($row, 'count', 0),
            ];
        });

        return $rankedArtists
            ->map(function (Artist $artist) use ($weeklyArtistPlays, $weeklyArtistViews, $topSongs, $followerCounts, $catalogFallback): array {
                $artistId = (string) $artist->getKey();

                return $this->artistData($artist) + [
                    'followers_count' => (int) $followerCounts->get($artistId, 0),
                    'weekly_plays' => (int) ($weeklyArtistPlays[$artistId] ?? 0),
                    'weekly_views' => (int) $weeklyArtistViews->get($artistId, 0),
                    'trending_score' => (int) ($weeklyArtistPlays[$artistId] ?? 0) + (int) $weeklyArtistViews->get($artistId, 0),
                    'ranking_source' => $catalogFallback ? 'catalog' : 'weekly',
                    'featured_song' => $topSongs[$artistId],
                ];
            })
            ->values()
            ->all();
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
        SongPlayEvent::query()->create([
            'user_id' => $request->user()?->getKey() ? (string) $request->user()->getKey() : null,
            'song_id' => $songId,
            'visitor_id' => $visitorId,
            'source' => $data['source'] ?? 'web',
            'started_at' => now(),
            'completed' => false,
        ]);

        $viewDateKey = now(config('app.timezone', 'Asia/Ho_Chi_Minh'))->toDateString();
        $revision = $this->catalogContentRevision();
        Cache::store('file')->forget('api:home-discovery:v2:'.$viewDateKey.':'.$revision);
        Cache::store('file')->forget('api:home-bootstrap:v14:'.$viewDateKey.':'.$revision);
        Cache::store('file')->forget('api:trending-artists:v8:'.$viewDateKey.':'.$revision);
        Cache::store('file')->forget('api:charts:v2:full:'.$viewDateKey.':'.$revision);

        return response()->json([
            'recorded' => true,
            'views' => $this->songViewCount($song),
        ]);
    }

    public function toggleSongFavorite(string $slug, Request $request): JsonResponse
    {
        $song = $this->localSongById($slug);

        abort_unless($song, 404, 'Bài hát chưa được lưu trong kho nhạc.');

        $data = $request->validate([
            'visitor_id' => ['nullable', 'string', 'max:120'],
            'favorited' => ['sometimes', 'boolean'],
        ]);
        $actorId = $this->engagementActorId($request, $data['visitor_id'] ?? null);
        $favorite = Favorite::query()
            ->where('user_id', $actorId)
            ->where('song_id', (string) $song->getKey())
            ->first();

        if (array_key_exists('favorited', $data)) {
            $favorited = (bool) $data['favorited'];
            if ($favorited && ! $favorite) {
                Favorite::query()->create([
                    'user_id' => $actorId,
                    'song_id' => (string) $song->getKey(),
                ]);
            } elseif (! $favorited && $favorite) {
                $favorite->delete();
            }
        } elseif ($favorite) {
            $favorite->delete();
            $favorited = false;
        } else {
            Favorite::query()->create([
                'user_id' => $actorId,
                'song_id' => (string) $song->getKey(),
            ]);
            $favorited = true;
        }

        $this->forgetSongDetailCache($song, $slug);

        return response()->json([
            'favorited' => $favorited,
            'favorites' => $this->songFavoriteCount($song),
        ]);
    }

    public function reorderFavoriteSongs(Request $request): JsonResponse
    {
        $data = $request->validate([
            'visitor_id' => ['nullable', 'string', 'max:120'],
            'song_ids' => ['required', 'array', 'max:500'],
            'song_ids.*' => ['required', 'string', 'distinct', 'max:120'],
        ]);
        $actorId = $this->engagementActorId($request, $data['visitor_id'] ?? null);
        $requestedIds = collect($data['song_ids'])->map(fn ($songId): string => (string) $songId)->values();
        $existingIds = Favorite::query()
            ->where('user_id', $actorId)
            ->get(['song_id'])
            ->map(fn (Favorite $favorite): string => (string) $favorite->song_id)
            ->filter()
            ->unique()
            ->values();

        if ($requestedIds->count() !== $existingIds->count()
            || $requestedIds->sort()->values()->all() !== $existingIds->sort()->values()->all()) {
            abort(422, 'Danh sách bài hát yêu thích đã thay đổi. Hãy tải lại trang rồi thử lại.');
        }

        foreach ($requestedIds as $position => $songId) {
            Favorite::query()
                ->where('user_id', $actorId)
                ->where('song_id', $songId)
                ->update(['sort_order' => $position]);
        }

        return response()->json(['ordered' => true]);
    }

    public function favoriteSongs(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'visitor_id' => ['nullable', 'string', 'max:120'],
        ]);
        $actorId = $this->engagementActorId($request, $filters['visitor_id'] ?? null);
        $favorites = Favorite::query()
            ->where('user_id', $actorId)
            ->get(['song_id', 'sort_order', 'created_at']);
        $hasCustomOrder = $favorites->contains(fn (Favorite $favorite): bool => $favorite->getAttribute('sort_order') !== null);
        if ($hasCustomOrder) {
            $unrankedFavorites = $favorites
                ->filter(fn (Favorite $favorite): bool => $favorite->getAttribute('sort_order') === null)
                ->sortByDesc('created_at');
            $rankedFavorites = $favorites
                ->filter(fn (Favorite $favorite): bool => $favorite->getAttribute('sort_order') !== null)
                ->sortBy(fn (Favorite $favorite): int => (int) $favorite->getAttribute('sort_order'));
            $favorites = $unrankedFavorites->concat($rankedFavorites);
        } else {
            $favorites = $favorites->sortByDesc('created_at');
        }
        $songIds = $favorites
            ->pluck('song_id')
            ->map(fn ($songId): string => (string) $songId)
            ->filter()
            ->unique()
            ->values();

        if ($songIds->isEmpty()) {
            return response()->json(['data' => [], 'meta' => ['total' => 0]]);
        }

        $songsById = Song::query()
            ->whereIn((new Song)->getKeyName(), $songIds->all())
            ->get()
            ->keyBy(fn (Song $song): string => (string) $song->getKey());
        $orderedSongs = $songIds
            ->map(fn (string $songId): ?Song => $songsById->get($songId))
            ->filter()
            ->values();
        if ($orderedSongs->isEmpty()) {
            return response()->json(['data' => [], 'meta' => ['total' => 0]]);
        }

        $favoriteCounts = Favorite::query()
            ->whereIn('song_id', $orderedSongs->map(fn (Song $song): string => (string) $song->getKey())->all())
            ->get(['song_id'])
            ->groupBy(fn (Favorite $favorite): string => (string) $favorite->song_id)
            ->map(fn (Collection $favorites): int => $favorites->count());
        $data = collect($this->localSongsData($orderedSongs))
            ->map(function (array $song) use ($favoriteCounts): array {
                $song['is_favorite'] = true;
                $song['favorite_count'] = (int) $favoriteCounts->get((string) $song['id'], 0);

                return $song;
            })
            ->values();

        return response()->json([
            'data' => $data,
            'meta' => ['total' => $data->count()],
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

        $this->forgetSongDetailCache($song, $slug);

        return response()->json([
            'recorded' => true,
            'shares' => $this->songShareCount($song),
        ]);
    }

    public function song(string $slug, Request $request): JsonResponse
    {
        $filters = $request->validate([
            'visitor_id' => ['nullable', 'string', 'max:120'],
        ]);
        $cacheKey = 'api:song:v4:'.$this->catalogContentRevision().':'.sha1($slug);
        try {
            $payload = Cache::store('file')->remember($cacheKey, now()->addMinutes(5), function () use ($slug): array {
                $localSong = $this->localSongById($slug);

                if ($localSong) {
                    return [
                        'data' => $this->localSongData($localSong, true),
                        '_local_song_id' => (string) $localSong->getKey(),
                    ];
                }

                abort_unless(preg_match('/^[A-Za-z0-9]+$/', $slug), 404);
                $track = $this->nhaccuatui->getSong($slug);

                return ['data' => $this->nctTrackData($track), '_local_song_id' => null];
            });

            $localSongId = (string) ($payload['_local_song_id'] ?? '');
            unset($payload['_local_song_id']);

            if ($localSongId !== '') {
                $actorId = $this->engagementActorId($request, $filters['visitor_id'] ?? null);
                $payload['data']['is_favorite'] = Favorite::query()
                    ->where('song_id', $localSongId)
                    ->where('user_id', $actorId)
                    ->exists();
            }

            return response()->json($payload);
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
            abort_unless(preg_match('/^[A-Za-z0-9]+$/', $slug), 404);
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
        $cacheKey = 'api:catalog:'.sha1(json_encode([
            'content_revision' => $this->catalogContentRevision(),
            'model' => $model,
            'statuses' => $statuses,
            'query' => $request->query(),
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

        $payload = Cache::store('file')->remember($cacheKey, now()->addMinutes(5), function () use ($request, $model, $statuses, $transform, $searchField, $scope): array {
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
            $pageItems = collect($items->items());
            $topicCounts = [];
            $genreCounts = [];
            $albumArtists = null;
            $albumCounts = null;

            if ($model === Topic::class) {
                $topicIds = $pageItems->map(fn (Topic $topic): string => (string) $topic->getKey())->all();
                $topicCounts = TopicSong::query()
                    ->whereIn('topic_id', $topicIds)
                    ->get()
                    ->groupBy(fn (TopicSong $link): string => (string) $link->topic_id)
                    ->map(fn (Collection $links): int => $links->count())
                    ->all();
            }

            if ($model === Genre::class) {
                $genreIds = $pageItems->map(fn (Genre $genre): string => (string) $genre->getKey())->all();
                $genreCounts = SongGenre::query()
                    ->whereIn('genre_id', $genreIds)
                    ->get()
                    ->groupBy(fn (SongGenre $link): string => (string) $link->genre_id)
                    ->map(fn (Collection $links): int => $links->count())
                    ->all();
            }

            if ($model === Album::class) {
                $albumIds = $pageItems->map(fn (Album $album): string => (string) $album->getKey())->all();
                $artistIds = $pageItems->pluck('artist_id')->filter()->map(fn ($id): string => (string) $id)->unique()->values()->all();
                $albumArtists = Artist::query()
                    ->whereIn((new Artist)->getKeyName(), $artistIds)
                    ->get()
                    ->keyBy(fn (Artist $artist): string => (string) $artist->getKey())
                    ->all();
                $albumCounts = Song::query()
                    ->whereIn('album_id', $albumIds)
                    ->get()
                    ->groupBy(fn (Song $song): string => (string) $song->album_id)
                    ->map(fn (Collection $songs): int => $songs->count())
                    ->all();
            }

            $data = $pageItems->map(function ($item) use ($model, $transform, $topicCounts, $genreCounts, $albumArtists, $albumCounts): array {
                if ($model === Topic::class) {
                    return $this->topicData($item, false, $topicCounts);
                }

                if ($model === Genre::class) {
                    return $this->genreData($item, false, $genreCounts);
                }

                if ($model === Album::class) {
                    return $this->albumData($item, false, $albumArtists, $albumCounts);
                }

                return $transform($item);
            })->values()->all();

            return [
                'data' => $data,
                'meta' => [
                    'current_page' => $items->currentPage(),
                    'last_page' => $items->lastPage(),
                    'per_page' => $items->perPage(),
                    'total' => $items->total(),
                ],
            ];
        });

        return response()->json($payload);
    }

    private function responsePayload(JsonResponse $response): array
    {
        $payload = json_decode($response->getContent(), true);

        return is_array($payload) ? $payload : [];
    }

    private function show(string $model, string $slug, array $statuses, callable $transform, ?Closure $scope = null): JsonResponse
    {
        $cacheKey = 'api:show:'.sha1(json_encode([
            'serializer_version' => 4,
            'content_revision' => $this->catalogContentRevision(),
            'model' => $model,
            'slug' => $slug,
            'statuses' => $statuses,
            'query' => array_diff_key(request()->query(), ['visitor_id' => true]),
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        $payload = Cache::store('file')->remember($cacheKey, now()->addMinutes(5), function () use ($model, $slug, $statuses, $transform, $scope): array {
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

            return ['data' => $transform($item)];
        });

        return response()->json($payload);
    }

    private function topicData(Topic $topic, bool $includeSongs = false, ?array $songCounts = null): array
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
            'song_count' => $songCounts !== null
                ? (int) ($songCounts[(string) $topic->getKey()] ?? 0)
                : TopicSong::query()->where('topic_id', (string) $topic->getKey())->count(),
        ];

        if ($includeSongs) {
            $data['songs'] = $this->songsForTopic($topic);
        }

        return $data;
    }

    private function genreData(Genre $genre, bool $includeSongs = false, ?array $songCounts = null): array
    {
        $data = [
            'id' => (string) $genre->getKey(),
            'name' => $genre->name,
            'slug' => $genre->slug,
            'description' => $genre->description,
            'image_url' => $genre->image_url,
            'sort_order' => (int) ($genre->sort_order ?? 0),
            'status' => $genre->status,
            'song_count' => $songCounts !== null
                ? (int) ($songCounts[(string) $genre->getKey()] ?? 0)
                : $genre->songs()->count(),
        ];

        if ($includeSongs) {
            $data['songs'] = Song::query()
                ->whereIn('status', ['published', 'draft'])
                ->whereIn('_id', $genre->songs()->pluck('song_id')->all())
                ->orderBy('title')
                ->get()
                ->pipe(fn (Collection $songs): array => $this->localSongsData($songs));
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

    private function albumData(Album $album, bool $includeSongs = false, ?array $artistById = null, ?array $songCounts = null): array
    {
        $artist = $artistById !== null
            ? ($artistById[(string) $album->artist_id] ?? null)
            : $album->artist;

        $data = [
            'id' => (string) $album->getKey(),
            'title' => $album->title,
            'slug' => $album->slug,
            'artist_id' => $album->artist_id ? (string) $album->artist_id : null,
            'artist' => $artist ? $this->artistData($artist) : null,
            'release_date' => $album->release_date?->toDateString(),
            'cover_url' => $album->cover_url,
            'status' => $album->status,
            'song_count' => $songCounts !== null
                ? (int) ($songCounts[(string) $album->getKey()] ?? 0)
                : Song::query()->where('album_id', (string) $album->getKey())->count(),
        ];

        if ($includeSongs) {
            $data['songs'] = Song::query()
                ->where('album_id', (string) $album->getKey())
                ->whereIn('status', ['published', 'draft'])
                ->orderBy('title')
                ->get()
                ->pipe(fn (Collection $songs): array => $this->localSongsData($songs));
        }

        return $data;
    }

    private function artistData(Artist $artist, bool $includeFeaturedSongs = false, bool $includeAlbums = false): array
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

        if (! $includeFeaturedSongs && ! $includeAlbums) {
            return $data;
        }

        if ($includeAlbums || $includeFeaturedSongs) {
            $artistAlbums = Album::query()
                ->where('status', 'published')
                ->where(function ($query) use ($artistId): void {
                    $query
                        ->where('artist_id', $artistId)
                        ->orWhere('artist_ids', $artistId);
                })
                ->get();
            $artistAlbumIds = $artistAlbums->map(fn (Album $album): string => (string) $album->getKey())->all();
            $albumArtistIds = $artistAlbums->pluck('artist_id')->map(fn ($id): string => (string) $id)->filter()->unique()->values()->all();
            $albumArtists = $albumArtistIds === [] ? collect() : Artist::query()
                ->whereIn((new Artist)->getKeyName(), $albumArtistIds)
                ->get()
                ->keyBy(fn (Artist $albumArtist): string => (string) $albumArtist->getKey());
            $albumSongCounts = $artistAlbumIds === [] ? collect() : Song::query()
                ->whereIn('album_id', $artistAlbumIds)
                ->get(['album_id'])
                ->groupBy(fn (Song $albumSong): string => (string) $albumSong->album_id)
                ->map(fn (Collection $albumSongs): int => $albumSongs->count());
            $data['albums'] = $artistAlbums
                ->map(fn (Album $album): array => $this->albumData($album, false, $albumArtists->all(), $albumSongCounts->all()))
                ->values()
                ->all();
        }

        if (! $includeFeaturedSongs) {
            return $data;
        }

        $linkedSongIds = SongArtist::query()
            ->where('artist_id', $artistId)
            ->pluck('song_id')
            ->map(fn ($id): string => (string) $id)
            ->values()
            ->all();
        $candidateSongs = Song::query()
            ->whereIn('status', ['published', 'draft'])
            ->where(function ($query) use ($artistId, $linkedSongIds): void {
                $query->where('created_by_artist_id', $artistId);

                if ($linkedSongIds !== []) {
                    $query->orWhereIn((new Song)->getKeyName(), $linkedSongIds);
                }
            })
            ->orderBy('title')
            ->get();
        $artistCreditsBySong = $this->songArtistsForCollection($candidateSongs);
        $artistSongs = $candidateSongs
            ->filter(function (Song $song) use ($artistId, $linkedSongIds, $artistCreditsBySong): bool {
                $songId = (string) $song->getKey();
                $isCreatedByArtist = (string) ($song->created_by_artist_id ?? '') === $artistId;
                $hasMatchingCredit = in_array($songId, $linkedSongIds, true)
                    && collect($artistCreditsBySong[$songId] ?? [])->contains('id', $artistId);

                return $isCreatedByArtist || $hasMatchingCredit;
            })
            ->values();
        $songIds = $artistSongs->map(fn (Song $song): string => (string) $song->getKey())->all();
        $songs = $this->localSongsData($artistSongs, $artistCreditsBySong);

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

        $playlistIdsFromSongs = $songIds === []
            ? []
            : PlaylistSong::query()
                ->whereIn('song_id', $songIds)
                ->pluck('playlist_id')
                ->map(fn ($id): string => (string) $id)
                ->unique()
                ->values()
                ->all();

        $artistPlaylistsQuery = Playlist::query()
            ->where('status', 'active')
            ->whereIn('visibility', ['public', 'unlisted'])
            ->where(function ($query) use ($artistId, $playlistIdsFromSongs): void {
                $query->where('artist_ids', $artistId);

                if ($playlistIdsFromSongs !== []) {
                    $query->orWhereIn((new Playlist)->getKeyName(), $playlistIdsFromSongs);
                }
            });
        $artistPlaylists = $artistPlaylistsQuery->get();
        $artistPlaylistIds = $artistPlaylists->map(fn (Playlist $playlist): string => (string) $playlist->getKey())->all();
        $playlistSongCounts = $artistPlaylistIds === [] ? collect() : PlaylistSong::query()
            ->whereIn('playlist_id', $artistPlaylistIds)
            ->get(['playlist_id'])
            ->groupBy(fn (PlaylistSong $link): string => (string) $link->playlist_id)
            ->map(fn (Collection $links): int => $links->count());
        $playlistArtists = $this->playlistArtistsForCollection($artistPlaylists);
        $data['playlists'] = $artistPlaylists
            ->map(fn (Playlist $playlist): array => $this->playlistData(
                $playlist,
                false,
                $playlistArtists[(string) $playlist->getKey()] ?? [],
                (int) $playlistSongCounts->get((string) $playlist->getKey(), 0),
            ))
            ->all();

        $artistVideosQuery = SongVideo::query()
            ->where('status', 'active')
            ->where(function ($query) use ($artistId, $songIds): void {
                $query->where('artist_ids', $artistId);

                if ($songIds !== []) {
                    $query->orWhereIn('song_id', $songIds);
                }
            });
        $data['videos'] = $artistVideosQuery
            ->get()
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

    private function playlistData(Playlist $playlist, bool $includeSongs = false, ?array $resolvedArtists = null, ?int $songCount = null): array
    {
        $artists = $resolvedArtists ?? $this->playlistArtists($playlist);

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
            'song_count' => $songCount !== null
                ? $songCount
                : PlaylistSong::query()->where('playlist_id', (string) $playlist->getKey())->count(),
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
            $data['songs'] = $this->playlistSongsData($playlist);
        }

        return $data;
    }

    /** Build playlist track payloads with batched reads to avoid one query chain per song. */
    private function playlistSongsData(Playlist $playlist): array
    {
        $links = PlaylistSong::query()
            ->where('playlist_id', (string) $playlist->getKey())
            ->orderBy('position')
            ->get();
        $songIds = $links->pluck('song_id')->map(fn ($id): string => (string) $id)->filter()->unique()->values()->all();

        if ($songIds === []) {
            return [];
        }

        $songs = Song::query()
            ->whereIn((new Song)->getKeyName(), $songIds)
            ->get()
            ->keyBy(fn (Song $song): string => (string) $song->getKey());
        $songCollection = $songs->values();
        $songsById = collect($this->localSongsData($songCollection))->keyBy('id');

        return $links->map(fn (PlaylistSong $link): ?array => $songsById->get((string) $link->song_id))
            ->filter()
            ->values()
            ->all();
    }

    /** Build track payloads with batched relation reads instead of querying once per song. */
    private function localSongsData(Collection $songCollection, ?array $resolvedArtistsBySong = null): array
    {
        $songIds = $songCollection->map(fn (Song $song): string => (string) $song->getKey())->filter()->values()->all();
        if ($songIds === []) {
            return [];
        }

        $artistsBySong = $resolvedArtistsBySong ?? $this->songArtistsForCollection($songCollection);
        $audioBySong = SongAudioFile::query()
            ->whereIn('song_id', $songIds)
            ->where('status', 'active')
            ->where('file_type', 'full')
            ->get()
            ->keyBy(fn (SongAudioFile $audio): string => (string) $audio->song_id);

        $adminIds = $songCollection->pluck('created_by_admin_id')->map(fn ($id): string => (string) $id)->filter()->unique()->values()->all();
        $admins = $adminIds === [] ? collect() : Admin::query()
            ->whereIn((new Admin)->getKeyName(), $adminIds)
            ->get()
            ->keyBy(fn (Admin $admin): string => (string) $admin->getKey());
        $creatorArtistIds = $songCollection->pluck('created_by_artist_id')->map(fn ($id): string => (string) $id)->filter()->unique()->values()->all();
        $creatorArtists = $creatorArtistIds === [] ? collect() : Artist::query()
            ->whereIn((new Artist)->getKeyName(), $creatorArtistIds)
            ->get()
            ->keyBy(fn (Artist $artist): string => (string) $artist->getKey());
        $albumIds = $songCollection->pluck('album_id')->map(fn ($id): string => (string) $id)->filter()->unique()->values()->all();
        $albums = $albumIds === [] ? collect() : Album::query()
            ->whereIn((new Album)->getKeyName(), $albumIds)
            ->get()
            ->keyBy(fn (Album $album): string => (string) $album->getKey());

        return $songCollection->map(function (Song $song) use ($artistsBySong, $audioBySong, $admins, $creatorArtists, $albums): array {
            $songId = (string) $song->getKey();
            $artists = $artistsBySong[$songId] ?? [];
            $primaryArtist = $artists[0] ?? null;
            $audio = $audioBySong->get($songId);
            $audioUrl = $audio?->file_url;
            if ((bool) ($audio?->premium_only ?? false)
                || $audio?->source === 'nhaccuatui'
                || ($song->external_source === 'nhaccuatui' && ($audio === null || blank($audio->source)))) {
                $audioUrl = route('api.v1.songs.audio', ['slug' => $song->slug ?: $song->getKey()]);
            }
            $album = filled($song->album_id) ? $albums->get((string) $song->album_id) : null;
            $publisher = $admins->get((string) $song->created_by_admin_id)?->name
                ?: $creatorArtists->get((string) $song->created_by_artist_id)?->name
                ?: 'Melodify';

            return [
                'id' => $songId,
                'external_id' => $song->external_id,
                'title' => $song->title,
                'slug' => $song->slug,
                'artist' => ($song->artist_name || $primaryArtist) ? [
                    'id' => $primaryArtist['id'] ?? null,
                    'name' => $primaryArtist['name'] ?? $song->artist_name,
                ] : null,
                'artists' => $artists,
                'publisher' => $publisher,
                'release_date' => $song->release_date?->toDateString(),
                'premium_only' => (bool) ($audio?->premium_only ?? false),
                'has_full_audio' => $audio !== null,
                'album' => $album ? ['id' => (string) $album->getKey(), 'title' => $album->title] : null,
                'duration_seconds' => $song->duration_seconds !== null ? (int) $song->duration_seconds : null,
                'is_featured' => (int) ($song->is_featured ?? 0),
                'is_hot' => (int) ($song->is_hot ?? 0),
                'preview_limit_seconds' => (int) ($song->is_hot ?? 0) === 1 ? 30 : null,
                'cover_url' => $song->cover_url,
                'audio_url' => $audioUrl,
                'stream_url' => $audioUrl,
                'preview_url' => $song->preview_url,
                'video_url' => null,
                'videos' => [],
                'source_url' => $song->external_url ?: $song->itunes_url,
                'external_source' => $song->external_source,
                'country_code' => $song->country_code,
                'country' => filled($song->country_code) ? config('music.countries.'.$song->country_code, $song->country_code) : null,
                'status' => $song->status,
            ];
        })->values()->all();
    }

    /**
     * Resolve playlist artists with bulk queries for collection pages.
     * The old per-playlist resolver performed several queries for every item.
     */
    private function playlistArtistsForCollection(Collection $playlists): array
    {
        $playlistIds = $playlists
            ->map(fn (Playlist $playlist): string => (string) $playlist->getKey())
            ->filter()
            ->values()
            ->all();

        if ($playlistIds === []) {
            return [];
        }

        $playlistSongs = PlaylistSong::query()
            ->whereIn('playlist_id', $playlistIds)
            ->orderBy('position')
            ->get();
        $playlistSongsByPlaylist = $playlistSongs->groupBy(fn (PlaylistSong $link): string => (string) $link->playlist_id);
        $songIds = $playlistSongs->pluck('song_id')->map(fn ($id): string => (string) $id)->unique()->values()->all();
        $songsById = $songIds === []
            ? collect()
            : Song::query()
                ->whereIn((new Song)->getKeyName(), $songIds)
                ->get(['artist_name'])
                ->keyBy(fn (Song $song): string => (string) $song->getKey());
        $songArtistCreditsBySong = $songsById->isEmpty()
            ? []
            : $this->songArtistsForCollection($songsById->values());

        $artistIds = $playlists
            ->flatMap(fn (Playlist $playlist): array => array_map('strval', (array) ($playlist->artist_ids ?? [])))
            ->concat(collect($songArtistCreditsBySong)->flatMap(fn (array $credits): array => array_column($credits, 'id')))
            ->filter()
            ->unique()
            ->values()
            ->all();
        $artistsById = $artistIds === []
            ? collect()
            : Artist::query()
                ->whereIn((new Artist)->getKeyName(), $artistIds)
                ->get()
                ->keyBy(fn (Artist $artist): string => (string) $artist->getKey());

        $fallbackNames = $songsById
            ->filter(fn (Song $song): bool => ($songArtistCreditsBySong[(string) $song->getKey()] ?? []) === [])
            ->map(fn (Song $song): string => trim((string) ($song->artist_name ?? '')))
            ->filter()
            ->unique()
            ->values()
            ->all();
        $artistsByName = $fallbackNames === []
            ? collect()
            : Artist::query()->whereIn('name', $fallbackNames)->get()->keyBy(fn (Artist $artist): string => mb_strtolower(trim((string) $artist->name)));

        $resolvedByPlaylist = [];
        foreach ($playlists as $playlist) {
            $resolved = [];
            $seenIds = [];
            $seenNames = [];
            $appendArtist = function (?Artist $artist, ?string $fallbackName = null) use (&$resolved, &$seenIds, &$seenNames): void {
                $name = trim((string) ($artist?->name ?: $fallbackName));
                if ($name === '') {
                    return;
                }

                $id = $artist ? (string) $artist->getKey() : null;
                $nameKey = mb_strtolower($name);
                if (($id !== null && isset($seenIds[$id])) || isset($seenNames[$nameKey])) {
                    return;
                }

                if ($id !== null) {
                    $seenIds[$id] = true;
                }
                $seenNames[$nameKey] = true;
                $resolved[] = [
                    'id' => $id,
                    'name' => $name,
                    'slug' => $artist?->slug,
                    'avatar_url' => $artist?->avatar_url,
                ];
            };

            foreach ((array) ($playlist->artist_ids ?? []) as $artistId) {
                $normalizedId = trim((string) $artistId);
                if ($normalizedId !== '') {
                    $appendArtist($artistsById->get($normalizedId));
                }
            }

            foreach ($playlistSongsByPlaylist->get((string) $playlist->getKey(), collect()) as $playlistSong) {
                $songId = (string) $playlistSong->song_id;
                $songArtistCredits = $songArtistCreditsBySong[$songId] ?? [];
                foreach ($songArtistCredits as $artistCredit) {
                    $appendArtist($artistsById->get((string) $artistCredit['id']));
                }

                $song = $songsById->get($songId);
                if ($songArtistCredits === []) {
                    $artistName = trim((string) ($song?->artist_name ?? ''));
                    if ($artistName !== '') {
                        $appendArtist($artistsByName->get(mb_strtolower($artistName)), $artistName);
                    }
                }
            }

            $resolvedByPlaylist[(string) $playlist->getKey()] = $resolved;
        }

        return $resolvedByPlaylist;
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

            $songArtistCredits = $song
                ? ($this->songArtistsForCollection(collect([$song]))[$songId] ?? [])
                : [];
            foreach ($songArtistCredits as $artistCredit) {
                $normalizedId = trim((string) $artistCredit['id']);
                if ($normalizedId !== '' && ! isset($seenArtistIds[$normalizedId])) {
                    $artistIds[] = $normalizedId;
                    $seenArtistIds[$normalizedId] = true;
                }
            }

            if ($songArtistCredits === []) {
                $artistName = trim((string) ($song?->artist_name ?? ''));
                $normalizedName = mb_strtolower($artistName);
                if ($normalizedName !== '' && ! isset($seenArtistNames[$normalizedName])) {
                    $artistNames[] = $artistName;
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

    /**
     * Lightweight song payload for the home discovery rows.
     * Home cards do not need lyrics, videos, playlists, or engagement counts.
     */
    private function compactSongData(Song $song, ?SongAudioFile $audio, array $artists): array
    {
        if ($artists === []) {
            $artistName = trim((string) $song->artist_name);
            $artists = $artistName === '' ? [] : [[
                'id' => null,
                'name' => $artistName,
                'slug' => null,
                'avatar_url' => null,
            ]];
        }

        $primaryArtist = $artists[0] ?? null;
        $audioUrl = $audio?->file_url;
        if ((bool) ($audio?->premium_only ?? false)
            || $audio?->source === 'nhaccuatui'
            || ($song->external_source === 'nhaccuatui' && ($audio === null || blank($audio->source)))) {
            $audioUrl = route('api.v1.songs.audio', ['slug' => $song->slug ?: $song->getKey()]);
        }

        return [
            'id' => (string) $song->getKey(),
            'external_id' => $song->external_id,
            'title' => $song->title,
            'slug' => $song->slug,
            'artist' => ($song->artist_name || $primaryArtist) ? [
                'id' => $primaryArtist['id'] ?? null,
                'name' => $primaryArtist['name'] ?? $song->artist_name,
            ] : null,
            'artists' => $artists,
            'publisher' => 'Melodify',
            'release_date' => $song->release_date?->toDateString(),
            'premium_only' => (bool) ($audio?->premium_only ?? false),
            'has_full_audio' => $audio !== null,
            'duration_seconds' => $song->duration_seconds !== null
                ? (int) $song->duration_seconds
                : ($audio?->duration_seconds !== null ? (int) $audio->duration_seconds : null),
            'is_featured' => (int) ($song->is_featured ?? 0),
            'is_hot' => (int) ($song->is_hot ?? 0),
            'preview_limit_seconds' => (int) ($song->is_hot ?? 0) === 1 ? 30 : null,
            'cover_url' => $song->cover_url,
            'audio_url' => $audioUrl,
            'stream_url' => $audioUrl,
            'preview_url' => $song->preview_url,
            'source_url' => $song->external_url ?: $song->itunes_url,
            'external_source' => $song->external_source,
            'country_code' => $song->country_code,
            'country' => filled($song->country_code) ? config('music.countries.'.$song->country_code, $song->country_code) : null,
        ];
    }

    /**
     * Build the public chart feed from published songs and daily play events.
     * The same daily seed keeps ties stable for the whole day while the play
     * counters and trend arrows still reflect the current database state.
     */
    private function chartPayloads(string $dateKey): array
    {
        $songs = Song::query()
            ->where('status', 'published')
            ->orderByDesc('release_date')
            ->orderByDesc('created_at')
            ->limit(500)
            ->get();
        $songIds = $songs->map(fn (Song $song): string => (string) $song->getKey())->filter()->values()->all();
        $audioBySong = SongAudioFile::query()
            ->whereIn('song_id', $songIds)
            ->where('status', 'active')
            ->where('file_type', 'full')
            ->get()
            ->keyBy(fn (SongAudioFile $audio): string => (string) $audio->song_id);
        $artistCredits = $this->songArtistsForCollection($songs);
        $todayStart = now(config('app.timezone', 'Asia/Ho_Chi_Minh'))->startOfDay();
        $yesterdayStart = $todayStart->copy()->subDay();
        $todayStartUtc = new UTCDateTime($todayStart->getTimestamp() * 1000);
        $yesterdayStartUtc = new UTCDateTime($yesterdayStart->getTimestamp() * 1000);
        $playRows = $songIds === [] ? [] : SongPlayEvent::query()->raw(
            fn ($collection) => $collection->aggregate([
                ['$match' => [
                    'song_id' => ['$in' => $songIds],
                    'started_at' => ['$gte' => $yesterdayStartUtc],
                ]],
                ['$group' => [
                    '_id' => '$song_id',
                    'today' => ['$sum' => ['$cond' => [['$gte' => ['$started_at', $todayStartUtc]], 1, 0]]],
                    'yesterday' => ['$sum' => ['$cond' => [['$lt' => ['$started_at', $todayStartUtc]], 1, 0]]],
                ]],
            ], ['typeMap' => ['root' => 'array', 'document' => 'array', 'array' => 'array']])->toArray(),
        );
        $todayCounts = collect();
        $yesterdayCounts = collect();
        foreach ($playRows as $row) {
            $songId = (string) data_get($row, '_id', '');
            if ($songId === '') {
                continue;
            }

            $todayCounts->put($songId, (int) data_get($row, 'today', 0));
            $yesterdayCounts->put($songId, (int) data_get($row, 'yesterday', 0));
        }
        $favoriteCounts = Favorite::query()
            ->whereIn('song_id', $songIds)
            ->get(['song_id'])
            ->groupBy(fn (Favorite $favorite): string => (string) $favorite->song_id)
            ->map(fn (Collection $favorites): int => $favorites->count());
        $shareCounts = SongShare::query()
            ->whereIn('song_id', $songIds)
            ->get(['song_id'])
            ->groupBy(fn (SongShare $share): string => (string) $share->song_id)
            ->map(fn (Collection $shares): int => $shares->count());

        $charts = [];
        foreach ($this->chartDefinitions() as $definition) {
            $filtered = $songs->filter($definition['filter'])->values();
            if ($filtered->count() < 5) {
                $filtered = $filtered
                    ->concat($songs->reject(fn (Song $song): bool => $filtered->contains(fn (Song $item): bool => (string) $item->getKey() === (string) $song->getKey())))
                    ->unique(fn (Song $song): string => (string) $song->getKey())
                    ->values();
            }

            $ranked = $filtered
                ->sort(function (Song $left, Song $right) use ($todayCounts, $dateKey): int {
                    $countOrder = ((int) $todayCounts->get((string) $right->getKey(), 0)) <=> ((int) $todayCounts->get((string) $left->getKey(), 0));
                    if ($countOrder !== 0) {
                        return $countOrder;
                    }

                    return strcmp(
                        sha1($dateKey.'|'.(string) $left->getKey()),
                        sha1($dateKey.'|'.(string) $right->getKey()),
                    );
                })
                ->take(50)
                ->values();
            $chartSongs = $ranked->map(function (Song $song, int $index) use ($audioBySong, $artistCredits, $todayCounts, $yesterdayCounts, $favoriteCounts, $shareCounts): array {
                $data = $this->compactSongData($song, $audioBySong->get((string) $song->getKey()), $artistCredits[(string) $song->getKey()] ?? []);
                $today = (int) $todayCounts->get((string) $song->getKey(), 0);
                $yesterday = (int) $yesterdayCounts->get((string) $song->getKey(), 0);

                return array_merge($data, [
                    'rank' => $index + 1,
                    'trend' => $today > $yesterday ? 'up' : ($today < $yesterday ? 'down' : 'same'),
                    'views' => $today,
                    'favorites' => (int) $favoriteCounts->get((string) $song->getKey(), 0),
                    'shares' => (int) $shareCounts->get((string) $song->getKey(), 0),
                ]);
            })->values()->all();
            $firstSong = $chartSongs[0] ?? null;

            $charts[] = [
                'id' => $definition['slug'],
                'slug' => $definition['slug'],
                'title' => $definition['title'],
                'tone' => $definition['tone'],
                'description' => $definition['description'],
                'cover_url' => $firstSong['cover_url'] ?? '/topics/genre/vpop_600.png',
                'date' => $dateKey,
                'updated_at' => now(config('app.timezone', 'Asia/Ho_Chi_Minh'))->toISOString(),
                'song_count' => count($chartSongs),
                'songs' => $chartSongs,
            ];
        }

        return $charts;
    }

    private function cachedChartPayloads(string $dateKey): array
    {
        return Cache::store('file')->remember('api:charts:v2:full:'.$dateKey.':'.$this->catalogContentRevision(), now()->addMinute(), fn (): array => $this->chartPayloads($dateKey));
    }

    private function catalogContentRevision(): string
    {
        return (string) Cache::store('file')->get('api:catalog-content-revision:v1', 'initial');
    }

    private function chartDefinitions(): array
    {
        return [
            [
                'slug' => 'top-50-bai-hat-thinh-hanh',
                'title' => 'Top 50 Bài Hát Thịnh Hành',
                'tone' => 'rose',
                'description' => 'Những ca khúc được nghe nhiều nhất hôm nay trên Melodify.',
                'filter' => fn (Song $song): bool => true,
            ],
            [
                'slug' => 'top-50-nhac-viet',
                'title' => 'Top 50 Nhạc Việt',
                'tone' => 'olive',
                'description' => 'Bảng xếp hạng các ca khúc Việt Nam đang được yêu thích.',
                'filter' => fn (Song $song): bool => $this->isVietnameseSong($song),
            ],
            [
                'slug' => 'top-50-nhac-hoa',
                'title' => 'Top 50 Nhạc Hoa',
                'tone' => 'purple',
                'description' => 'Những ca khúc Hoa ngữ nổi bật trong ngày.',
                'filter' => fn (Song $song): bool => $this->isChineseSong($song),
            ],
            [
                'slug' => 'top-50-nhac-remix-viet',
                'title' => 'Top 50 Nhạc Remix Việt',
                'tone' => 'olive',
                'description' => 'Các bản remix Việt được nghe nhiều nhất hôm nay.',
                'filter' => fn (Song $song): bool => $this->isRemixSong($song) && $this->isVietnameseSong($song),
            ],
            [
                'slug' => 'top-50-youtube',
                'title' => 'Top 50 YouTube',
                'tone' => 'rose',
                'description' => 'Những bài hát có sức hút nổi bật trên các kênh video.',
                'filter' => fn (Song $song): bool => str_contains(mb_strtolower((string) ($song->external_source ?? '')), 'youtube') || str_contains(mb_strtolower((string) ($song->external_url ?? '')), 'youtu'),
            ],
            [
                'slug' => 'top-50-nhac-remix',
                'title' => 'Top 50 Nhạc Remix',
                'tone' => 'purple',
                'description' => 'Các ca khúc remix đang được nghe nhiều trên Melodify.',
                'filter' => fn (Song $song): bool => $this->isRemixSong($song),
            ],
        ];
    }

    private function isVietnameseSong(Song $song): bool
    {
        $country = strtoupper(trim((string) ($song->country_code ?? '')));
        $text = mb_strtolower((string) $song->title.' '.(string) $song->artist_name);

        return in_array($country, ['VN', 'VNM', 'VIETNAM'], true)
            || preg_match('/[ăâđêôơư]/u', $text) === 1;
    }

    private function isChineseSong(Song $song): bool
    {
        $country = strtoupper(trim((string) ($song->country_code ?? '')));
        $text = (string) $song->title.' '.(string) $song->artist_name;

        return in_array($country, ['CN', 'CHN', 'ZH', 'CHINA'], true)
            || preg_match('/\p{Han}/u', $text) === 1;
    }

    private function isRemixSong(Song $song): bool
    {
        return str_contains(mb_strtolower((string) $song->title.' '.(string) $song->artist_name), 'remix');
    }

    private function songArtistsForCollection(Collection $songs): array
    {
        $songIds = $songs->map(fn (Song $song): string => (string) $song->getKey())->filter()->values()->all();
        if ($songIds === []) {
            return [];
        }

        $links = SongArtist::query()->whereIn('song_id', $songIds)->get()
            ->sortBy(fn (SongArtist $link): int => match (mb_strtolower(trim((string) ($link->artist_role ?? '')))) {
                'primary' => 0,
                'featured' => 1,
                default => 2,
            })
            ->values();
        $artistIds = $links->pluck('artist_id')->map(fn ($id): string => (string) $id)->filter()->unique()->values()->all();
        $artists = $artistIds === []
            ? collect()
            : Artist::query()
                ->whereIn((new Artist)->getKeyName(), $artistIds)
                ->get()
                ->keyBy(fn (Artist $artist): string => (string) $artist->getKey());
        $linksBySong = $links->groupBy(fn (SongArtist $link): string => (string) $link->song_id);
        $artistNameParser = app(SongImportService::class);
        $result = [];

        foreach ($songs as $song) {
            $displayNames = collect($artistNameParser->artistNames((string) ($song->artist_name ?? '')))
                ->map(fn (string $name): string => mb_strtolower(trim($name)))
                ->flip();
            $result[(string) $song->getKey()] = $linksBySong
                ->get((string) $song->getKey(), collect())
                ->unique(fn (SongArtist $link): string => (string) $link->artist_id)
                ->filter(function (SongArtist $link) use ($displayNames, $artists): bool {
                    $artist = $artists->get((string) $link->artist_id);

                    return $artist !== null && $displayNames->has(mb_strtolower(trim((string) $artist->name)));
                })
                ->map(fn (SongArtist $link): ?array => ($artist = $artists->get((string) $link->artist_id)) ? [
                    'id' => (string) $artist->getKey(),
                    'name' => $artist->name,
                    'slug' => $artist->slug,
                    'avatar_url' => $artist->avatar_url,
                ] : null)
                ->filter()
                ->values()
                ->all();
        }

        return $result;
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

    private function localSongData(Song $song, bool $includeLyrics = false): array
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

        // Do not make a synchronous upstream request while rendering the song page.
        // External streams are refreshed by the audio endpoint when playback starts.
        $artistCredits = $this->songArtistsForCollection(collect([$song]))[$songId] ?? [];
        $primaryArtist = $artistCredits[0] ?? null;
        $album = filled($song->album_id) ? Album::query()->find($song->album_id) : null;
        $genreLink = SongGenre::query()->where('song_id', $songId)->first();
        $genre = $genreLink ? Genre::query()->find($genreLink->genre_id) : null;
        $topicLinks = TopicSong::query()->where('song_id', $songId)->orderBy('position')->get();
        $playlistLinks = PlaylistSong::query()->where('song_id', $songId)->orderBy('position')->get();
        $topicsById = $topicLinks->isEmpty() ? collect() : Topic::query()
            ->whereIn((new Topic)->getKeyName(), $topicLinks->pluck('topic_id')->map('strval')->unique()->values()->all())
            ->get()
            ->keyBy(fn (Topic $topic): string => (string) $topic->getKey());
        $playlistsById = $playlistLinks->isEmpty() ? collect() : Playlist::query()
            ->whereIn((new Playlist)->getKeyName(), $playlistLinks->pluck('playlist_id')->map('strval')->unique()->values()->all())
            ->get()
            ->keyBy(fn (Playlist $playlist): string => (string) $playlist->getKey());

        $audioUrl = $audio?->file_url;
        if ((bool) ($audio?->premium_only ?? false)
            || $audio?->source === 'nhaccuatui'
            || ($song->external_source === 'nhaccuatui' && ($audio === null || blank($audio->source)))) {
            $audioUrl = route('api.v1.songs.audio', ['slug' => $song->slug ?: $song->getKey()]);
        }

        $data = [
            'id' => (string) $song->getKey(),
            'external_id' => $song->external_id,
            'title' => $song->title,
            'slug' => $song->slug,
            'artist' => ($song->artist_name || $primaryArtist) ? [
                'id' => $primaryArtist['id'] ?? null,
                'name' => $primaryArtist['name'] ?? $song->artist_name,
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
                ->map(fn ($link): ?array => ($topic = $topicsById->get((string) $link->topic_id)) ? [
                    'id' => (string) $topic->getKey(),
                    'name' => $topic->name,
                    'type' => $topic->type,
                ] : null)
                ->filter()
                ->values()
                ->all(),
            'playlists' => $playlistLinks
                ->map(fn ($link): ?array => ($playlist = $playlistsById->get((string) $link->playlist_id)) ? [
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

    private function forgetSongDetailCache(Song $song, string $identifier): void
    {
        $identifiers = array_unique(array_filter([
            $identifier,
            (string) $song->getKey(),
            (string) $song->slug,
        ]));

        foreach ($identifiers as $cacheIdentifier) {
            Cache::store('file')->forget('api:song:v4:'.$this->catalogContentRevision().':'.sha1($cacheIdentifier));
            Cache::store('file')->forget('api:song:v4:'.sha1($cacheIdentifier));
        }
    }

    private function engagementActorId(Request $request, ?string $visitorId): string
    {
        if ($request->user()) {
            return (string) $request->user()->getKey();
        }
        $visitorId = trim((string) $visitorId);

        return preg_match('/^(?:[a-f0-9-]{36}|visitor-\d+-[a-z0-9]+)$/i', $visitorId)
            ? $visitorId
            : 'visitor:'.hash('sha256', (string) $request->ip());
    }

    private function findPublicPlaylist(string $identifier): ?Playlist
    {
        $query = Playlist::query()
            ->where('status', 'active')
            ->whereIn('visibility', ['public', 'unlisted']);
        $playlist = (clone $query)->where('slug', $identifier)->first();

        if ($playlist) {
            return $playlist;
        }

        try {
            return (clone $query)->find($identifier);
        } catch (\Throwable) {
            return null;
        }
    }

    private function findPublishedAlbum(string $identifier): ?Album
    {
        $query = Album::query()->where('status', 'published');
        $album = (clone $query)->where('slug', $identifier)->first();

        if ($album) {
            return $album;
        }

        try {
            return (clone $query)->find($identifier);
        } catch (\Throwable) {
            return null;
        }
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
        $links = TopicSong::query()
            ->where('topic_id', (string) $topic->getKey())
            ->orderBy('position')
            ->get();
        $songIds = $links->pluck('song_id')->map('strval')->unique()->values()->all();
        if ($songIds === []) {
            return [];
        }

        $songs = Song::query()
            ->whereIn((new Song)->getKeyName(), $songIds)
            ->whereIn('status', ['published', 'draft'])
            ->get();
        $songsById = collect($this->localSongsData($songs))->keyBy('id');

        return $links->map(fn (TopicSong $link): ?array => $songsById->get((string) $link->song_id))
            ->filter()
            ->values()
            ->all();
    }

    private function externalApiError(RuntimeException $exception): JsonResponse
    {
        // HttpException also extends RuntimeException. A local 404/403 is not
        // an upstream outage and must retain its original HTTP status.
        if ($exception instanceof HttpExceptionInterface) {
            throw $exception;
        }
        report($exception);

        return response()->json(['message' => $exception->getMessage()], 503);
    }
}
