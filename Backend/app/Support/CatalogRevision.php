<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

final class CatalogRevision
{
    public const KEY = 'api:catalog-content-revision:v1';

    /** Every catalog cache key includes this revision, so changing it invalidates them all. */
    public static function bump(): void
    {
        Cache::store('file')->forever(self::KEY, (string) Str::uuid());
    }
}
