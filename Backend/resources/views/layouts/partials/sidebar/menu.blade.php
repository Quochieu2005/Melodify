@php($currentAdmin = auth('admin')->user())

<nav class="ant-menu ant-menu-root ant-menu-inline ant-menu-light admin-menu" role="menu" aria-label="Điều hướng quản trị">
    {{-- Tổng quan --}}
    <li class="ant-menu-item {{ request()->is('/') || request()->is('admin') || request()->is('admin/dashboard') ? 'ant-menu-item-selected' : '' }}" role="menuitem" tabindex="-1">
        <a href="{{ url('/admin/dashboard') }}" class="ant-menu-title-content">
            <x-anticon name="dashboard" class="ant-menu-item-icon" />
            <span class="ant-menu-title-text">Tổng quan</span>
        </a>
    </li>

    <li class="ant-menu-item {{ request()->is('admin/logs*') ? 'ant-menu-item-selected' : '' }}" role="menuitem">
        <a href="{{ route('admin.logs.index') }}" class="ant-menu-title-content">
            <x-anticon name="file-text" class="ant-menu-item-icon" />
            <span class="ant-menu-title-text">Nhật ký hoạt động</span>
        </a>
    </li>

    <li class="ant-menu-item {{ request()->is('admin/notifications*') ? 'ant-menu-item-selected' : '' }}" role="menuitem">
        <a href="{{ route('admin.notifications.index') }}" class="ant-menu-title-content">
            <x-anticon name="bell" class="ant-menu-item-icon" />
            <span class="ant-menu-title-text">Thông báo</span>
        </a>
    </li>

    {{-- Quản lý Nội dung --}}
    @if($currentAdmin?->hasAdminResourcePermission('songs', 'view') || $currentAdmin?->hasAdminResourcePermission('albums', 'view') || $currentAdmin?->hasAdminResourcePermission('topics', 'view') || $currentAdmin?->hasAdminResourcePermission('genres', 'view') || $currentAdmin?->hasAdminResourcePermission('playlists', 'view'))
    <li class="ant-menu-submenu ant-menu-submenu-inline {{ request()->is('admin/songs*') || request()->is('admin/lyrics*') || request()->is('admin/analytics/song-views*') || request()->is('admin/albums*') || request()->is('admin/topics*') || request()->is('admin/genres*') || request()->is('admin/playlists*') ? 'ant-menu-submenu-open ant-menu-submenu-selected' : '' }}" role="menuitem" data-menu-submenu>
        <div class="ant-menu-submenu-title" role="button" aria-expanded="{{ request()->is('admin/songs*') || request()->is('admin/lyrics*') || request()->is('admin/analytics/song-views*') || request()->is('admin/albums*') || request()->is('admin/topics*') || request()->is('admin/genres*') || request()->is('admin/playlists*') ? 'true' : 'false' }}" data-submenu-trigger>
            <span class="ant-menu-title-content">
                <x-anticon name="customer-service" class="ant-menu-item-icon" />
                <span class="ant-menu-title-text">Nội dung</span>
            </span>
            <x-anticon name="down" class="ant-menu-submenu-arrow" />
        </div>
        <ul class="ant-menu ant-menu-sub ant-menu-inline admin-submenu-list" role="menu">
            @if($currentAdmin?->hasAdminResourcePermission('songs', 'view'))
            <li class="ant-menu-item {{ request()->is('admin/songs*') && !request()->is('admin/songs/*/lyrics') ? 'ant-menu-item-selected' : '' }}" role="menuitem">
                <a href="{{ url('/admin/songs') }}" class="ant-menu-title-content">
                    <x-anticon name="sound" class="ant-menu-item-icon" />
                    <span class="ant-menu-title-text">Bài hát</span>
                </a>
            </li>
            @endif
            @if($currentAdmin?->hasAdminResourcePermission('songs', 'view'))
            <li class="ant-menu-item {{ request()->is('admin/analytics/song-views*') ? 'ant-menu-item-selected' : '' }}" role="menuitem">
                <a href="{{ route('admin.analytics.song-views') }}" class="ant-menu-title-content">
                    <x-anticon name="eye" class="ant-menu-item-icon" />
                    <span class="ant-menu-title-text">Lượt xem bài hát</span>
                </a>
            </li>
            @endif
            @if($currentAdmin?->hasAdminResourcePermission('songs', 'view'))
            <li class="ant-menu-item {{ request()->is('admin/lyrics*') || request()->is('admin/songs/*/lyrics') ? 'ant-menu-item-selected' : '' }}" role="menuitem">
                <a href="{{ route('admin.lyrics.index') }}" class="ant-menu-title-content">
                    <x-anticon name="file-text" class="ant-menu-item-icon" />
                    <span class="ant-menu-title-text">Lời bài hát</span>
                </a>
            </li>
            @endif
            @if($currentAdmin?->hasAdminResourcePermission('albums', 'view'))
            <li class="ant-menu-item {{ request()->is('admin/albums*') ? 'ant-menu-item-selected' : '' }}" role="menuitem">
                <a href="{{ url('/admin/albums') }}" class="ant-menu-title-content">
                    <x-anticon name="folder" class="ant-menu-item-icon" />
                    <span class="ant-menu-title-text">Album</span>
                </a>
            </li>
            @endif
            @if($currentAdmin?->hasAdminResourcePermission('topics', 'view'))
            <li class="ant-menu-item {{ request()->is('admin/topics*') && !request()->filled('type') ? 'ant-menu-item-selected' : '' }}" role="menuitem">
                <a href="{{ url('/admin/topics') }}" class="ant-menu-title-content">
                    <x-anticon name="appstore" class="ant-menu-item-icon" />
                    <span class="ant-menu-title-text">Chủ đề</span>
                </a>
            </li>
            @if(request()->is('admin/topics*'))
                <ul class="admin-catalog-sidebar-list" aria-label="Nhóm chủ đề">
                    <li><a href="{{ route('admin.topics.index') }}" class="{{ !request()->filled('type') ? 'is-selected' : '' }}">Tất cả</a></li>
                    @foreach(collect(config('topics.types', []))->except(['topic', 'custom']) as $value => $label)
                        <li><a href="{{ route('admin.topics.index', ['type' => $value]) }}" class="{{ request('type') === $value ? 'is-selected' : '' }}">{{ $label }}</a></li>
                    @endforeach
                    @foreach($sidebarTopicCustomTypes ?? [] as $customType)
                        <li><a href="{{ route('admin.topics.index', ['type' => 'custom:'.$customType]) }}" class="{{ request('type') === 'custom:'.$customType ? 'is-selected' : '' }}">{{ $customType }}</a></li>
                    @endforeach
                </ul>
            @endif
            @endif
            @if($currentAdmin?->hasAdminResourcePermission('genres', 'view'))
            <li class="ant-menu-item {{ request()->is('admin/genres*') ? 'ant-menu-item-selected' : '' }}" role="menuitem">
                <a href="{{ url('/admin/genres') }}" class="ant-menu-title-content">
                    <x-anticon name="tags" class="ant-menu-item-icon" />
                    <span class="ant-menu-title-text">Thể loại</span>
                </a>
            </li>
            @endif
            @if($currentAdmin?->hasAdminResourcePermission('playlists', 'view'))
            <li class="ant-menu-item {{ request()->is('admin/playlists*') && !request()->filled('type') ? 'ant-menu-item-selected' : '' }}" role="menuitem">
                <a href="{{ url('/admin/playlists') }}" class="ant-menu-title-content">
                    <x-anticon name="unordered-list" class="ant-menu-item-icon" />
                    <span class="ant-menu-title-text">Playlist</span>
                </a>
            </li>
            @if(request()->is('admin/playlists*'))
                <ul class="admin-catalog-sidebar-list" aria-label="Nhóm playlist">
                    <li><a href="{{ route('admin.playlists.index') }}" class="{{ !request()->filled('type') ? 'is-selected' : '' }}">Tất cả</a></li>
                    @foreach(collect(config('playlists.types', []))->except('custom') as $value => $label)
                        <li><a href="{{ route('admin.playlists.index', ['type' => $value]) }}" class="{{ request('type') === $value ? 'is-selected' : '' }}">{{ $label }}</a></li>
                    @endforeach
                    @foreach($sidebarPlaylistCustomTypes ?? [] as $customType)
                        <li><a href="{{ route('admin.playlists.index', ['type' => 'custom:'.$customType]) }}" class="{{ request('type') === 'custom:'.$customType ? 'is-selected' : '' }}">{{ $customType }}</a></li>
                    @endforeach
                </ul>
            @endif
            @endif
        </ul>
    </li>
    @endif

    {{-- Banner --}}
    @if($currentAdmin?->hasAdminPermission('banners.manage'))
    <li class="ant-menu-item {{ request()->is('admin/banners*') ? 'ant-menu-item-selected' : '' }}" role="menuitem">
        <a href="{{ route('admin.banners.index') }}" class="ant-menu-title-content">
            <x-anticon name="appstore" class="ant-menu-item-icon" />
            <span class="ant-menu-title-text">Banner</span>
        </a>
    </li>
    @endif

    {{-- Nghệ sĩ --}}
    @if($currentAdmin?->hasAdminResourcePermission('artists', 'view'))
    <li class="ant-menu-item {{ request()->is('admin/artists*') ? 'ant-menu-item-selected' : '' }}" role="menuitem">
        <a href="{{ url('/admin/artists') }}" class="ant-menu-title-content">
            <x-anticon name="team" class="ant-menu-item-icon" />
            <span class="ant-menu-title-text">Nghệ sĩ</span>
        </a>
    </li>
    @endif

    {{-- Người dùng --}}
    @if($currentAdmin?->hasAdminPermission('users.manage'))
    <li class="ant-menu-item {{ request()->is('admin/users*') ? 'ant-menu-item-selected' : '' }}" role="menuitem">
        <a href="{{ url('/admin/users') }}" class="ant-menu-title-content">
            <x-anticon name="user" class="ant-menu-item-icon" />
            <span class="ant-menu-title-text">Người dùng</span>
        </a>
    </li>
    @endif

    @if($currentAdmin)
        <li class="ant-menu-item {{ request()->is('admin/admins*') ? 'ant-menu-item-selected' : '' }}" role="menuitem">
            <a href="{{ route('admin.admins.index') }}" class="ant-menu-title-content">
                <x-anticon name="team" class="ant-menu-item-icon" />
                <span class="ant-menu-title-text">Quản trị viên</span>
            </a>
        </li>
    @endif

    {{-- Thanh toán --}}
    @if($currentAdmin?->hasAdminPermission('billing.manage'))
    <li class="ant-menu-submenu ant-menu-submenu-inline {{ request()->is('admin/subscriptions*') || request()->is('admin/payments*') ? 'ant-menu-submenu-open ant-menu-submenu-selected' : '' }}" role="menuitem" data-menu-submenu>
        <div class="ant-menu-submenu-title" role="button" aria-expanded="{{ request()->is('admin/subscriptions*') || request()->is('admin/payments*') ? 'true' : 'false' }}" data-submenu-trigger>
            <span class="ant-menu-title-content">
                <x-anticon name="credit-card" class="ant-menu-item-icon" />
                <span class="ant-menu-title-text">Thanh toán</span>
            </span>
            <x-anticon name="down" class="ant-menu-submenu-arrow" />
        </div>
        <ul class="ant-menu ant-menu-sub ant-menu-inline admin-submenu-list" role="menu">
            @if($currentAdmin?->hasAdminResourcePermission('subscriptions', 'view'))
            <li class="ant-menu-item {{ request()->is('admin/subscriptions*') ? 'ant-menu-item-selected' : '' }}" role="menuitem">
                <a href="{{ url('/admin/subscriptions') }}" class="ant-menu-title-content">
                    <x-anticon name="credit-card" class="ant-menu-item-icon" />
                    <span class="ant-menu-title-text">Gói đăng ký</span>
                </a>
            </li>
            @endif
            @if($currentAdmin?->hasAdminResourcePermission('payments', 'view'))
            <li class="ant-menu-item {{ request()->is('admin/payments*') ? 'ant-menu-item-selected' : '' }}" role="menuitem">
                <a href="{{ url('/admin/payments') }}" class="ant-menu-title-content">
                    <x-anticon name="file-text" class="ant-menu-item-icon" />
                    <span class="ant-menu-title-text">Lịch sử giao dịch</span>
                </a>
            </li>
            @endif
        </ul>
    </li>
    @endif

    {{-- Tương tác --}}
    @if($currentAdmin?->hasAdminPermission('moderation.manage'))
    <li class="ant-menu-submenu ant-menu-submenu-inline {{ request()->is('admin/comments*') || request()->is('admin/reports*') ? 'ant-menu-submenu-open ant-menu-submenu-selected' : '' }}" role="menuitem" data-menu-submenu>
        <div class="ant-menu-submenu-title" role="button" aria-expanded="{{ request()->is('admin/comments*') || request()->is('admin/reports*') ? 'true' : 'false' }}" data-submenu-trigger>
            <span class="ant-menu-title-content">
                <x-anticon name="message" class="ant-menu-item-icon" />
                <span class="ant-menu-title-text">Tương tác</span>
            </span>
            <x-anticon name="down" class="ant-menu-submenu-arrow" />
        </div>
        <ul class="ant-menu ant-menu-sub ant-menu-inline admin-submenu-list" role="menu">
            @if($currentAdmin?->hasAdminResourcePermission('comments', 'view'))
            <li class="ant-menu-item {{ request()->is('admin/comments*') ? 'ant-menu-item-selected' : '' }}" role="menuitem">
                <a href="{{ url('/admin/comments') }}" class="ant-menu-title-content">
                    <x-anticon name="message" class="ant-menu-item-icon" />
                    <span class="ant-menu-title-text">Bình luận</span>
                </a>
            </li>
            @endif
            @if($currentAdmin?->hasAdminResourcePermission('reports', 'view'))
            <li class="ant-menu-item {{ request()->is('admin/reports*') ? 'ant-menu-item-selected' : '' }}" role="menuitem">
                <a href="{{ url('/admin/reports') }}" class="ant-menu-title-content">
                    <x-anticon name="alert" class="ant-menu-item-icon" />
                    <span class="ant-menu-title-text">Báo cáo vi phạm</span>
                </a>
            </li>
            @endif
        </ul>
    </li>
    @endif

    {{-- Cài đặt --}}
    @if($currentAdmin?->role === 'super_admin')
    <li class="ant-menu-item {{ request()->is('admin/settings*') ? 'ant-menu-item-selected' : '' }}" role="menuitem">
        <a href="{{ url('/admin/settings') }}" class="ant-menu-title-content">
            <x-anticon name="setting" class="ant-menu-item-icon" />
            <span class="ant-menu-title-text">Cài đặt</span>
        </a>
    </li>
    @endif
</nav>
