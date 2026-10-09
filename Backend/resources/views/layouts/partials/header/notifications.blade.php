<div class="ant-dropdown-trigger-container admin-dropdown-container" data-dropdown-scope>
    <button 
        type="button" 
        class="ant-btn ant-btn-text ant-btn-circle admin-icon-btn admin-notification-btn" 
        data-dropdown-trigger="notifications" 
        aria-expanded="false" 
        aria-label="Thông báo"
        title="Thông báo"
    >
        <span class="ant-badge admin-badge-container">
            <x-anticon name="bell" />
            @if(($headerUnreadCount ?? 0) > 0)<sup class="ant-badge-dot admin-notification-dot"></sup>@endif
        </span>
    </button>

    <div class="ant-dropdown admin-dropdown-menu-wrapper admin-notifications-dropdown" data-dropdown-target="notifications" hidden>
        <div class="notification-panel">
            <div class="notification-panel-header">
                <strong>Thông báo</strong>
                @if(($headerUnreadCount ?? 0) > 0)
                    <form method="POST" action="{{ route('admin.notifications.read-all') }}" class="admin-mark-read-form">
                        @csrf
                        @method('PATCH')
                        <button type="submit" class="admin-mark-read-btn" data-mark-all-read>Đánh dấu đã đọc</button>
                    </form>
                @else
                    <span class="admin-notification-read-label">Đã đọc hết</span>
                @endif
            </div>
            <div class="notification-list">
                @forelse(($headerNotifications ?? []) as $notification)
                    @php($icon = match($notification->type) { 'song' => 'sound', 'user' => 'user', 'payment' => 'credit-card', default => 'setting' })
                    <a href="{{ filled($notification->action_url) ? url($notification->action_url) : route('admin.notifications.index') }}" class="notification-item {{ $notification->is_read ? '' : 'is-unread' }}">
                        <span class="notification-icon"><x-anticon :name="$icon" /></span>
                        <span class="notification-body">
                            <span class="notification-top"><strong>{{ $notification->title }}</strong><small class="notification-time">{{ $notification->created_at?->diffForHumans() ?? '—' }}</small></span>
                            <small class="notification-desc">{{ $notification->body }}</small>
                        </span>
                        @unless($notification->is_read)<span class="notification-unread-dot"></span>@endunless
                    </a>
                @empty
                    <div class="admin-notification-empty">Chưa có thông báo mới.</div>
                @endforelse
            </div>
            <a href="{{ route('admin.notifications.index') }}" class="notification-panel-footer">Xem tất cả thông báo</a>
        </div>
    </div>
</div>

