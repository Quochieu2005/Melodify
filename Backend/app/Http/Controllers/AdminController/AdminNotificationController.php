<?php

namespace App\Http\Controllers\AdminController;

use App\Http\Controllers\Controller;
use App\Models\AdminNotification;
use App\Services\AdminNotificationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\View\View;

class AdminNotificationController extends Controller
{
    public function index(AdminNotificationService $notificationService): View
    {
        $admin = auth('admin')->user();
        $adminId = (string) $admin->getKey();
        Cache::remember(
            "admin-notifications-sync:{$adminId}",
            now()->addSeconds(30),
            function () use ($notificationService, $admin): bool {
                $notificationService->syncFor($admin);

                return true;
            },
        );
        $query = AdminNotification::query()->where('admin_id', $adminId);
        $notifications = $query->latest()->paginate(20)->withQueryString();
        $unreadCount = AdminNotification::query()
            ->where('admin_id', $adminId)
            ->where('is_read', false)
            ->count();

        return view('Admin.notifications.index', compact('notifications', 'unreadCount'));
    }

    public function markAllRead(): RedirectResponse
    {
        $adminId = (string) auth('admin')->id();
        AdminNotification::query()
            ->where('admin_id', $adminId)
            ->where('is_read', false)
            ->update(['is_read' => true, 'read_at' => now()]);
        Cache::store('file')->forget(AdminNotificationService::headerCacheKey($adminId));

        return back()->with('success', 'Đã đánh dấu tất cả thông báo là đã đọc.');
    }
}
