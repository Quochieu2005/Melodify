<?php

use App\Http\Controllers\Api\CatalogController;
use App\Http\Controllers\Api\PasswordAuthController;
use App\Http\Controllers\Api\PhoneAuthController;
use App\Http\Controllers\Api\QrAuthController;
use App\Http\Controllers\Api\SocialAuthController;
use App\Http\Controllers\Api\SubscriptionPlanController;
use App\Http\Controllers\Api\VipCheckoutController;
use App\Http\Controllers\AudioController;
use App\Http\Controllers\VideoController;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

// API documentation is an internal admin tool. The `web` middleware is
// required here because the admin guard authenticates through the session.
Route::middleware(['web', 'auth:admin', 'admin.idle'])->group(function () {
    Route::get('/docs', function () {
        abort_unless(config('app.api_docs_enabled') || app()->environment('local'), 404);

        $response = response()->file(resource_path('api-docs/index.html'));
        $response->headers->set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
        $response->headers->set('Pragma', 'no-cache');

        return $response;
    })->name('api.docs');

    Route::get('/docs/openapi.json', function () {
        abort_unless(config('app.api_docs_enabled') || app()->environment('local'), 404);

        $response = response()->file(resource_path('api-docs/openapi.json'));
        $response->headers->set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
        $response->headers->set('Pragma', 'no-cache');

        return $response;
    })->name('api.docs.openapi');
});

Route::get('/health', function () {
    $database = 'not_configured';

    try {
        DB::connection('mongodb')->command(['ping' => 1]);
        $database = 'connected';
    } catch (Throwable) {
        $database = 'disconnected';
    }

    return response()->json([
        'status' => 'ok',
        'service' => 'melodify-api',
        'database' => $database,
        'timestamp' => now()->toISOString(),
    ]);
})->middleware('admin.timing');

