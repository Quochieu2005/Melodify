<?php

namespace App\Http\Controllers\Api\Concerns;

use App\Http\Controllers\Api\FollowController;
use App\Models\Album;
use App\Models\Artist;
use App\Models\ArtistFollower;
use App\Models\Playlist;
use App\Models\PlaylistSong;
use App\Models\Song;
use App\Models\SongArtist;
use App\Models\SongVideo;
use App\Models\User;
use App\Services\Search\AtlasSearch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use MongoDB\BSON\Regex;

trait SearchesCatalog
{
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
        $cacheKey = 'api:search:v1:'.$this->catalogContentRevision().':'.hash('sha256', serialize([$term, $type, $limit, $page, $includeTotals]));

        return response()->json(Cache::store('file')->remember($cacheKey, now()->addSeconds(30),
            fn (): array => $this->searchPayload($term, $type, $limit, $page, $includeTotals)));
    }

    private function searchPayload(string $term, string $type, int $limit, int $page, bool $includeTotals): array
    {
        $literal = new Regex(preg_quote($term, '/'), 'i');
        $normalized = preg_replace('/[^a-z0-9]/', '', Str::slug($term));
        $slugPattern = new Regex($normalized !== '' ? implode('[^a-z0-9]*', str_split($normalized)) : '(?!)', 'i');
        // Atlas Search ids when the index is ready, otherwise null and the regex match below is used.
        $atlas = app(AtlasSearch::class);
        $artistHits = $atlas->ids(Artist::class, $term);
        $matchedArtistIds = Artist::query()
            ->where('status', 'active')
            ->where(fn ($query) => $artistHits !== null
                ? $query->whereIn((new Artist)->getKeyName(), $artistHits)
                : $query->where('name', 'regex', $literal)->orWhere('slug', 'regex', $slugPattern))
            ->pluck((new Artist)->getKeyName())
            ->map(fn ($id): string => (string) $id)
            ->all();
        $songsByArtist = $matchedArtistIds === []
            ? []
            : SongArtist::query()->whereIn('artist_id', $matchedArtistIds)->pluck('song_id')
                ->map(fn ($id): string => (string) $id)->all();
        $artistMatchedSongs = array_values(array_unique($songsByArtist));
        $songHits = $atlas->ids(Song::class, $term);
        $relatedSongs = Song::query()->where('status', 'published')->where(function ($query) use ($literal, $slugPattern, $artistMatchedSongs, $songHits): void {
            if ($songHits !== null) {
                $query->whereIn((new Song)->getKeyName(), $songHits);
            } else {
                $query->where('title', 'regex', $literal)
                    ->orWhere('slug', 'regex', $slugPattern)
                    ->orWhere('artist_name', 'regex', $literal);
            }
            if ($artistMatchedSongs !== []) {
                $query->orWhereIn((new Song)->getKeyName(), $artistMatchedSongs);
            }
        })->orderBy('title')->take(100)->get(['_id', 'album_id']);
        $relatedSongIds = $relatedSongs->map(fn (Song $song): string => (string) $song->getKey())->all();
        $relatedAlbumIds = $relatedSongs->pluck('album_id')->map(fn ($id): string => (string) $id)->filter()->unique()->values()->all();
        $relatedArtistIds = $matchedArtistIds;
        $relatedPlaylistIds = [];
        $relatedVideoIds = [];
        if ($relatedSongIds !== []) {
            $relatedArtistIds = array_values(array_unique([...$relatedArtistIds, ...SongArtist::query()->whereIn('song_id', $relatedSongIds)->pluck('artist_id')->map(fn ($id): string => (string) $id)->all()]));
            $relatedPlaylistIds = PlaylistSong::query()->whereIn('song_id', $relatedSongIds)->pluck('playlist_id')->map(fn ($id): string => (string) $id)->unique()->values()->all();
            $relatedVideoIds = SongVideo::query()->where('status', 'active')->whereIn('song_id', $relatedSongIds)->pluck((new SongVideo)->getKeyName())->map(fn ($id): string => (string) $id)->all();
        }
        $relatedIds = [
            'song' => array_values(array_unique($artistMatchedSongs)),
            'playlist' => $relatedPlaylistIds,
            'artist' => $relatedArtistIds,
            'album' => $relatedAlbumIds,
            'video' => $relatedVideoIds,
        ];
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
            $keyName = (new $model)->getKeyName();
            $hits = match ($kind) {
                'song' => $songHits,
                'artist' => $artistHits,
                default => $atlas->ids($model, $term),
            };
            $query = $model::query()->where('status', $status)->where(function ($query) use ($field, $literal, $slugPattern, $kind, $relatedIds, $keyName, $hits): void {
                $query->where(function ($textQuery) use ($field, $literal, $slugPattern, $kind, $keyName, $hits): void {
                    if ($hits !== null) {
                        $textQuery->whereIn($keyName, $hits);

                        return;
                    }
                    $textQuery->where($field, 'regex', $literal)->orWhere($kind === 'user' ? 'username' : 'slug', 'regex', $slugPattern);
                    if ($kind === 'song') {
                        $textQuery->orWhere('artist_name', 'regex', $literal);
                    }
                });
                if (! empty($relatedIds[$kind] ?? [])) {
                    $query->orWhereIn($keyName, $relatedIds[$kind]);
                }
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
                'playlist', 'album', 'artist' => $this->searchCollectionData($kind, $items),
                'video' => $items->map(fn (SongVideo $item): array => $this->videoData($item))->all(),
                'user' => $items->map(fn (User $item): array => FollowController::userSummary($item))->all(),
            };
        }

        return ['data' => $results, 'meta' => ['query' => $term, 'type' => $type, 'page' => $page, 'per_page' => $limit, 'totals' => $totals]];
    }

    private function searchCollectionData(string $kind, Collection $items): array
    {
        if ($items->isEmpty()) {
            return [];
        }

        $ids = $items->map(fn ($item): string => (string) $item->getKey())->all();
        if ($kind === 'playlist') {
            $artists = $this->playlistArtistsForCollection($items);
            $counts = PlaylistSong::query()->whereIn('playlist_id', $ids)->get(['playlist_id'])
                ->countBy(fn (PlaylistSong $link): string => (string) $link->playlist_id);

            return $items->map(fn (Playlist $item): array => $this->playlistData($item, false,
                $artists[(string) $item->getKey()] ?? [], $counts[(string) $item->getKey()] ?? 0))->all();
        }

        if ($kind === 'album') {
            $artists = Artist::query()->whereIn((new Artist)->getKeyName(), $items->pluck('artist_id')->filter()->unique()->values()->all())
                ->get()->keyBy(fn (Artist $artist): string => (string) $artist->getKey())->all();
            $counts = Song::query()->whereIn('album_id', $ids)->get(['album_id'])
                ->countBy(fn (Song $song): string => (string) $song->album_id)->all();

            return $items->map(fn (Album $item): array => $this->albumData($item, false, $artists, $counts))->all();
        }

        $counts = ArtistFollower::query()->whereIn('artist_id', $ids)->get(['artist_id'])
            ->countBy(fn (ArtistFollower $follower): string => (string) $follower->artist_id);

        return $items->map(fn (Artist $item): array => $this->artistData($item) + [
            'followers_count' => $counts[(string) $item->getKey()] ?? 0,
        ])->all();
    }
}
