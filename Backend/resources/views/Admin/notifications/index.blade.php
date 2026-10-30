@extends('layouts.admin')

@section('content')
<section class="admin-page admin-notifications-page">
    <div class="admin-page-header">
        <div class="admin-page-header-main">
            <p class="admin-page-kicker">Melodify / Trung tâm</p>
            <h1 class="admin-page-title">Thông báo</h1>
            <p class="admin-page-description">Theo dõi các hoạt động cần chú ý trong hệ thống.</p>
        </div>
        @if($unreadCount > 0)
            <form method="POST" action="{{ route('admin.notifications.read-all') }}">
                @csrf
                @method('PATCH')
                <button type="submit" class="ant-btn">Đánh dấu đã đọc</button>
            </form>
        @endif
    </div>

    <div class="ant-card admin-notifications-page-card">
        <div class="admin-table-toolbar">
            <div><strong>Tất cả thông báo</strong><span>{{ $notifications->total() }} mục</span></div>
            @if($unreadCount > 0)<span class="admin-notifications-unread-count">{{ $unreadCount }} chưa đọc</span>@else<span class="admin-table-hint">Bạn đã xem hết thông báo.</span>@endif
        </div>
        <div class="admin-notification-page-list">
            @forelse($notifications as $notification)
                @php($icon = match($notification->type) { 'song' => 'sound', 'user' => 'user', 'payment' => 'credit-card', default => 'setting' })
                <a href="{{ filled($notification->action_url) ? url($notification->action_url) : route('admin.notifications.index') }}" class="notification-item admin-notification-page-item {{ $notification->is_read ? '' : 'is-unread' }}">
                    <span class="notification-icon"><x-anticon :name="$icon" /></span>
                    <span class="notification-body">
                        <span class="notification-top"><strong>{{ $notification->title }}</strong><small class="notification-time">{{ $notification->created_at?->diffForHumans() ?? '—' }}</small></span>
                        <small class="notification-desc">{{ $notification->body }}</small>
                    </span>
                    @unless($notification->is_read)<span class="notification-unread-dot"></span>@endunless
                </a>
            @empty
                <div class="admin-empty-state"><span class="admin-empty-icon">✓</span><strong>Chưa có thông báo</strong><span>Các hoạt động cần chú ý sẽ xuất hiện tại đây.</span></div>
            @endforelse
        </div>
        @if($notifications->hasPages())<div class="admin-pagination">{{ $notifications->links() }}</div>@endif
    </div>
</section>
@endsection
