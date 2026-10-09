<?php

use App\Http\Controllers\Api\CatalogController;
use App\Http\Controllers\AudioController;
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
});

Route::prefix('v1')->name('api.v1.')->group(function () {
    Route::get('/topics', [CatalogController::class, 'topics'])->name('topics.index');
    Route::get('/topics/{slug}', [CatalogController::class, 'topic'])->name('topics.show');
    Route::get('/genres', [CatalogController::class, 'genres'])->name('genres.index');
    Route::get('/genres/{slug}', [CatalogController::class, 'genre'])->name('genres.show');
    Route::get('/banners', [CatalogController::class, 'banners'])->name('banners.index');
    Route::get('/banners/{slug}', [CatalogController::class, 'banner'])->name('banners.show');
    Route::get('/albums', [CatalogController::class, 'albums'])->name('albums.index');
    Route::get('/albums/{slug}', [CatalogController::class, 'album'])->name('albums.show');
    Route::get('/artists', [CatalogController::class, 'artists'])->name('artists.index');
    Route::get('/artists/{slug}', [CatalogController::class, 'artist'])->name('artists.show');
    Route::get('/playlists', [CatalogController::class, 'playlists'])->name('playlists.index');
    Route::get('/playlists/{slug}', [CatalogController::class, 'playlist'])->name('playlists.show');
    Route::get('/songs', [CatalogController::class, 'songs'])->name('songs.index');
    Route::get('/songs/popular', [CatalogController::class, 'popularSongs'])->name('songs.popular');
    Route::get('/songs/external/{externalId}/audio', [AudioController::class, 'streamExternal'])->name('songs.external-audio');
    Route::get('/songs/{slug}/audio', [AudioController::class, 'stream'])->name('songs.audio');
    Route::post('/songs/{slug}/view', [CatalogController::class, 'recordSongView'])->name('songs.view');
    Route::post('/songs/{slug}/favorite', [CatalogController::class, 'toggleSongFavorite'])->name('songs.favorite');
    Route::post('/songs/{slug}/share', [CatalogController::class, 'recordSongShare'])->name('songs.share');
    Route::get('/songs/{slug}/lyrics', [CatalogController::class, 'lyrics'])->name('songs.lyrics');
    Route::get('/songs/{slug}', [CatalogController::class, 'song'])->name('songs.show');
});
