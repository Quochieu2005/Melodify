<?php

$groups = [
    'admin.manage' => [
        'label' => 'Thêm, sửa, xóa toàn bộ trong Admin',
        'description' => 'Toàn bộ Banner, nội dung, người dùng, gói và kiểm duyệt; không bao gồm Quản trị viên.',
    ],
    'banners.manage' => [
        'label' => 'Banner',
        'description' => 'Quản lý banner hiển thị trên Melodify.',
        'hidden' => true,
    ],
    'content.manage' => [
        'label' => 'Nội dung âm nhạc',
        'description' => 'Bài hát, album, chủ đề, thể loại, playlist và nghệ sĩ.',
    ],
    'users.manage' => [
        'label' => 'Người dùng',
        'description' => 'Xem, sửa và khóa tài khoản người dùng đã đăng ký.',
    ],
    'billing.manage' => [
        'label' => 'Gói và thanh toán',
        'description' => 'Gói đăng ký và lịch sử giao dịch.',
    ],
    'moderation.manage' => [
        'label' => 'Kiểm duyệt',
        'description' => 'Bình luận và báo cáo vi phạm.',
    ],
];

// Giữ nhóm quyền cũ để các tài khoản đã được cấp quyền trước đây không bị mất quyền.
$resourceGroups = [
    'banners' => 'banners.manage',
    'songs' => 'content.manage',
    'albums' => 'content.manage',
    'topics' => 'content.manage',
    'genres' => 'content.manage',
    'playlists' => 'content.manage',
    'artists' => 'content.manage',
    'users' => 'users.manage',
    'subscriptions' => 'billing.manage',
    'payments' => 'billing.manage',
    'comments' => 'moderation.manage',
    'reports' => 'moderation.manage',
];

$sections = [
    'banners' => [
        'label' => 'Banner',
        'description' => 'Hình ảnh nổi bật và vị trí hiển thị.',
        'permission_group' => 'banners.manage',
        'actions' => ['create' => 'Thêm', 'update' => 'Sửa', 'delete' => 'Xóa'],
    ],
    'songs' => [
        'label' => 'Bài hát',
        'description' => 'Danh sách bài hát trong kho nhạc.',
        'permission_group' => 'content.manage',
        'actions' => ['create' => 'Thêm', 'update' => 'Sửa', 'delete' => 'Xóa'],
    ],
    'albums' => [
        'label' => 'Album',
        'description' => 'Album và nghệ sĩ của album.',
        'permission_group' => 'content.manage',
        'actions' => ['create' => 'Thêm', 'update' => 'Sửa', 'delete' => 'Xóa'],
    ],
    'topics' => [
        'label' => 'Chủ đề',
        'description' => 'Chủ đề nội dung âm nhạc.',
        'permission_group' => 'content.manage',
        'actions' => ['create' => 'Thêm', 'update' => 'Sửa', 'delete' => 'Xóa'],
    ],
    'genres' => [
        'label' => 'Thể loại',
        'description' => 'Thể loại của bài hát và album.',
        'permission_group' => 'content.manage',
        'actions' => ['create' => 'Thêm', 'update' => 'Sửa', 'delete' => 'Xóa'],
    ],
    'playlists' => [
        'label' => 'Playlist',
        'description' => 'Playlist được quản lý trong hệ thống.',
        'permission_group' => 'content.manage',
        'actions' => ['create' => 'Thêm', 'update' => 'Sửa', 'delete' => 'Xóa'],
    ],
    'artists' => [
        'label' => 'Nghệ sĩ',
        'description' => 'Thông tin và ảnh đại diện nghệ sĩ.',
        'permission_group' => 'content.manage',
        'actions' => ['create' => 'Thêm', 'update' => 'Sửa', 'delete' => 'Xóa'],
    ],
    'users' => [
        'label' => 'Người dùng',
        'description' => 'Tài khoản đã đăng ký; hệ thống không có chức năng Admin tạo mới.',
        'permission_group' => 'users.manage',
        'actions' => ['update' => 'Sửa', 'delete' => 'Xóa'],
    ],
    'subscriptions' => [
        'label' => 'Gói đăng ký',
        'description' => 'Các gói Premium và trạng thái gói.',
        'permission_group' => 'billing.manage',
        'actions' => ['create' => 'Thêm', 'update' => 'Sửa', 'delete' => 'Xóa'],
    ],
    'comments' => [
        'label' => 'Bình luận',
        'description' => 'Ẩn/hiện hoặc xóa bình luận người dùng.',
        'permission_group' => 'moderation.manage',
        'actions' => ['update' => 'Sửa', 'delete' => 'Xóa'],
    ],
    'reports' => [
        'label' => 'Báo cáo vi phạm',
        'description' => 'Cập nhật trạng thái báo cáo.',
        'permission_group' => 'moderation.manage',
        'actions' => ['update' => 'Sửa'],
    ],
];

$permissionKeys = array_keys($groups);
foreach ($sections as $resource => $section) {
    $permissionKeys[] = "{$resource}.manage";
    foreach (array_keys($section['actions']) as $action) {
        $permissionKeys[] = "{$resource}.{$action}";
    }
}

return [
    'groups' => $groups,
    'resource_groups' => $resourceGroups,
    'sections' => $sections,
    'permission_keys' => array_values(array_unique($permissionKeys)),
];
