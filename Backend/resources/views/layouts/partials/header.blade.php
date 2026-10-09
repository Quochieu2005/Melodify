<header class="ant-layout-header admin-header">
    <div class="admin-header-left">
        {{-- Desktop sidebar toggle (visible >= 768px) --}}
        <button 
            type="button" 
            class="ant-btn ant-btn-text ant-btn-circle admin-icon-btn admin-sidebar-toggle" 
            data-sidebar-toggle 
            aria-label="Thu gọn / Mở rộng sidebar"
            title="Thu gọn / Mở rộng sidebar"
        >
            <x-anticon name="menu-fold" class="admin-sidebar-icon-fold" />
            <x-anticon name="menu-unfold" class="admin-sidebar-icon-unfold" />
        </button>

        @include('layouts.partials.header.search')
    </div>

    <div class="admin-header-right">
        @if (auth('admin')->check())
            <a href="{{ route('api.docs') }}" class="ant-btn admin-api-docs-btn" target="_blank" rel="noopener">
                <x-anticon name="file-text" />
                <span>API Docs</span>
            </a>
        @endif

        @include('layouts.partials.header.theme-toggle')

        @include('layouts.partials.header.notifications')

        @include('layouts.partials.header.user-menu')
    </div>
</header>

