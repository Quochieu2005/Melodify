<?php

namespace App\Http\Controllers\Api\Concerns;

use App\Models\Admin;
use App\Models\Artist;
use App\Models\ArtistFollower;
use App\Models\ArtistViewEvent;
use App\Models\Favorite;
use App\Models\Genre;
use App\Models\Song;
use App\Models\SongArtist;
use App\Models\SongAudioFile;
use App\Models\SongGenre;
use App\Models\SongPlayEvent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use MongoDB\BSON\UTCDateTime;

trait BuildsHomeFeeds
{
    public function homeDiscovery(): JsonResponse
    {
        $dateKey = now(config('app.timezone', 'Asia/Ho_Chi_Minh'))->toDateString();
        $revision = $this->catalogContentRevision();
        $payload = Cache::store('file')->flexible('api:home-discovery:v3:'.$dateKey.':'.$revision, [60, 300], function () use ($dateKey): array {
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
            $playCountRows = $publishedSongIds === [] ? [] : SongPlayEvent::query()->raw(
                fn ($collection) => $collection->aggregate([
                    ['$match' => [
                        'song_id' => ['$in' => $publishedSongIds],
                        'started_at' => ['$gte' => new UTCDateTime($dayStart->getTimestampMs())],
                    ]],
                    ['$group' => ['_id' => '$song_id', 'plays' => ['$sum' => 1]]],
                ], ['typeMap' => ['root' => 'array', 'document' => 'array', 'array' => 'array']])->toArray(),
            );
            $playCounts = collect($playCountRows)->mapWithKeys(function (array $row): array {
                return [(string) data_get($row, '_id', '') => (int) data_get($row, 'plays', 0)];
            });
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

    public function homeBootstrap(): JsonResponse
    {
        $dateKey = now(config('app.timezone', 'Asia/Ho_Chi_Minh'))->toDateString();
        $revision = $this->catalogContentRevision();
        $payload = Cache::store('file')->flexible('api:home-bootstrap:v21:'.$dateKey.':'.$revision, [60, 300], function () use ($dateKey): array {
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
            $trending = $this->responsePayload($this->trendingArtists());

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
                    'trending_artists' => array_slice(data_get($trending, 'data', []), 0, 8),
                ],
                'meta' => [
                    'date' => $dateKey,
                    'refresh_minutes' => 1,
                ],
            ];
        });

        return response()->json($payload);
    }

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
        $filters = $request->validate([
            'visitor_id' => ['nullable', 'string', 'max:120'],
        ]);
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

        $song = $candidatePayloads->isEmpty() ? null : $candidatePayloads->random();
        if ($song !== null) {
            $actorId = $request->user() ? (string) $request->user()->getKey() : null;
            $song['is_favorite'] = $actorId !== null && Favorite::query()
                ->where('song_id', (string) $song['id'])
                ->where('user_id', $actorId)
                ->exists();
        }

        return response()->json(['data' => $song]);
    }
}
