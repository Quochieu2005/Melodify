<?php

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

Route::get('/docs', function () {
    abort_unless(config('app.api_docs_enabled'), 404);

    return response()->file(resource_path('api-docs/index.html'));
});

Route::get('/docs/openapi.json', function () {
    abort_unless(config('app.api_docs_enabled'), 404);

    return response()->file(resource_path('api-docs/openapi.json'));
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
