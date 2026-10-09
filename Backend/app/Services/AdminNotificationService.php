<?php

namespace App\Services;

use App\Models\Admin;
use App\Models\AdminNotification;
use App\Models\Payment;
use App\Models\Song;
use App\Models\User;

class AdminNotificationService
{
    public function syncFor(Admin $admin): void
    {
        $adminId = (string) $admin->getKey();
        $today = now()->format('Y-m-d');
        $draftSongCount = Song::query()->where('status', 'draft')->count();
        $newUserCount = User::query()->where('created_at', '>=', now()->subDay())->count();
        $pendingPaymentCount = Payment::query()->whereIn('status', ['pending', 'processing'])->count();

        $definitions = [
            [
                'key' => "draft-songs:{$today}",
                'type' => 'song',
                'title' => $draftSongCount.' bài hát mới',
                'body' => $draftSongCount > 0 ? 'Đang chờ bạn duyệt vào kho nhạc.' : 'Không có bài hát nào đang chờ duyệt.',
                'action_url' => '/admin/songs',
                'active' => $draftSongCount > 0,
            ],
            [
                'key' => "new-users:{$today}",
                'type' => 'user',
                'title' => $newUserCount.' người dùng mới đăng ký',
                'body' => $newUserCount > 0 ? 'Có hoạt động mới trong hệ thống.' : 'Chưa có người dùng mới trong 24 giờ qua.',
                'action_url' => '/admin/users',
                'active' => $newUserCount > 0,
            ],
            [
                'key' => "pending-payments:{$today}",
                'type' => 'payment',
                'title' => $pendingPaymentCount.' thanh toán cần kiểm tra',
                'body' => $pendingPaymentCount > 0 ? 'Có giao dịch đang chờ xử lý.' : 'Không có thanh toán nào đang chờ xử lý.',
                'action_url' => '/admin/payments',
                'active' => $pendingPaymentCount > 0,
            ],
            [
                'key' => "system-health:{$today}",
                'type' => 'system',
                'title' => 'Hệ thống ổn định',
                'body' => 'Tất cả dịch vụ đang hoạt động bình thường.',
                'action_url' => '/admin/dashboard',
                'active' => true,
            ],
        ];

        foreach ($definitions as $definition) {
            if (! $definition['active']) {
                continue;
            }

            $notification = AdminNotification::query()
                ->where('admin_id', $adminId)
                ->where('key', $definition['key'])
                ->first();

            if ($notification === null) {
                AdminNotification::query()->create([
                    'admin_id' => $adminId,
                    'key' => $definition['key'],
                    'type' => $definition['type'],
                    'title' => $definition['title'],
                    'body' => $definition['body'],
                    'action_url' => $definition['action_url'],
                    'is_read' => false,
                    'read_at' => null,
                ]);
                continue;
            }

            $changed = (string) $notification->body !== (string) $definition['body'];
            $notification->forceFill([
                'type' => $definition['type'],
                'title' => $definition['title'],
                'body' => $definition['body'],
                'action_url' => $definition['action_url'],
                ...($changed ? ['is_read' => false, 'read_at' => null] : []),
            ])->save();
        }
    }
}
