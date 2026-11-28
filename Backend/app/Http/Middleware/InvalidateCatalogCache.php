<?php

namespace App\Http\Middleware;

use App\Http\Controllers\Api\CatalogController;
use App\Support\CatalogRevision;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

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

            // The home screens cost about 40 queries to build and are keyed by this revision, so the first visitor
            // after every edit used to pay for it. Build them once the admin's response has been sent.
            defer(function (): void {
                try {
                    $catalog = app(CatalogController::class);
                    $catalog->homeBootstrap();
                    $catalog->homeDiscovery();
                } catch (Throwable $exception) {
                    report($exception);
                }
            });
        }

        return $response;
    }
}
