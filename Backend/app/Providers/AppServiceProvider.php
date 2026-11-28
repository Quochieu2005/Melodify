<?php

namespace App\Providers;

use App\Models\AdminNotification;
use App\Models\Playlist;
use App\Models\Topic;
use App\Models\User;
use App\Services\AdminNotificationService;
use App\Services\CatalogGroupService;
use Illuminate\Auth\Events\Login;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\View;
use Illuminate\Support\ServiceProvider;
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
            try {
                $groups = app(CatalogGroupService::class);
                $view->with([
                    'sidebarTopicCustomTypes' => $groups->customTypeNames(Topic::class),
                    'sidebarPlaylistCustomTypes' => $groups->customTypeNames(Playlist::class),
                ]);
            } catch (Throwable) {
                // Sidebar vẫn hiển thị được nếu kho dữ liệu tạm thời không kết nối.
                $view->with(['sidebarTopicCustomTypes' => collect(), 'sidebarPlaylistCustomTypes' => collect()]);
            }
        });

        View::composer('layouts.partials.header.notifications', function ($view): void {
            $admin = auth('admin')->user();

            if ($admin === null) {
                $view->with(['headerNotifications' => collect(), 'headerUnreadCount' => 0]);

                return;
            }

            try {
                $adminId = (string) $admin->getKey();
                // Notification definitions are snapshots, not request data. Rebuild them at most every 30 seconds,
                // after the response has been sent, so the page never waits for the counting queries. The throttle is
                // per server (file cache): an Atlas round trip just to read it would be paid on every page view.
                if (Cache::store('file')->add("admin-notifications-sync:{$adminId}", true, 30)) {
                    defer(fn () => app(AdminNotificationService::class)->syncFor($admin));
                }
                $header = Cache::store('file')->remember(
                    AdminNotificationService::headerCacheKey($adminId),
                    now()->addSeconds(10),
                    fn (): array => [
                        'notifications' => AdminNotification::query()
                            ->where('admin_id', $adminId)
                            ->latest()
                            ->limit(6)
                            ->get()
                            ->toArray(),
                        'unread_count' => AdminNotification::query()
                            ->where('admin_id', $adminId)
                            ->where('is_read', false)
                            ->count(),
                    ],
                );
                $notifications = AdminNotification::hydrate($header['notifications'] ?? []);
                $unreadCount = (int) ($header['unread_count'] ?? 0);
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
