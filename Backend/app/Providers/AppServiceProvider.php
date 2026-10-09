<?php

namespace App\Providers;

use App\Models\User;
use App\Models\Topic;
use App\Models\Playlist;
use App\Models\AdminNotification;
use App\Services\AdminNotificationService;
use Illuminate\Auth\Events\Login;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Event;
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
        Event::listen(Login::class, function (Login $event): void {
            if ($event->guard !== 'web' || ! $event->user instanceof User) {
                return;
            }

            $event->user->forceFill([
                'last_login_at' => now(),
                'last_login_method' => 'password',
            ])->saveQuietly();
        });

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
                    return collect(Cache::remember(
                        'sidebar-custom-types:'.md5($model),
                        now()->addMinutes(5),
                        fn (): array => $model::query()
                            ->where('type', 'custom')
                            ->get()
                            ->pluck('type_custom')
                            ->map(fn ($type): string => trim((string) $type))
                            ->filter()
                            ->unique()
                            ->sort()
                            ->values()
                            ->all(),
                    ));
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

        View::composer('layouts.partials.header.notifications', function ($view): void {
            $admin = auth('admin')->user();

            if ($admin === null) {
                $view->with(['headerNotifications' => collect(), 'headerUnreadCount' => 0]);

                return;
            }

            try {
                $adminId = (string) $admin->getKey();
                // Notification definitions are snapshots, not request data.
                // Avoid rebuilding them on every page navigation while still
                // refreshing often enough for the admin header.
                Cache::remember(
                    "admin-notifications-sync:{$adminId}",
                    now()->addSeconds(30),
                    function () use ($admin): bool {
                        app(AdminNotificationService::class)->syncFor($admin);

                        return true;
                    },
                );
                // Keep the short-lived sync cache above, but query the models
                // directly here. Eloquent models must not be serialized into
                // the database cache store because they can come back as
                // strings when serializable classes are disabled.
                $notifications = AdminNotification::query()
                    ->where('admin_id', $adminId)
                    ->latest()
                    ->limit(6)
                    ->get();
                $unreadCount = AdminNotification::query()
                    ->where('admin_id', $adminId)
                    ->where('is_read', false)
                    ->count();
            } catch (Throwable) {
                $notifications = collect();
                $unreadCount = 0;
            }

            $view->with([
                'headerNotifications' => $notifications,
                'headerUnreadCount' => $unreadCount,
            ]);
        });
    }
}
