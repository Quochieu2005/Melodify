<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\File;

abstract class TestCase extends BaseTestCase
{
    private string $isolatedCacheDirectory;

    protected function setUp(): void
    {
        parent::setUp();
        $this->isolatedCacheDirectory = storage_path('framework/testing/cache-'.bin2hex(random_bytes(8)));
        File::ensureDirectoryExists($this->isolatedCacheDirectory);
        config([
            'cache.stores.file.path' => $this->isolatedCacheDirectory,
            'cache.stores.file.lock_path' => $this->isolatedCacheDirectory,
        ]);
        // Catalog endpoints explicitly use the file store even under PHPUnit's
        // CACHE_STORE=array. Never let those fixtures populate the live cache.
        Cache::forgetDriver('file');
    }

    protected function tearDown(): void
    {
        try {
            $directory = realpath($this->isolatedCacheDirectory);
            $parent = realpath(storage_path('framework/testing'));
            if ($directory !== false && $parent !== false
                && dirname($directory) === $parent
                && preg_match('/^cache-[a-f0-9]{16}$/', basename($directory))) {
                File::deleteDirectory($directory);
            }
        } finally {
            parent::tearDown();
        }
    }
}
