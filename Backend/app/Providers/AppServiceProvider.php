<?php

namespace App\Providers;

use App\Models\Topic;
use App\Models\Playlist;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\View;
use Throwable;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        /*
         * Render terminates TLS at its proxy and forwards the request to
         * Apache over HTTP. Force generated links and Vite assets to HTTPS
         * in production so the browser does not block them as mixed content.
         */
        if ($this->app->environment('production')) {
            URL::forceScheme('https');
        }

        View::composer('layouts.partials.sidebar.menu', function ($view): void {
            $loadCustomTypes = static function (string $model) {
                try {
                    return $model::query()
                        ->where('type', 'custom')
                        ->get()
                        ->pluck('type_custom')
                        ->map(fn ($type): string => trim((string) $type))
                        ->filter()
                        ->unique()
                        ->sort()
                        ->values();
                } catch (Throwable) {
                    // Sidebar vẫn hiển thị được nếu kho dữ liệu tạm thời không kết nối.
                    return collect();
                }
            };

            $view->with([
                'sidebarTopicCustomTypes' => $loadCustomTypes(Topic::class),
                'sidebarPlaylistCustomTypes' => $loadCustomTypes(Playlist::class),
            ]);
        });
    }
}
