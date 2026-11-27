<?php

namespace App\Services\Search;

use Illuminate\Support\Facades\Cache;
use MongoDB\Laravel\Eloquent\Model;
use Throwable;

class AtlasSearch
{
    public function enabled(): bool
    {
        return config('search.driver') === 'atlas';
    }

    /** Search index definition: accent-folded edge-gram autocomplete on each field. */
    public static function definition(array $fields): array
    {
        $mapping = [];
        foreach ($fields as $field) {
            $mapping[$field] = [
                'type' => 'autocomplete',
                'tokenization' => 'edgeGram',
                'minGrams' => 1,
                'maxGrams' => 15,
                'foldDiacritics' => true,
            ];
        }

        return ['mappings' => ['dynamic' => false, 'fields' => $mapping]];
    }

    /**
     * IDs of documents matching the term, or null when the caller must use the regex fallback
     * (driver off, index missing or still building, or Atlas error).
     *
     * @param  class-string<Model>  $model
     * @return list<string>|null
     */
    public function ids(string $model, string $term, int $limit = 500): ?array
    {
        if (! $this->enabled()) {
            return null;
        }

        $instance = new $model;
        $collection = $instance->getTable();
        $fields = config("search.collections.{$collection}");
        if (! $fields || ! $this->indexReady($model, $collection)) {
            return null;
        }

        try {
            $should = array_map(fn (string $field): array => ['autocomplete' => [
                'query' => $term, 'path' => $field, 'tokenOrder' => 'sequential',
            ]], $fields);
            $rows = $model::raw(fn ($c) => $c->aggregate([
                ['$search' => ['index' => config('search.index'), 'compound' => ['should' => $should, 'minimumShouldMatch' => 1]]],
                ['$limit' => $limit],
                ['$project' => ['_id' => 1]],
            ]));

            return collect(iterator_to_array($rows, false))->map(fn ($row): string => (string) data_get($row, '_id'))->all();
        } catch (Throwable $exception) {
            report($exception);

            return null;
        }
    }

    /** An index that is missing or still building returns empty results instead of an error, so check first. */
    private function indexReady(string $model, string $collection): bool
    {
        $key = 'search:index-ready:'.hash('sha256', $collection.'|'.(new $model)->getConnection()->getTablePrefix());

        return Cache::store('file')->remember($key, 60, function () use ($model): bool {
            try {
                foreach ($model::raw(fn ($c) => $c->listSearchIndexes(['name' => config('search.index')])) as $index) {
                    return (bool) ($index['queryable'] ?? false);
                }
            } catch (Throwable $exception) {
                report($exception);
            }

            return false;
        });
    }
}
