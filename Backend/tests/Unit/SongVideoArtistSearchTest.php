<?php

namespace Tests\Unit;

use App\Http\Controllers\AdminController\SongVideoController;
use PHPUnit\Framework\Attributes\CoversClass;
use ReflectionMethod;
use Tests\TestCase;

#[CoversClass(SongVideoController::class)]
class SongVideoArtistSearchTest extends TestCase
{
    public function test_search_pattern_matches_vietnamese_diacritics_and_is_case_insensitive(): void
    {
        $controller = new SongVideoController;
        $normalize = new ReflectionMethod($controller, 'normalizedArtistName');
        $patternBuilder = new ReflectionMethod($controller, 'artistNameRegex');
        $normalized = $normalize->invoke($controller, 'son tung m-tp');
        $pattern = $patternBuilder->invoke($controller, $normalized, exact: true);

        $this->assertSame(1, preg_match($pattern, 'Sơn Tùng M-TP'));
        $this->assertSame(1, preg_match($pattern, 'SON TUNG M-TP'));
        $this->assertSame(0, preg_match($pattern, 'Sơn Tùng'));
    }

    public function test_search_pattern_matches_d_with_stroke(): void
    {
        $controller = new SongVideoController;
        $normalize = new ReflectionMethod($controller, 'normalizedArtistName');
        $patternBuilder = new ReflectionMethod($controller, 'artistNameRegex');
        $normalized = $normalize->invoke($controller, 'dinh phong');
        $pattern = $patternBuilder->invoke($controller, $normalized, exact: true);

        $this->assertSame(1, preg_match($pattern, 'Đình Phong'));
    }
}
