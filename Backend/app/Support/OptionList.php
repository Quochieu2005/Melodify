<?php

namespace App\Support;

use Illuminate\Support\Collection;

final class OptionList
{
    public static function limit(): int
    {
        return max(1, (int) config('admin.option_list_limit', 500));
    }

    /**
     * Admin forms list a limited number of records as checkboxes or options, and saving replaces the relation
     * with whatever the form posts. A record that is selected but fell outside the limit would not be posted
     * and would be silently detached, so append the selected records to the list.
     *
     * @param  class-string  $model
     * @param  iterable<mixed>  $selectedIds
     */
    public static function withSelected(Collection $items, string $model, iterable $selectedIds, ?string $sortField = null): Collection
    {
        $present = $items->map(fn ($item): string => (string) $item->getKey())->flip();
        $missing = collect($selectedIds)
            ->map(fn ($id): string => trim((string) $id))
            ->filter()
            ->unique()
            ->reject(fn (string $id): bool => $present->has($id))
            ->values()
            ->all();

        if ($missing === []) {
            return $items;
        }

        $merged = $items->concat($model::query()->whereIn((new $model)->getKeyName(), $missing)->get());

        return $sortField === null
            ? $merged->values()
            : $merged->sortBy(fn ($item): string => mb_strtolower((string) data_get($item, $sortField)))->values();
    }
}
