<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class InvalidateCatalogCache
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if (! $request->isMethodSafe()
            && $request->routeIs('admin.songs.*', 'admin.uploads.review.*', 'admin.albums.*', 'admin.artists.*', 'admin.playlists.*', 'admin.genres.*', 'admin.topics.*', 'admin.banners.*', 'admin.videos.*', 'admin.subscriptions.*')
            && $response->getStatusCode() < 400
            && ! $request->session()->has('errors')) {
            // Includes single, bulk and delete-all mutations. All catalog
            // consumers use this revision, not just the song detail page.
            Cache::store('file')->forever('api:catalog-content-revision:v1', (string) Str::uuid());
        }

        return $response;
    }
}
