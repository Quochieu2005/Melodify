<?php

namespace App\Services\Music;

use App\Models\Album;
use App\Models\Artist;
use App\Models\ArtistFollower;
use App\Models\ArtistViewEvent;
use App\Models\Banner;
use App\Models\Playlist;
use App\Models\SongVideo;
use Illuminate\Support\Collection;
use MongoDB\BSON\Regex;

/**
 * Everything except song credits that points at an artist id. Deleting an artist (a duplicate, or a combined
 * "A & B" record) without moving these leaves followers, albums, playlists, banners and videos pointing at
 * a record that no longer exists.
 */
class ArtistReferenceMover
{
    /**
     * Point everything that references $fromId at $toIds (the first one is the primary).
     * With $dryRun nothing is written; the return value is the number of records that would change.
     *
     * @param  array<int, string>  $toIds
     */
    public function move(string $fromId, array $toIds, bool $dryRun = false): int
    {
        $primary = (string) ($toIds[0] ?? '');
        $changed = 0;

        foreach (ArtistFollower::query()->where('artist_id', $fromId)->get() as $follower) {
            $changed++;
            if ($dryRun) {
                continue;
            }
            $alreadyFollows = ArtistFollower::query()->where('artist_id', $primary)->where('user_id', (string) $follower->user_id)->exists();
            if ($alreadyFollows) {
                $follower->delete();
            } else {
                $follower->artist_id = $primary;
                $follower->save();
            }
        }

        $views = ArtistViewEvent::query()->where('artist_id', $fromId)->count();
        $changed += $views;
        if (! $dryRun && $views > 0) {
            ArtistViewEvent::query()->where('artist_id', $fromId)->update(['artist_id' => $primary]);
        }

        foreach ($this->referencing(Album::class, 'artist_ids', $fromId, 'artist_id') as $album) {
            $changed++;
            if ($dryRun) {
                continue;
            }
            $album->artist_ids = $this->replace((array) $album->artist_ids, $fromId, $toIds);
            if ((string) $album->artist_id === $fromId) {
                $album->artist_id = $primary;
            }
            $album->save();
        }

        foreach ([Playlist::class, Banner::class] as $model) {
            foreach ($this->referencing($model, 'artist_ids', $fromId) as $item) {
                $changed++;
                if (! $dryRun) {
                    $item->artist_ids = $this->replace((array) $item->artist_ids, $fromId, $toIds);
                    $item->save();
                }
            }
        }

        foreach ($this->referencing(SongVideo::class, 'artist_ids', $fromId) as $video) {
            $changed++;
            if ($dryRun) {
                continue;
            }
            $ids = $this->replace((array) $video->artist_ids, $fromId, $toIds);
            $video->artist_ids = $ids;
            $video->artists = $this->artistItems($ids);
            $video->save();
        }

        return $changed;
    }

    /**
     * Records whose id list contains $id. Older documents store the list as a JSON string (the model casts it),
     * so MongoDB narrows by the quoted id as well as by array element and PHP confirms the match.
     *
     * @param  class-string  $model
     */
    private function referencing(string $model, string $listField, string $id, ?string $scalarField = null): Collection
    {
        $quoted = new Regex('"'.preg_quote($id, '/').'"');

        return $model::query()
            ->where(function ($query) use ($listField, $scalarField, $id, $quoted): void {
                $query->where($listField, $id)->orWhere($listField, 'regex', $quoted);
                if ($scalarField !== null) {
                    $query->orWhere($scalarField, $id);
                }
            })
            ->get()
            ->filter(fn ($item): bool => in_array($id, array_map('strval', (array) $item->{$listField}), true)
                || ($scalarField !== null && (string) $item->{$scalarField} === $id))
            ->values();
    }

    /**
     * @param  array<int, mixed>  $ids
     * @param  array<int, string>  $replacement
     * @return array<int, string>
     */
    private function replace(array $ids, string $from, array $replacement): array
    {
        $result = [];
        foreach ($ids as $id) {
            foreach ((string) $id === $from ? $replacement : [(string) $id] as $next) {
                $result[] = (string) $next;
            }
        }

        return array_values(array_unique(array_filter($result, fn (string $id): bool => $id !== '')));
    }

    /**
     * @param  array<int, string>  $ids
     * @return array<int, array<string, mixed>>
     */
    private function artistItems(array $ids): array
    {
        $byId = Artist::query()->whereIn((new Artist)->getKeyName(), $ids)->get()->keyBy(fn (Artist $artist): string => (string) $artist->getKey());

        return collect($ids)
            ->map(fn (string $id): ?array => ($artist = $byId->get($id)) === null ? null : [
                'id' => (string) $artist->getKey(),
                'name' => $artist->name,
                'slug' => $artist->slug,
                'avatar_url' => $artist->avatar_url,
                'country_code' => $artist->country_code ?: null,
            ])
            ->filter()
            ->values()
            ->all();
    }
}
