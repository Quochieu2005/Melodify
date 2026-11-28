<?php

namespace Tests\Feature;

use Illuminate\Cache\RateLimiter;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class RateLimiterStoreTest extends TestCase
{
    public function test_rate_limit_counters_use_the_local_file_store_by_default(): void
    {
        $this->assertSame('file', config('cache.limiter'));
    }

    public function test_a_throttled_route_still_blocks_after_its_limit(): void
    {
        Route::get('/__limited', fn () => 'ok')->middleware('throttle:3,1,limiter-store-test');
        app(RateLimiter::class)->clear('limiter-store-test');

        foreach (range(1, 3) as $ignored) {
            $this->get('/__limited')->assertOk();
        }

        $this->get('/__limited')->assertStatus(429);
    }
}