Route::prefix('v1')->name('api.v1.')->middleware('admin.timing')->group(function () {
    Route::post('/auth/social', [SocialAuthController::class, 'login'])->name('auth.social');
    Route::post('/auth/login', [PasswordAuthController::class, 'login'])->name('auth.login');
    Route::post('/auth/password/forgot', [PasswordAuthController::class, 'requestPasswordReset'])
        ->middleware('throttle:5,1')
        ->name('auth.password.forgot');
    Route::post('/auth/password/verify-otp', [PasswordAuthController::class, 'verifyPasswordResetOtp'])
        ->middleware('throttle:10,1')
        ->name('auth.password.verify-otp');
    Route::post('/auth/password/reset', [PasswordAuthController::class, 'resetPassword'])
        ->middleware('throttle:5,1')
        ->name('auth.password.reset');
    Route::post('/auth/{provider}', [SocialAuthController::class, 'login'])
        ->whereIn('provider', ['google', 'facebook'])
        ->name('auth.provider');
    Route::post('/auth/phone/request-otp', [PhoneAuthController::class, 'requestOtp'])
        ->middleware('throttle:5,1')
        ->name('auth.phone.request-otp');
    Route::post('/auth/phone/verify', [PhoneAuthController::class, 'verify'])
        ->middleware('throttle:10,1')
        ->name('auth.phone.verify');
    Route::post('/auth/qr/start', [QrAuthController::class, 'start'])
        ->middleware('throttle:20,1')
        ->name('auth.qr.start');
    Route::get('/auth/qr/{sessionId}/status', [QrAuthController::class, 'status'])
        ->middleware('throttle:60,1')
        ->name('auth.qr.status');

    Route::middleware('api.user')->group(function () {
        Route::get('/auth/me', [SocialAuthController::class, 'me'])->name('auth.me');
        Route::post('/auth/logout', [SocialAuthController::class, 'logout'])->name('auth.logout');
        Route::post('/auth/qr/scan', [QrAuthController::class, 'scan'])
            ->middleware('throttle:20,1')
            ->name('auth.qr.scan');
        Route::post('/vip/checkout', [VipCheckoutController::class, 'store'])
            ->middleware('throttle:10,1')
            ->name('vip.checkout');
        Route::get('/vip/transactions', [VipCheckoutController::class, 'index'])
            ->name('vip.transactions.index');
    });

    Route::get('/topics', [CatalogController::class, 'topics'])->name('topics.index');
    Route::get('/topics/{slug}', [CatalogController::class, 'topic'])->name('topics.show');
    Route::get('/genres', [CatalogController::class, 'genres'])->name('genres.index');
    Route::get('/genres/{slug}', [CatalogController::class, 'genre'])->name('genres.show');
    Route::get('/banners', [CatalogController::class, 'banners'])->name('banners.index');
    Route::get('/banners/{slug}', [CatalogController::class, 'banner'])->name('banners.show');
    Route::get('/albums', [CatalogController::class, 'albums'])->name('albums.index');
    Route::post('/albums/{slug}/favorite', [CatalogController::class, 'toggleAlbumFavorite'])
        ->middleware('throttle:60,1')
        ->name('albums.favorite');
    Route::post('/albums/{slug}/share', [CatalogController::class, 'recordAlbumShare'])
        ->middleware('throttle:60,1')
        ->name('albums.share');
    Route::get('/albums/{slug}', [CatalogController::class, 'album'])->name('albums.show');
    Route::get('/artists', [CatalogController::class, 'artists'])->name('artists.index');
    Route::get('/artists/{slug}', [CatalogController::class, 'artist'])->name('artists.show');
    Route::get('/playlists', [CatalogController::class, 'playlists'])->name('playlists.index');
    Route::get('/playlists/{slug}', [CatalogController::class, 'playlist'])->name('playlists.show');
    Route::post('/playlists/{slug}/favorite', [CatalogController::class, 'togglePlaylistFavorite'])
        ->middleware('throttle:60,1')
        ->name('playlists.favorite');
    Route::post('/playlists/{slug}/share', [CatalogController::class, 'recordPlaylistShare'])
        ->middleware('throttle:60,1')
        ->name('playlists.share');
    Route::get('/charts', [CatalogController::class, 'charts'])->name('charts.index');
    Route::post('/charts/{slug}/share', [CatalogController::class, 'recordChartShare'])
        ->middleware('throttle:60,1')
        ->name('charts.share');
    Route::get('/charts/{slug}', [CatalogController::class, 'chart'])->name('charts.show');
    Route::get('/subscription-plans', [SubscriptionPlanController::class, 'index'])->name('subscription-plans.index');
    Route::get('/home/bootstrap', [CatalogController::class, 'homeBootstrap'])->name('home.bootstrap');
    Route::get('/home/discovery', [CatalogController::class, 'homeDiscovery'])->name('home.discovery');
    Route::get('/songs', [CatalogController::class, 'songs'])->name('songs.index');
    Route::get('/songs/popular', [CatalogController::class, 'popularSongs'])->name('songs.popular');
    Route::get('/favorites/songs', [CatalogController::class, 'favoriteSongs'])->name('favorites.songs');
    Route::get('/songs/external/{externalId}/audio', [AudioController::class, 'streamExternal'])->name('songs.external-audio');
    Route::get('/songs/{slug}/audio', [AudioController::class, 'stream'])
        ->middleware('api.user.optional')
        ->name('songs.audio');
    Route::post('/songs/{slug}/view', [CatalogController::class, 'recordSongView'])
        ->middleware('api.user.optional')
        ->name('songs.view');
    Route::post('/songs/{slug}/favorite', [CatalogController::class, 'toggleSongFavorite'])
        ->middleware('throttle:60,1')
        ->name('songs.favorite');
    Route::post('/songs/{slug}/share', [CatalogController::class, 'recordSongShare'])
        ->middleware('throttle:60,1')
        ->name('songs.share');
    Route::get('/songs/{slug}/lyrics', [CatalogController::class, 'lyrics'])->name('songs.lyrics');
    Route::get('/songs/{slug}', [CatalogController::class, 'song'])->name('songs.show');
    Route::get('/videos', [CatalogController::class, 'videos'])->name('videos.index');
    Route::get('/videos/{slug}/stream', [VideoController::class, 'stream'])->name('videos.stream');
    Route::get('/videos/{slug}', [CatalogController::class, 'video'])->name('videos.show');
});
