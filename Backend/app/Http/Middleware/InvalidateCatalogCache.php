<?php

namespace App\Http\Middleware;

use App\Support\CatalogRevision;
use Closure;
use Illuminate\Http\Request;
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
            CatalogRevision::bump();
        }

        return $response;
    }
}
