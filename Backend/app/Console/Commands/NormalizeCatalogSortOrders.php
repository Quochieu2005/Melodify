<?php

namespace App\Console\Commands;

use App\Models\Playlist;
use App\Models\Topic;
use DateTimeInterface;
use Illuminate\Console\Command;
use Illuminate\Support\Collection;

class NormalizeCatalogSortOrders extends Command
{
    protected $signature = 'catalog:normalize-sort-orders {--dry-run : Show the changes without saving them}';

    protected $description = 'Normalize playlist and topic display orders independently inside each group';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $playlistChanges = $this->normalize(Playlist::query()->get(), false, $dryRun);
        $topicChanges = $this->normalize(Topic::query()->get(), true, $dryRun);
        $mode = $dryRun ? 'would be updated' : 'updated';

        $this->info("Playlists: {$playlistChanges} sort order(s) {$mode}.");
        $this->info("Topics: {$topicChanges} sort order(s) {$mode}.");

        return self::SUCCESS;
    }

    /**
     * @param Collection<int, Playlist|Topic> $items
     */
    private function normalize(Collection $items, bool $isTopic, bool $dryRun): int
    {
        $changes = 0;

        foreach ($items->groupBy(fn ($item): string => $this->groupKey($item, $isTopic)) as $groupItems) {
            $ordered = $groupItems->sort(function ($left, $right): int {
                $sortComparison = ((int) ($left->sort_order ?? 0)) <=> ((int) ($right->sort_order ?? 0));

                if ($sortComparison !== 0) {
                    return $sortComparison;
                }

                $createdComparison = $this->timestamp($left->created_at ?? null) <=> $this->timestamp($right->created_at ?? null);

                if ($createdComparison !== 0) {
                    return $createdComparison;
                }

                return strcmp((string) $left->getKey(), (string) $right->getKey());
            })->values();

            foreach ($ordered as $index => $item) {
                $nextOrder = $index + 1;
                $customType = ($item->type ?? null) === 'custom'
                    ? trim((string) ($item->type_custom ?? ''))
                    : null;
                $customTypeChanged = $customType !== null && $customType !== (string) ($item->type_custom ?? '');

                if ((int) ($item->sort_order ?? 0) === $nextOrder && ! $customTypeChanged) {
                    continue;
                }

                $changes++;

                if (! $dryRun) {
                    $item->sort_order = $nextOrder;
                    if ($customTypeChanged) {
                        $item->type_custom = $customType;
                    }
                    $item->save();
                }
            }
        }

        return $changes;
    }

    private function groupKey(Playlist|Topic $item, bool $isTopic): string
    {
        $type = trim((string) ($item->type ?? ''));

        if ($type === 'custom') {
            return 'custom:'.trim((string) ($item->type_custom ?? ''));
        }

        // Older topics without a type belong to the normal topic group.
        if ($isTopic && $type === '') {
            return 'topic';
        }

        return $type !== '' ? $type : 'default';
    }

    private function timestamp(mixed $value): int
    {
        if ($value instanceof DateTimeInterface) {
            return $value->getTimestamp();
        }

        return $value ? (strtotime((string) $value) ?: 0) : 0;
    }
}
