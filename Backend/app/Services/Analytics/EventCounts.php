<?php

namespace App\Services\Analytics;

use MongoDB\BSON\UTCDateTime;

/**
 * Counts computed inside MongoDB with $group. Loading every event row into PHP only to count it grows with
 * traffic (one play event per listen) and ends in an out-of-memory error on the admin pages.
 */
final class EventCounts
{
    private const TYPE_MAP = ['typeMap' => ['root' => 'array', 'document' => 'array', 'array' => 'array']];

    /**
     * @param  class-string  $model
     * @return array<string, int> id => number of rows
     */
    public static function by(string $model, string $field, ?string $dateField = null, ?\DateTimeInterface $from = null, array $match = []): array
    {
        return self::group($model, '$'.$field, $dateField, $from, $match, ['$sum' => 1]);
    }

    /**
     * @param  class-string  $model
     * @return array<string, int> Y-m-d => number of rows, days in the application time zone
     */
    public static function perDay(string $model, string $dateField, \DateTimeInterface $from, array $match = []): array
    {
        return self::group($model, self::dayExpression($dateField), $dateField, $from, $match, ['$sum' => 1]);
    }

    /**
     * @param  class-string  $model
     * @return array<string, float> Y-m-d => sum of $sumField
     */
    public static function sumPerDay(string $model, string $dateField, string $sumField, \DateTimeInterface $from, array $match = []): array
    {
        return self::group($model, self::dayExpression($dateField), $dateField, $from, $match, ['$sum' => ['$ifNull' => ['$'.$sumField, 0]]], asFloat: true);
    }

    private static function dayExpression(string $dateField): array
    {
        return ['$dateToString' => ['format' => '%Y-%m-%d', 'date' => '$'.$dateField, 'timezone' => config('app.timezone', 'UTC')]];
    }

    /** @return array<string, int|float> */
    private static function group(string $model, mixed $groupBy, ?string $dateField, ?\DateTimeInterface $from, array $match, array $accumulator, bool $asFloat = false): array
    {
        if ($dateField !== null && $from !== null) {
            $match[$dateField] = ['$gte' => new UTCDateTime($from)];
        }

        $pipeline = [];
        if ($match !== []) {
            $pipeline[] = ['$match' => $match];
        }
        $pipeline[] = ['$group' => ['_id' => $groupBy, 'total' => $accumulator]];

        $rows = $model::raw(fn ($collection) => $collection->aggregate($pipeline, self::TYPE_MAP)->toArray());
        $counts = [];
        foreach ($rows as $row) {
            $id = $row['_id'] ?? null;
            if ($id === null || $id === '') {
                continue;
            }
            $total = $row['total'] ?? 0;
            $counts[(string) $id] = $asFloat ? (float) (string) $total : (int) $total;
        }

        return $counts;
    }
}
