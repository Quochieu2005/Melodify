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
            <sup class="ant-badge-dot admin-notification-dot"></sup>
        </span>
    </button>

    <div class="ant-dropdown admin-dropdown-menu-wrapper admin-notifications-dropdown" data-dropdown-target="notifications" hidden>
        <div class="notification-panel">
            <div class="notification-panel-header">
                <strong>Thông báo</strong>
                <button type="button" class="admin-mark-read-btn" data-mark-all-read>Đánh dấu đã đọc</button>
            </div>
            <div class="notification-list">
                <button type="button" class="notification-item is-unread">
                    <span class="notification-icon">
                        <x-anticon name="sound" />
                    </span>
                    <span class="notification-body">
                        <span class="notification-top">
                            <strong>3 bài hát mới</strong>
                            <small class="notification-time">10 phút trước</small>
                        </span>
                        <small class="notification-desc">Đang chờ bạn duyệt vào kho nhạc</small>
                    </span>
                    <span class="notification-unread-dot"></span>
                </button>

                <button type="button" class="notification-item is-unread">
                    <span class="notification-icon">
                        <x-anticon name="user" />
                    </span>
                    <span class="notification-body">
                        <span class="notification-top">
                            <strong>Người dùng mới đăng ký</strong>
                            <small class="notification-time">1 giờ trước</small>
                        </span>
                        <small class="notification-desc">Có hoạt động mới trong hệ thống</small>
                    </span>
                    <span class="notification-unread-dot"></span>
                </button>

                <button type="button" class="notification-item">
                    <span class="notification-icon">
                        <x-anticon name="setting" />
                    </span>
                    <span class="notification-body">
                        <span class="notification-top">
                            <strong>Hệ thống ổn định</strong>
                            <small class="notification-time">Hôm qua</small>
                        </span>
                        <small class="notification-desc">Tất cả dịch vụ đang hoạt động bình thường</small>
                    </span>
                </button>
            </div>
            <a href="#" class="notification-panel-footer">Xem tất cả thông báo</a>
        </div>
    </div>
</div>

