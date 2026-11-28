<?php

namespace App\Support;

final class ExistingIds
{
    /**
     * True when at least one id does not exist. One query for the whole list instead of one find() per id.
     *
     * @param  class-string  $model
     * @param  iterable<mixed>  $ids
     */
    public static function anyMissing(string $model, iterable $ids): bool
    {
        $unique = collect($ids)
            ->map(fn ($id): string => trim((string) $id))
            ->filter()
            ->unique()
            ->values()
            ->all();

        if ($unique === []) {
            return false;
        }

        return $model::query()->whereIn((new $model)->getKeyName(), $unique)->count() !== count($unique);
    }
}
