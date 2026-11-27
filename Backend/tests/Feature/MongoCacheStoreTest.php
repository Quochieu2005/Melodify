<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class MongoCacheStoreTest extends TestCase
{
    private string $prefix;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prefix = 'test_cache_'.bin2hex(random_bytes(8)).'_';
        config(['database.connections.mongodb.prefix' => $this->prefix]);
        DB::purge('mongodb');
        Cache::forgetDriver('mongodb');
    }

    protected function tearDown(): void
    {
        try {
            $connection = DB::connection('mongodb');
            if ($connection->getTablePrefix() === $this->prefix && preg_match('/^test_cache_[a-f0-9]{16}_$/', $this->prefix)) {
                foreach (['cache', 'cache_locks'] as $collection) {
                    $connection->getCollection($collection)->drop();
                }
            }
            DB::purge('mongodb');
        } finally {
            parent::tearDown();
        }
    }

    public function test_mongodb_store_is_configured_and_holds_locks_shared_between_callers(): void
    {
        $this->assertSame('mongodb', config('cache.stores.mongodb.driver'));
        $store = Cache::store('mongodb');

        $first = $store->lock('payment-test', 30);
        $this->assertTrue($first->get());
        $this->assertFalse($store->lock('payment-test', 30)->get(), 'a second caller must not get the same lock');

        $first->release();
        $this->assertTrue($store->lock('payment-test', 30)->get());
    }

    public function test_mongodb_store_add_is_atomic_and_values_expire(): void
    {
        $store = Cache::store('mongodb');

        $this->assertTrue($store->add('otp-attempt', 1, 60));
        $this->assertFalse($store->add('otp-attempt', 2, 60));
        $this->assertSame(1, $store->get('otp-attempt'));

        $this->travel(61)->seconds();
        $this->assertNull($store->get('otp-attempt'));
    }
}
