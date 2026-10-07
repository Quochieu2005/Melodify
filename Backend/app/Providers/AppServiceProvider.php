<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\URL;

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
    }
}
