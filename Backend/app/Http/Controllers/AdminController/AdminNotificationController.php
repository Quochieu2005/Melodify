<?php

namespace App\Http\Controllers\AdminController;

use App\Http\Controllers\Controller;
use App\Models\AdminNotification;
use App\Services\AdminNotificationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\View\View;

class AdminNotificationController extends Controller
{
    public function index(AdminNotificationService $notificationService): View
    {
        $admin = auth('admin')->user();
        $notificationService->syncFor($admin);
        $query = AdminNotification::query()->where('admin_id', (string) $admin->getKey());
        $notifications = $query->latest()->paginate(20)->withQueryString();
        $unreadCount = AdminNotification::query()
            ->where('admin_id', (string) $admin->getKey())
            ->where('is_read', false)
            ->count();

        return view('Admin.notifications.index', compact('notifications', 'unreadCount'));
    }

    public function markAllRead(): RedirectResponse
    {
        $adminId = (string) auth('admin')->id();
        $notifications = AdminNotification::query()
            ->where('admin_id', $adminId)
            ->where('is_read', false)
            ->get();

        foreach ($notifications as $notification) {
            $notification->forceFill([
                'is_read' => true,
                'read_at' => now(),
            ])->save();
        }

        return back()->with('success', 'Đã đánh dấu tất cả thông báo là đã đọc.');
    }
}
