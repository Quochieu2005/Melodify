<?php

use App\Http\Controllers\Api\CatalogController;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

Route::get('/docs', function () {
    abort_unless(config('app.api_docs_enabled') || app()->environment('local'), 404);

    $response = response()->file(resource_path('api-docs/index.html'));
    $response->headers->set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    $response->headers->set('Pragma', 'no-cache');

    return $response;
});

Route::get('/docs/openapi.json', function () {
    abort_unless(config('app.api_docs_enabled') || app()->environment('local'), 404);

    $response = response()->file(resource_path('api-docs/openapi.json'));
    $response->headers->set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    $response->headers->set('Pragma', 'no-cache');

    return $response;
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
    Route::get('/topics/{topic}', [CatalogController::class, 'topic'])->name('topics.show');
    Route::get('/genres', [CatalogController::class, 'genres'])->name('genres.index');
    Route::get('/genres/{genre}', [CatalogController::class, 'genre'])->name('genres.show');
    Route::get('/banners', [CatalogController::class, 'banners'])->name('banners.index');
    Route::get('/banners/{banner}', [CatalogController::class, 'banner'])->name('banners.show');
    Route::get('/albums', [CatalogController::class, 'albums'])->name('albums.index');
    Route::get('/albums/{album}', [CatalogController::class, 'album'])->name('albums.show');
    Route::get('/artists', [CatalogController::class, 'artists'])->name('artists.index');
    Route::get('/artists/{artist}', [CatalogController::class, 'artist'])->name('artists.show');
});
