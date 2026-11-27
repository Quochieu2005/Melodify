<?php

namespace Tests\Feature\Api;

use App\Models\Song;
use App\Services\Search\AtlasSearch;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class SearchFallbackTest extends TestCase
{
    private string $prefix;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prefix = 'test_search_'.bin2hex(random_bytes(8)).'_';
        config(['database.connections.mongodb.prefix' => $this->prefix]);
        DB::purge('mongodb');
        Cache::store('file')->forget('search:index-ready:'.hash('sha256', 'songs|'.$this->prefix));
    }

    protected function tearDown(): void
    {
        try {
            $connection = DB::connection('mongodb');
            if ($connection->getTablePrefix() === $this->prefix && preg_match('/^test_search_[a-f0-9]{16}_$/', $this->prefix)) {
                $connection->getCollection('songs')->drop();
            }
            DB::purge('mongodb');
        } finally {
            parent::tearDown();
        }
    }

    public function test_driver_off_means_regex_and_no_atlas_ids(): void
    {
        config(['search.driver' => 'regex']);

        $this->assertNull(app(AtlasSearch::class)->ids(Song::class, 'anything'));
    }

    public function test_atlas_driver_without_a_ready_index_falls_back_to_regex_instead_of_returning_nothing(): void
    {
        Song::query()->create(['title' => 'Fallback Melody', 'slug' => 'fallback-melody', 'status' => 'published']);
        config(['search.driver' => 'atlas']);

        // The temporary test collection has no search index, so ids() must say "use the fallback".
        $this->assertNull(app(AtlasSearch::class)->ids(Song::class, 'Fallback'));
        $this->getJson('/api/v1/search?q=Fallback&type=song')
            ->assertOk()
            ->assertJsonPath('data.song.0.title', 'Fallback Melody');
    }

    public function test_index_definition_is_accent_insensitive_autocomplete_on_every_field(): void
    {
        $definition = AtlasSearch::definition(['title', 'slug']);

        $this->assertFalse($definition['mappings']['dynamic']);
        foreach (['title', 'slug'] as $field) {
            $this->assertSame('autocomplete', $definition['mappings']['fields'][$field]['type']);
            $this->assertTrue($definition['mappings']['fields'][$field]['foldDiacritics']);
        }
    }
}
