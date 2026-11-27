<?php

namespace App\Console\Commands;

use App\Services\Search\AtlasSearch;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use MongoDB\Driver\Exception\CommandException;

class CreateSearchIndexes extends Command
{
    protected $signature = 'search:indexes {--wait : Wait until every index is queryable}';

    protected $description = 'Create the Atlas Search indexes used by /api/v1/search';

    public function handle(): int
    {
        $database = DB::connection('mongodb')->getDatabase();
        $name = (string) config('search.index');

        foreach (config('search.collections') as $collection => $fields) {
            $target = $database->selectCollection($collection);
            $existing = collect(iterator_to_array($target->listSearchIndexes(['name' => $name]), false));
            if ($existing->isEmpty()) {
                try {
                    $target->createSearchIndex(AtlasSearch::definition($fields), ['name' => $name]);
                    $this->info("Created search index on {$collection}");
                } catch (CommandException $exception) {
                    // Free Atlas tiers allow only a few search indexes; that collection keeps using regex.
                    $this->warn("Skipped {$collection}: {$exception->getMessage()}");
                }
            } else {
                $this->line("Search index already exists on {$collection}");
            }
        }

        if ($this->option('wait')) {
            $deadline = now()->addMinutes(3);
            foreach (config('search.collections') as $collection => $fields) {
                $target = $database->selectCollection($collection);
                while (now()->lt($deadline)) {
                    $index = collect(iterator_to_array($target->listSearchIndexes(['name' => $name]), false))->first();
                    if (! $index) {
                        break; // not created (e.g. index limit), nothing to wait for
                    }
                    if ($index['queryable'] ?? false) {
                        $this->info("{$collection}: ready");
                        break;
                    }
                    sleep(3);
                }
            }
        }

        return self::SUCCESS;
    }
}
