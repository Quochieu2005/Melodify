<nav class="ant-menu ant-menu-root ant-menu-inline ant-menu-light admin-menu" role="menu" aria-label="Điều hướng quản trị">
    {{-- Tổng quan --}}
    <li class="ant-menu-item {{ request()->is('/') || request()->is('admin') || request()->is('admin/dashboard') ? 'ant-menu-item-selected' : '' }}" role="menuitem" tabindex="-1">
        <a href="{{ url('/admin/dashboard') }}" class="ant-menu-title-content">
            <x-anticon name="dashboard" class="ant-menu-item-icon" />
            <span class="ant-menu-title-text">Tổng quan</span>
        </a>
    </li>

    {{-- Quản lý Nội dung --}}
    <li class="ant-menu-submenu ant-menu-submenu-inline {{ request()->is('admin/songs*') || request()->is('admin/albums*') || request()->is('admin/genres*') || request()->is('admin/playlists*') ? 'ant-menu-submenu-open ant-menu-submenu-selected' : '' }}" role="menuitem" data-menu-submenu>
        <div class="ant-menu-submenu-title" role="button" aria-expanded="{{ request()->is('admin/songs*') || request()->is('admin/albums*') || request()->is('admin/genres*') || request()->is('admin/playlists*') ? 'true' : 'false' }}" data-submenu-trigger>
            <span class="ant-menu-title-content">
                <x-anticon name="customer-service" class="ant-menu-item-icon" />
                <span class="ant-menu-title-text">Nội dung</span>
            </span>
            <x-anticon name="down" class="ant-menu-submenu-arrow" />
        </div>
        <ul class="ant-menu ant-menu-sub ant-menu-inline admin-submenu-list" role="menu">
            <li class="ant-menu-item {{ request()->is('admin/songs*') ? 'ant-menu-item-selected' : '' }}" role="menuitem">
                <a href="{{ url('/admin/songs') }}" class="ant-menu-title-content">
                    <x-anticon name="sound" class="ant-menu-item-icon" />
                    <span class="ant-menu-title-text">Bài hát</span>
                </a>
            </li>
            <li class="ant-menu-item {{ request()->is('admin/albums*') ? 'ant-menu-item-selected' : '' }}" role="menuitem">
                <a href="{{ url('/admin/albums') }}" class="ant-menu-title-content">
                    <x-anticon name="folder" class="ant-menu-item-icon" />
                    <span class="ant-menu-title-text">Album</span>
                </a>
            </li>
            <li class="ant-menu-item {{ request()->is('admin/genres*') ? 'ant-menu-item-selected' : '' }}" role="menuitem">
                <a href="{{ url('/admin/genres') }}" class="ant-menu-title-content">
                    <x-anticon name="tags" class="ant-menu-item-icon" />
                    <span class="ant-menu-title-text">Thể loại</span>
                </a>
            </li>
            <li class="ant-menu-item {{ request()->is('admin/playlists*') ? 'ant-menu-item-selected' : '' }}" role="menuitem">
                <a href="{{ url('/admin/playlists') }}" class="ant-menu-title-content">
                    <x-anticon name="unordered-list" class="ant-menu-item-icon" />
                    <span class="ant-menu-title-text">Playlist</span>
                </a>
            </li>
        </ul>
    </li>

    {{-- Nghệ sĩ --}}
    <li class="ant-menu-item {{ request()->is('admin/artists*') ? 'ant-menu-item-selected' : '' }}" role="menuitem">
        <a href="{{ url('/admin/artists') }}" class="ant-menu-title-content">
            <x-anticon name="team" class="ant-menu-item-icon" />
            <span class="ant-menu-title-text">Nghệ sĩ</span>
        </a>
    </li>

    {{-- Người dùng --}}
    <li class="ant-menu-item {{ request()->is('admin/users*') ? 'ant-menu-item-selected' : '' }}" role="menuitem">
        <a href="{{ url('/admin/users') }}" class="ant-menu-title-content">
            <x-anticon name="user" class="ant-menu-item-icon" />
            <span class="ant-menu-title-text">Người dùng</span>
        </a>
    </li>

    {{-- Thanh toán --}}
    <li class="ant-menu-submenu ant-menu-submenu-inline {{ request()->is('admin/subscriptions*') || request()->is('admin/payments*') ? 'ant-menu-submenu-open ant-menu-submenu-selected' : '' }}" role="menuitem" data-menu-submenu>
        <div class="ant-menu-submenu-title" role="button" aria-expanded="{{ request()->is('admin/subscriptions*') || request()->is('admin/payments*') ? 'true' : 'false' }}" data-submenu-trigger>
            <span class="ant-menu-title-content">
                <x-anticon name="credit-card" class="ant-menu-item-icon" />
                <span class="ant-menu-title-text">Thanh toán</span>
            </span>
            <x-anticon name="down" class="ant-menu-submenu-arrow" />
        </div>
        <ul class="ant-menu ant-menu-sub ant-menu-inline admin-submenu-list" role="menu">
            <li class="ant-menu-item {{ request()->is('admin/subscriptions*') ? 'ant-menu-item-selected' : '' }}" role="menuitem">
                <a href="{{ url('/admin/subscriptions') }}" class="ant-menu-title-content">
                    <x-anticon name="credit-card" class="ant-menu-item-icon" />
                    <span class="ant-menu-title-text">Gói đăng ký</span>
                </a>
            </li>
            <li class="ant-menu-item {{ request()->is('admin/payments*') ? 'ant-menu-item-selected' : '' }}" role="menuitem">
                <a href="{{ url('/admin/payments') }}" class="ant-menu-title-content">
                    <x-anticon name="file-text" class="ant-menu-item-icon" />
                    <span class="ant-menu-title-text">Lịch sử giao dịch</span>
                </a>
            </li>
        </ul>
    </li>

    {{-- Tương tác --}}
    <li class="ant-menu-submenu ant-menu-submenu-inline {{ request()->is('admin/comments*') || request()->is('admin/reports*') ? 'ant-menu-submenu-open ant-menu-submenu-selected' : '' }}" role="menuitem" data-menu-submenu>
        <div class="ant-menu-submenu-title" role="button" aria-expanded="{{ request()->is('admin/comments*') || request()->is('admin/reports*') ? 'true' : 'false' }}" data-submenu-trigger>
            <span class="ant-menu-title-content">
                <x-anticon name="message" class="ant-menu-item-icon" />
                <span class="ant-menu-title-text">Tương tác</span>
            </span>
            <x-anticon name="down" class="ant-menu-submenu-arrow" />
        </div>
        <ul class="ant-menu ant-menu-sub ant-menu-inline admin-submenu-list" role="menu">
            <li class="ant-menu-item {{ request()->is('admin/comments*') ? 'ant-menu-item-selected' : '' }}" role="menuitem">
                <a href="{{ url('/admin/comments') }}" class="ant-menu-title-content">
                    <x-anticon name="message" class="ant-menu-item-icon" />
                    <span class="ant-menu-title-text">Bình luận</span>
                </a>
            </li>
            <li class="ant-menu-item {{ request()->is('admin/reports*') ? 'ant-menu-item-selected' : '' }}" role="menuitem">
                <a href="{{ url('/admin/reports') }}" class="ant-menu-title-content">
                    <x-anticon name="alert" class="ant-menu-item-icon" />
                    <span class="ant-menu-title-text">Báo cáo vi phạm</span>
                </a>
            </li>
        </ul>
    </li>

    {{-- Cài đặt --}}
    <li class="ant-menu-item {{ request()->is('admin/settings*') ? 'ant-menu-item-selected' : '' }}" role="menuitem">
        <a href="{{ url('/admin/settings') }}" class="ant-menu-title-content">
            <x-anticon name="setting" class="ant-menu-item-icon" />
            <span class="ant-menu-title-text">Cài đặt</span>
        </a>
    </li>
</nav>
