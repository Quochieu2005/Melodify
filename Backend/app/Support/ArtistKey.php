<?php

namespace App\Support;

use Illuminate\Support\Str;

final class ArtistKey
{
    /** Lower-case ASCII letters and digits only, so "Sơn Tùng M-TP" and "son tung mtp" share one key. */
    public static function make(string $name): string
    {
        return preg_replace('/[^a-z0-9]+/', '', Str::lower(Str::ascii($name))) ?? '';
    }
}
