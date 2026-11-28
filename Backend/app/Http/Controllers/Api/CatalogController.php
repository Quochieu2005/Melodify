<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\BuildsHomeFeeds;
use App\Http\Controllers\Api\Concerns\RecordsEngagement;
use App\Http\Controllers\Api\Concerns\SearchesCatalog;
use App\Http\Controllers\Controller;
use App\Models\Admin;
use App\Models\Album;
use App\Models\AlbumFavorite;
use App\Models\AlbumShare;
use App\Models\Artist;
use App\Models\ArtistFollower;
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
use App\Models\VideoFavorite;
use App\Services\Analytics\EventCounts;
use App\Services\Music\LyricsClient;
use App\Services\Music\NhacCuaTuiClient;
use App\Services\Music\SongImportService;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use MongoDB\BSON\UTCDateTime;
use RuntimeException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

class CatalogController extends Controller
{
    use BuildsHomeFeeds;
    use RecordsEngagement;
    use SearchesCatalog;

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
        $payload = $this->responsePayload($this->show(Album::class, $slug, ['published'], fn (Album $album): array => $this->albumData($album, true)));
        $albumId = (string) data_get($payload, 'data.id', '');
        if ($albumId !== '') {
            $actorId = $request->user() ? (string) $request->user()->getKey() : null;
            $payload['data']['favorite_count'] = AlbumFavorite::query()->where('album_id', $albumId)->count();
            $payload['data']['share_count'] = AlbumShare::query()->where('album_id', $albumId)->count();
            $payload['data']['is_favorite'] = $actorId !== null && AlbumFavorite::query()
                ->where('album_id', $albumId)
                ->where('user_id', $actorId)
                ->exists();
        }

