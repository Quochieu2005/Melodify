<?php

namespace App\Services;

use App\Models\Playlist;
use App\Models\Topic;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

class CatalogGroupService
{
    private const CACHE_TTL_MINUTES = 5;

    /** @return Collection<int, string> */
    public function customTypeNames(string $model): Collection
    {
        return collect(Cache::remember(
            $this->cacheKey($model),
            now()->addMinutes(self::CACHE_TTL_MINUTES),
            fn (): array => $model::query()
                ->where('type', 'custom')
                ->get(['type_custom'])
                ->pluck('type_custom')
                ->map(fn ($type): string => trim((string) $type))
                ->filter()
                ->unique()
                ->sort()
                ->values()
                ->all(),
        ));
    }

    /** @return array<int, array{value: string, label: string}> */
    public function playlistFormGroups(): array
    {
        return $this->formGroups(config('playlists.types', []), Playlist::class);
    }

    /** @return array<int, array{value: string, label: string}> */
    public function topicFormGroups(): array
    {
        return $this->formGroups(config('topics.types', []), Topic::class);
    }

    public function forget(): void
    {
        Cache::forget($this->cacheKey(Playlist::class));
        Cache::forget($this->cacheKey(Topic::class));
    }

    /** @param array<string, string> $configuredTypes */
    private function formGroups(array $configuredTypes, string $model): array
    {
        $groups = [];

        foreach ($configuredTypes as $value => $label) {
            if ($value === 'custom') {
                continue;
            }

            $groups[] = [
                'value' => (string) $value,
                'label' => (string) $label,
            ];
        }

        foreach ($this->customTypeNames($model) as $name) {
            $groups[] = [
                'value' => 'custom:'.$name,
                'label' => $name,
            ];
        }

        $groups[] = [
            'value' => 'custom',
            'label' => (string) ($configuredTypes['custom'] ?? 'Khác (tự nhập)'),
        ];

        return $groups;
    }

    private function cacheKey(string $model): string
    {
        return 'catalog-custom-types:'.md5($model);
    }
}