        return response()->json($payload);
    }

    public function artists(Request $request): JsonResponse
    {
        return $this->collection($request, Artist::class, ['active'], fn (Artist $artist): array => $this->artistData($artist));
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

        $actorId = $request->user() ? (string) $request->user()->getKey() : null;
        $playlistId = (string) $playlist->getKey();
        $cacheKey = 'api:playlist-detail:v1:'.$this->catalogContentRevision().':'.sha1($playlistId);
        $data = Cache::store('file')->remember($cacheKey, now()->addMinute(), function () use ($playlist, $playlistId): array {
            $artists = $this->playlistArtistsForCollection(collect([$playlist]))[$playlistId] ?? [];
            $songCount = PlaylistSong::query()->where('playlist_id', $playlistId)->count();
            $playlistData = $this->playlistData($playlist, false, $artists, $songCount);
            $playlistData['songs'] = $this->playlistSongsData($playlist);

            return $playlistData;
        });

        $canEngage = in_array((string) $playlist->visibility, ['public', 'unlisted'], true);
        $data['favorite_count'] = $canEngage ? PlaylistFavorite::query()->where('playlist_id', $playlistId)->count() : 0;
        $data['share_count'] = $canEngage ? PlaylistShare::query()->where('playlist_id', $playlistId)->count() : 0;
        $data['is_favorite'] = $canEngage && $actorId !== null && PlaylistFavorite::query()
            ->where('playlist_id', $playlistId)
            ->where('user_id', $actorId)
            ->exists();
        $data['can_edit'] = $request->user()
            ? (string) $playlist->user_id === (string) $request->user()->getKey()
            : false;

        return response()->json(['data' => $data]);
    }

    public function charts(): JsonResponse
    {
        $dateKey = now(config('app.timezone', 'Asia/Ho_Chi_Minh'))->toDateString();
        $items = $this->cachedChartPayloads($dateKey, 5);

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

    /**
     * Return all data needed by the Home page in one request.
     *
     * The individual catalog endpoints remain available for their gallery pages,
     * but combining them here prevents the local PHP server from serialising six
     * independent browser requests during the initial Home render.
     */

    /**
     * Rank artists with both plays and profile visits in the last seven days.
     *
     * @return array<int, array<string, mixed>>
     */
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

        $videos = collect($items->items());
        $actorId = $request->user() ? (string) $request->user()->getKey() : null;
        $videoStats = $this->videoEngagementStats($videos, $actorId);

        return response()->json([
            'data' => $videos->map(fn (SongVideo $video): array => $this->videoData($video, $videoStats[(string) $video->getKey()] ?? []))->values()->all(),
            'meta' => [
                'current_page' => $items->currentPage(),
                'last_page' => $items->lastPage(),
                'per_page' => $items->perPage(),
                'total' => $items->total(),
            ],
        ])->header('Cache-Control', 'private, no-store');
    }

    public function video(string $slug, Request $request): JsonResponse
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

        $actorId = $request->user() ? (string) $request->user()->getKey() : null;
        $videoStats = $this->videoEngagementStats(collect([$video]), $actorId);

        return response()->json(['data' => $this->videoData($video, $videoStats[(string) $video->getKey()] ?? [])])
            ->header('Cache-Control', 'private, no-store');
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
        // This endpoint is public; never include unpublished catalog records.
        $songs = Song::query()->where('status', 'published');

        if ($search !== '') {
            $songs->where(function ($query) use ($search): void {
                $query
                    ->where('title', 'like', "%{$search}%")
                    ->orWhere('artist_name', 'like', "%{$search}%");
            });
        }

        $songCollection = $songs->limit(500)->get();
        $songIds = $songCollection->map(fn (Song $song): string => (string) $song->getKey())->values()->all();
        $viewsBySong = $this->songEventCounts(SongPlayEvent::class, $songIds, 'started_at', $from);
        $favoritesBySong = $this->songEventCounts(Favorite::class, $songIds, 'created_at', $from);
        $sharesBySong = $this->songEventCounts(SongShare::class, $songIds, 'created_at', $from);

        $ranked = $songCollection
            ->map(function (Song $song) use ($viewsBySong, $favoritesBySong, $sharesBySong): array {
                $songId = (string) $song->getKey();

                return [
                    'song' => $song,
                    'views' => $viewsBySong[$songId] ?? 0,
                    'favorites' => $favoritesBySong[$songId] ?? 0,
                    'shares' => $sharesBySong[$songId] ?? 0,
                ];
            })
            ->sort(function (array $left, array $right) use ($sort): int {
                $views = $right[$sort] <=> $left[$sort];

                return $views !== 0
                    ? $views
                    : strcasecmp((string) $left['song']->title, (string) $right['song']->title);
            })
            ->take($limit)
            ->values();

        $selectedSongs = $ranked->pluck('song')->values();
        $songDataById = collect($this->localSongsData($selectedSongs))->keyBy('id');
        $items = $ranked->map(function (array $item) use ($songDataById): array {
            $songId = (string) $item['song']->getKey();

            return array_merge($songDataById->get($songId, []), [
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

    public function favoriteSongs(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user, 401, 'Vui lòng đăng nhập để xem bài hát yêu thích.');

        $actorId = (string) $user->getKey();
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

        // Counted by MongoDB: a popular song can have many thousands of favorites from other accounts.
        $favoriteCounts = collect(EventCounts::by(Favorite::class, 'song_id', match: [
            'song_id' => ['$in' => $orderedSongs->map(fn (Song $song): string => (string) $song->getKey())->all()],
        ]));
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

    public function song(string $slug, Request $request): JsonResponse
    {
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
                $track = $this->nctSong($slug);

                return ['data' => $this->nctTrackData($track), '_local_song_id' => null];
            });

            $localSongId = (string) ($payload['_local_song_id'] ?? '');
            unset($payload['_local_song_id']);

            if ($localSongId !== '') {
                $actorId = $request->user() ? (string) $request->user()->getKey() : null;
                $payload['data']['is_favorite'] = $actorId !== null && Favorite::query()
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
            $track = $this->nctSong($slug);
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
            'query' => $this->cacheableQuery($request->query()),
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
                $topicCounts = $topicIds === [] ? [] : EventCounts::by(TopicSong::class, 'topic_id', match: ['topic_id' => ['$in' => $topicIds]]);
            }

            if ($model === Genre::class) {
                $genreIds = $pageItems->map(fn (Genre $genre): string => (string) $genre->getKey())->all();
                $genreCounts = $genreIds === [] ? [] : EventCounts::by(SongGenre::class, 'genre_id', match: ['genre_id' => ['$in' => $genreIds]]);
            }

            if ($model === Album::class) {
                $albumIds = $pageItems->map(fn (Album $album): string => (string) $album->getKey())->all();
                $artistIds = $pageItems->pluck('artist_id')->filter()->map(fn ($id): string => (string) $id)->unique()->values()->all();
                $albumArtists = Artist::query()
                    ->whereIn((new Artist)->getKeyName(), $artistIds)
                    ->get()
                    ->keyBy(fn (Artist $artist): string => (string) $artist->getKey())
                    ->all();
                $albumCounts = $albumIds === [] ? [] : EventCounts::by(Song::class, 'album_id', match: ['album_id' => ['$in' => $albumIds]]);
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

    /**
     * The query parameters that can change a catalog response. The whole query string used to be part of the cache
     * key, so every made-up parameter (?x=1, ?x=2, ...) wrote a new cache file and skipped the cache.
     *
     * @param  array<string, mixed>  $query
     * @return array<string, mixed>
     */
    private function cacheableQuery(array $query): array
    {
        return array_intersect_key($query, array_flip([
            'q', 'query', 'page', 'per_page', 'limit', 'topic', 'genre', 'summary', 'daily',
            'genre_ids', 'artist_ids', 'exclude_song_ids', 'language',
        ]));
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
            'query' => $this->cacheableQuery(request()->query()),
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
            $usesAudioProxy = (bool) ($audio?->premium_only ?? false)
                || $audio?->source === 'nhaccuatui'
                || ($song->external_source === 'nhaccuatui' && ($audio === null || blank($audio->source)));
            $audioEndpoint = route('api.v1.songs.audio', ['slug' => $song->slug ?: $song->getKey()]);
            if ($usesAudioProxy) {
                $audioUrl = $audioEndpoint;
            }
            $downloadUrl = $usesAudioProxy ? $audioEndpoint.'?download=1' : null;
            $audioQualities = $audio?->source === 'nhaccuatui' ? $this->publicAudioQualities(
                $audio->stream_options,
                route('api.v1.songs.audio', ['slug' => $song->slug ?: $song->getKey()]),
            ) : [];
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
                'audio_quality' => $this->defaultAudioQualityLabel($audioQualities),
                'audio_qualities' => $audioQualities,
                'album' => $album ? ['id' => (string) $album->getKey(), 'title' => $album->title] : null,
                'duration_seconds' => $song->duration_seconds !== null ? (int) $song->duration_seconds : null,
                'is_featured' => (int) ($song->is_featured ?? 0),
                'is_hot' => (int) ($song->is_hot ?? 0),
                'preview_limit_seconds' => (int) ($song->is_hot ?? 0) === 1 ? 30 : null,
                'cover_url' => $song->cover_url,
                'audio_url' => $audioUrl,
                'stream_url' => $audioUrl,
                'download_url' => $downloadUrl,
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

    /**
     * NhacCuaTui lookup that remembers a failure for two minutes. Any made-up id of letters and digits reaches the
     * upstream service, and a failed lookup is not cached by the callers, so repeating one would call it every time.
     */
    private function nctSong(string $id): array
    {
        $store = Cache::store('file');
        $key = 'api:nct-miss:'.sha1($id);

        if ($store->has($key)) {
            throw new RuntimeException((string) $store->get($key));
        }

        try {
            return $this->nhaccuatui->getSong($id);
        } catch (RuntimeException $exception) {
            if (! $exception instanceof HttpExceptionInterface) {
                $store->put($key, $exception->getMessage(), 120);
            }

            throw $exception;
        }
    }

    private function nctTrackData(array $track): array
    {
        $id = (string) ($track['trackId'] ?? '');
        $title = (string) ($track['trackName'] ?? 'Bài hát');
        $artist = [
            'id' => filled($track['artistId'] ?? null) ? (string) $track['artistId'] : null,
            'name' => $track['artistName'] ?? 'Nghệ sĩ chưa xác định',
        ];

        $audioEndpoint = filled($id) ? route('api.v1.songs.external-audio', ['externalId' => $id]) : null;

        return [
            'id' => $id,
            'title' => $title,
            'slug' => Str::slug($title) ?: $id,
            'artist' => $artist,
            'duration_seconds' => isset($track['trackTimeMillis']) ? (int) round(((int) $track['trackTimeMillis']) / 1000) : null,
            'is_hot' => 0,
            'preview_limit_seconds' => null,
            'audio_url' => $audioEndpoint,
            'stream_url' => $audioEndpoint,
            'download_url' => $audioEndpoint ? $audioEndpoint.'?download=1' : null,
            'audio_quality' => $this->defaultAudioQualityLabel($this->publicAudioQualities(
                $track['streamOptions'] ?? [],
                $audioEndpoint ?? '',
            )),
            'audio_qualities' => $this->publicAudioQualities(
                $track['streamOptions'] ?? [],
                $audioEndpoint ?? '',
            ),
            'preview_url' => null,
            'cover_url' => $track['artworkUrl100'] ?? null,
            'country_code' => $track['countryCode'] ?? null,
            'country' => filled($track['countryCode'] ?? null) ? config('music.countries.'.$track['countryCode']) : null,
            'source_url' => $track['trackViewUrl'] ?? null,
            'external_source' => 'nhaccuatui',
        ];
    }

    /**
     * Public quality metadata intentionally contains Melodify proxy URLs only;
     * expiring provider stream/download URLs must never leave the server.
     */
    private function publicAudioQualities(?array $options, string $endpoint): array
    {
        return collect($options ?? [])
            ->filter(fn ($option): bool => is_array($option)
                && filled($option['qualityId'] ?? $option['quality_id'] ?? null))
            ->map(function (array $option) use ($endpoint): array {
                $qualityId = (string) ($option['qualityId'] ?? $option['quality_id']);
                $available = (bool) ($option['available'] ?? filled($option['streamUrl'] ?? $option['stream_url'] ?? null));
                $bitrate = isset($option['bitrate']) ? (int) $option['bitrate'] : null;
                $qualityHint = implode(' ', array_filter([
                    (string) ($option['format'] ?? ''),
                    (string) ($option['quality'] ?? ''),
                    (string) ($option['label'] ?? ''),
                    (string) ($option['name'] ?? ''),
                    (string) ($option['key'] ?? ''),
                    (string) ($option['typeUI'] ?? ''),
                    (string) ($option['type'] ?? ''),
                ]));
                $isLossless = preg_match('/lossless|flac|alac/i', $qualityHint) === 1 || ($bitrate ?? 0) >= 900;
                $audioUrl = null;
                if ($available) {
                    $query = http_build_query(['quality_id' => $qualityId], '', '&', PHP_QUERY_RFC3986);
                    $audioUrl = $endpoint.'?'.$query;
                }

                return [
                    'quality_id' => $qualityId,
                    'label' => (string) ($option['label'] ?? 'Chất lượng nhạc'),
                    'bitrate' => $bitrate,
                    'premium_only' => (bool) ($option['premiumOnly'] ?? $option['premium_only'] ?? false) || $isLossless,
                    'available' => $available,
                    'audio_url' => $audioUrl,
                    'download_url' => $audioUrl ? $audioUrl.'&download=1' : null,
                ];
            })
            ->values()
            ->all();
    }

    private function defaultAudioQualityLabel(array $qualities): ?string
    {
        $default = collect($qualities)->first(fn (array $quality): bool => ! $quality['premium_only']);

        return $default['label'] ?? null;
    }

    private function activeVideoByIdentifier(string $identifier): ?SongVideo
    {
        $query = SongVideo::query()->where('status', 'active');
        $video = (clone $query)->where('slug', $identifier)->first();
        if ($video) {
            return $video;
        }

        if (! preg_match('/^[a-f0-9]{24}$/i', $identifier)) {
            return null;
        }

        try {
            return (clone $query)->find($identifier);
        } catch (\Throwable) {
            return null;
        }
    }

    /** @param Collection<int, SongVideo> $videos
     * @return array<string, array{view_count: int, favorite_count: int, share_count: int, is_favorite: bool}>
     */
    private function videoEngagementStats(Collection $videos, ?string $actorId): array
    {
        $videoIds = $videos->map(fn (SongVideo $video): string => (string) $video->getKey())->values();
        $stats = $videos->mapWithKeys(function (SongVideo $video): array {
            $videoId = (string) $video->getKey();

            return [$videoId => [
                'view_count' => (int) ($video->view_count ?? 0),
                'favorite_count' => 0,
                'share_count' => (int) ($video->share_count ?? 0),
                'is_favorite' => false,
            ]];
        })->all();

        if ($videoIds->isEmpty()) {
            return $stats;
        }

        // Counted by MongoDB; only the caller's own favorites are read as rows.
        foreach (EventCounts::by(VideoFavorite::class, 'video_id', match: ['video_id' => ['$in' => $videoIds->all()]]) as $videoId => $count) {
            if (isset($stats[$videoId])) {
                $stats[$videoId]['favorite_count'] = $count;
            }
        }
        if ($actorId !== null) {
            foreach (VideoFavorite::query()->whereIn('video_id', $videoIds->all())->where('actor_id', $actorId)->get(['video_id']) as $favorite) {
                if (isset($stats[(string) $favorite->video_id])) {
                    $stats[(string) $favorite->video_id]['is_favorite'] = true;
                }
            }
        }

        return $stats;
    }

    /** @param array{view_count?: int, favorite_count?: int, share_count?: int, is_favorite?: bool} $stats */
    private function videoData(SongVideo $video, array $stats = []): array
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
            'view_count' => $stats['view_count'] ?? (int) ($video->view_count ?? 0),
            'favorite_count' => $stats['favorite_count'] ?? (int) ($video->favorite_count ?? 0),
            'share_count' => $stats['share_count'] ?? (int) ($video->share_count ?? 0),
            'is_favorite' => $stats['is_favorite'] ?? false,
            'can_download' => $video->source !== 'youtube' && (filled($video->video_url) || ($video->source === 'nhaccuatui' && filled($video->external_id))),
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
        $usesAudioProxy = (bool) ($audio?->premium_only ?? false)
            || $audio?->source === 'nhaccuatui'
            || ($song->external_source === 'nhaccuatui' && ($audio === null || blank($audio->source)));
        $audioEndpoint = route('api.v1.songs.audio', ['slug' => $song->slug ?: $song->getKey()]);
        if ($usesAudioProxy) {
            $audioUrl = $audioEndpoint;
        }
        $downloadUrl = $usesAudioProxy ? $audioEndpoint.'?download=1' : null;
        $audioQualities = $audio?->source === 'nhaccuatui' ? $this->publicAudioQualities(
            $audio->stream_options,
            route('api.v1.songs.audio', ['slug' => $song->slug ?: $song->getKey()]),
        ) : [];

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
            'audio_quality' => $this->defaultAudioQualityLabel($audioQualities),
            'audio_qualities' => $audioQualities,
            'duration_seconds' => $song->duration_seconds !== null
                ? (int) $song->duration_seconds
                : ($audio?->duration_seconds !== null ? (int) $audio->duration_seconds : null),
            'is_featured' => (int) ($song->is_featured ?? 0),
            'is_hot' => (int) ($song->is_hot ?? 0),
            'preview_limit_seconds' => (int) ($song->is_hot ?? 0) === 1 ? 30 : null,
            'cover_url' => $song->cover_url,
            'audio_url' => $audioUrl,
            'stream_url' => $audioUrl,
            'download_url' => $downloadUrl,
            'preview_url' => $song->preview_url,
            'source_url' => $song->external_url ?: $song->itunes_url,
            'external_source' => $song->external_source,
            'country_code' => $song->country_code,
            'country' => filled($song->country_code) ? config('music.countries.'.$song->country_code, $song->country_code) : null,
        ];
    }

    /**
     * Build chart lists from the published catalog, ordered by most recently added.
     */
    private function chartPayloads(string $dateKey, int $songsPerChart = 50): array
    {
        $songs = Song::query()
            ->where('status', 'published')
            ->orderByDesc('created_at')
            ->orderByDesc('release_date')
            ->get();
        $songIds = $songs->map(fn (Song $song): string => (string) $song->getKey())->filter()->values()->all();
        $audioBySong = SongAudioFile::query()
            ->whereIn('song_id', $songIds)
            ->where('status', 'active')
            ->where('file_type', 'full')
            ->get()
            ->keyBy(fn (SongAudioFile $audio): string => (string) $audio->song_id);
        $artistCredits = $this->songArtistsForCollection($songs);
        $genreNamesBySong = $this->songGenresForCollection($songs);
        $charts = [];
        foreach ($this->chartDefinitions() as $definition) {
            $filtered = $songs->filter(function (Song $song) use ($definition, $genreNamesBySong): bool {
                return $definition['filter']($song, $genreNamesBySong[(string) $song->getKey()] ?? []);
            })->values();
            $ranking = $definition['ranking'] ?? 'recent';
            if (in_array($ranking, ['favorites', 'trending'], true)) {
                $songIdsInChart = $filtered->map(fn (Song $song): string => (string) $song->getKey())->all();
                $counts = $this->songEventCounts(
                    $ranking === 'favorites' ? Favorite::class : SongPlayEvent::class,
                    $songIdsInChart,
                    $ranking === 'favorites' ? 'created_at' : 'started_at',
                    $ranking === 'trending' ? now(config('app.timezone', 'Asia/Ho_Chi_Minh'))->subDays(7)->startOfDay() : null,
                );
                $filtered = $filtered
                    ->sortByDesc(fn (Song $song): int => $counts[(string) $song->getKey()] ?? 0)
                    ->values();
            }

            $chartSongCount = min($filtered->count(), 50);
            $chartSongs = $filtered->take($songsPerChart)->map(function (Song $song, int $index) use ($audioBySong, $artistCredits): array {
                $data = $this->compactSongData($song, $audioBySong->get((string) $song->getKey()), $artistCredits[(string) $song->getKey()] ?? []);

                return array_merge($data, [
                    'rank' => $index + 1,
                    'trend' => 'same',
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
                'song_count' => $chartSongCount,
                'songs' => $chartSongs,
            ];
        }

        return $charts;
    }

    private function cachedChartPayloads(string $dateKey, int $songsPerChart = 50): array
    {
        return Cache::store('file')->flexible('api:charts:v8:'.$songsPerChart.':'.$dateKey.':'.$this->catalogContentRevision(), [60, 300], fn (): array => $this->chartPayloads($dateKey, $songsPerChart));
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
                'title' => 'Bài Hát Mới Cập Nhật',
                'tone' => 'rose',
                'description' => 'Bài hát đã xuất bản, xếp theo thời gian mới được thêm vào kho nhạc.',
                'filter' => fn (Song $song, array $genreNames = []): bool => true,
            ],
            [
                'slug' => 'top-50-nhac-viet',
                'title' => 'Top 50 Nhạc Việt',
                'tone' => 'olive',
                'description' => 'Bài hát được phân loại là nhạc Việt theo quốc gia hoặc nội dung metadata.',
                'filter' => fn (Song $song, array $genreNames = []): bool => $this->isVietnameseSong($song),
            ],
            [
                'slug' => 'top-50-rap-viet',
                'title' => 'Top 50 Nhạc Rap Việt',
                'tone' => 'purple',
                'description' => 'Bài hát có thể loại Rap hoặc Hip-Hop và được nhận diện là nhạc Việt theo metadata; xếp theo thời gian thêm vào kho nhạc.',
                'filter' => fn (Song $song, array $genreNames = []): bool => $this->isVietnameseSong($song) && $this->isRapSong($genreNames),
            ],
            [
                'slug' => 'top-50-nhac-hoa',
                'title' => 'Top 50 Nhạc Hoa',
                'tone' => 'purple',
                'description' => 'Bài hát được phân loại là nhạc Hoa theo quốc gia hoặc ký tự trong metadata.',
                'filter' => fn (Song $song, array $genreNames = []): bool => $this->isChineseSong($song),
            ],
            [
                'slug' => 'top-50-nhac-han',
                'title' => 'Top 50 Nhạc Hàn',
                'tone' => 'olive',
                'description' => 'Bài hát được nhận diện là nhạc Hàn theo mã quốc gia hoặc ký tự Hangul; xếp theo thời gian thêm vào kho nhạc.',
                'filter' => fn (Song $song, array $genreNames = []): bool => $this->isKoreanSong($song, $genreNames),
            ],
            [
                'slug' => 'top-50-nhac-remix-viet',
                'title' => 'Top 50 Nhạc Remix Việt',
                'tone' => 'olive',
                'description' => 'Bài remix được phân loại là nhạc Việt theo metadata.',
                'filter' => fn (Song $song, array $genreNames = []): bool => $this->isRemixSong($song) && $this->isVietnameseSong($song),
            ],
            [
                'slug' => 'top-50-youtube',
                'title' => 'Top 50 Nhạc Âu Mỹ',
                'tone' => 'rose',
                'description' => 'Bài hát được phân loại theo quốc gia Âu Mỹ trong metadata.',
                'filter' => fn (Song $song, array $genreNames = []): bool => $this->isWesternSong($song),
            ],
            [
                'slug' => 'top-50-nhac-remix',
                'title' => 'Top 50 Nhạc Remix',
                'tone' => 'purple',
                'description' => 'Bài hát có từ “remix” trong tiêu đề hoặc tên nghệ sĩ.',
                'filter' => fn (Song $song, array $genreNames = []): bool => $this->isRemixSong($song),
            ],
            [
                'slug' => 'top-50-bai-hat-yeu-thich-nhat',
                'title' => 'Top 50 Bài Hát Được Yêu Thích Nhất',
                'tone' => 'rose',
                'description' => 'Xếp theo tổng lượt yêu thích đã ghi nhận trong database.',
                'filter' => fn (Song $song, array $genreNames = []): bool => true,
                'ranking' => 'favorites',
            ],
            [
                'slug' => 'top-50-thinh-hanh',
                'title' => 'Top 50 Bài Hát Thịnh Hành',
                'tone' => 'olive',
                'description' => 'Xếp theo lượt nghe trong 7 ngày gần nhất; bài mới hơn đứng trước khi bằng lượt nghe.',
                'filter' => fn (Song $song, array $genreNames = []): bool => true,
                'ranking' => 'trending',
            ],
        ];
    }

    private function isWesternSong(Song $song): bool
    {
        $country = strtoupper(trim((string) ($song->country_code ?? '')));

        return in_array($country, [
            'US', 'GB', 'UK', 'CA', 'AU', 'NZ', 'IE', 'FR', 'DE', 'ES', 'IT',
            'NL', 'BE', 'CH', 'AT', 'SE', 'NO', 'DK', 'FI', 'PT',
        ], true);
    }

    private function isVietnameseSong(Song $song): bool
    {
        $country = strtoupper(trim((string) ($song->country_code ?? '')));
        if ($country !== '') {
            return in_array($country, ['VN', 'VNM', 'VIE', 'VIETNAM', 'VIETNAMESE'], true);
        }

        $text = mb_strtolower((string) $song->title.' '.(string) $song->artist_name);

        return preg_match('/[àáạảãăằắặẳẵâầấậẩẫđèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹ]/iu', $text) === 1;
    }

    private function isKoreanSong(Song $song, array $genreNames): bool
    {
        $country = strtoupper(trim((string) ($song->country_code ?? '')));
        if ($country !== '') {
            return in_array($country, ['KR', 'KOR', 'KOREA', 'SOUTH KOREA', 'REPUBLIC OF KOREA'], true);
        }

        $text = (string) $song->title.' '.(string) $song->artist_name;

        return preg_match('/\p{Hangul}/u', $text) === 1
            || preg_match('/(?:k[\s-]?pop|korean|nhạc\s*hàn)/iu', implode(' ', $genreNames)) === 1;
    }

    private function isRapSong(array $genreNames): bool
    {
        return preg_match('/(?:^|[^\p{L}])(?:rap|hip[\s-]*hop)(?=$|[^\p{L}])/iu', implode(' ', $genreNames)) === 1;
    }

    /** @return array<string, list<string>> */
    private function songGenresForCollection(Collection $songs): array
    {
        $songIds = $songs->map(fn (Song $song): string => (string) $song->getKey())->filter()->values()->all();
        if ($songIds === []) {
            return [];
        }

        $links = SongGenre::query()
            ->whereIn('song_id', $songIds)
            ->get();
        $linksBySong = $links->groupBy(fn (SongGenre $link): string => (string) $link->song_id);
        $genreIds = $links->pluck('genre_id')->filter()->map(fn ($id): string => (string) $id)->unique()->values()->all();
        $genres = $genreIds === []
            ? collect()
            : Genre::query()
                ->whereIn((new Genre)->getKeyName(), $genreIds)
                ->get()
                ->keyBy(fn (Genre $genre): string => (string) $genre->getKey());

        return $linksBySong->map(fn (Collection $links): array => $links
            ->map(fn (SongGenre $link): ?string => $genres->get((string) $link->genre_id)?->name)
            ->filter()
            ->values()
            ->all())
            ->all();
    }

    private function isChineseSong(Song $song): bool
    {
        $country = strtoupper(trim((string) ($song->country_code ?? '')));
        if ($country !== '') {
            return in_array($country, ['CN', 'CHN', 'ZH', 'CHINA'], true);
        }

        $text = (string) $song->title.' '.(string) $song->artist_name;

        return preg_match('/\p{Han}/u', $text) === 1;
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
        // Blocked songs are not public. The old last resort loaded the whole songs collection to compare slugs, so
        // any unknown slug cost a full read; the slug column is already matched exactly below.
        $visible = fn () => Song::query()->whereIn('status', ['published', 'draft']);
        $song = $visible()->where('slug', $slug)->first();

        if (! $song) {
            try {
                $song = $visible()->find($slug);
            } catch (\Throwable) {
                $song = null;
            }
        }

        return $song ?: $visible()
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
        // Only playlists anyone can open: user-made private playlists must not show up on a public song page.
        $playlistsById = $playlistLinks->isEmpty() ? collect() : Playlist::query()
            ->where('status', 'active')
            ->whereIn('visibility', ['public', 'unlisted'])
            ->whereIn((new Playlist)->getKeyName(), $playlistLinks->pluck('playlist_id')->map('strval')->unique()->values()->all())
            ->get()
            ->keyBy(fn (Playlist $playlist): string => (string) $playlist->getKey());

        $audioUrl = $audio?->file_url;
        $usesAudioProxy = (bool) ($audio?->premium_only ?? false)
            || $audio?->source === 'nhaccuatui'
            || ($song->external_source === 'nhaccuatui' && ($audio === null || blank($audio->source)));
        $audioEndpoint = route('api.v1.songs.audio', ['slug' => $song->slug ?: $song->getKey()]);
        if ($usesAudioProxy) {
            $audioUrl = $audioEndpoint;
        }
        $downloadUrl = $usesAudioProxy ? $audioEndpoint.'?download=1' : null;
        $audioQualities = $audio?->source === 'nhaccuatui' ? $this->publicAudioQualities(
            $audio->stream_options,
            route('api.v1.songs.audio', ['slug' => $song->slug ?: $song->getKey()]),
        ) : [];

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
            'audio_quality' => $this->defaultAudioQualityLabel($audioQualities),
            'audio_qualities' => $audioQualities,
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
            'download_url' => $downloadUrl,
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

    /** Count engagement for a set of songs in one Mongo aggregation, not one query per song. */
    private function songEventCounts(string $modelClass, array $songIds, string $dateField, ?\DateTimeInterface $from = null): array
    {
        if ($songIds === []) {
            return [];
        }

        $match = ['song_id' => ['$in' => $songIds]];
        if ($from !== null) {
            $match[$dateField] = ['$gte' => new UTCDateTime($from)];
        }

        $rows = $modelClass::query()->raw(fn ($collection) => $collection->aggregate([
            ['$match' => $match],
            ['$group' => ['_id' => '$song_id', 'count' => ['$sum' => 1]]],
        ], ['typeMap' => ['root' => 'array', 'document' => 'array', 'array' => 'array']])->toArray());

        return collect($rows)->mapWithKeys(fn (array $row): array => [
            (string) data_get($row, '_id', '') => (int) data_get($row, 'count', 0),
        ])->all();
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
