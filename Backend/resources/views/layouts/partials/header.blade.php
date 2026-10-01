<header class="ant-layout-header admin-header">
    <div class="admin-header-left">
        {{-- Mobile hamburger (visible < 768px) --}}
        <button
            type="button"
            class="ant-btn ant-btn-text ant-btn-circle admin-icon-btn admin-mobile-toggle"
            data-sidebar-mobile-toggle
            aria-label="Mở menu"
            title="Mở menu"
        >
            <x-anticon name="bars" />
        </button>

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
        @include('layouts.partials.header.quick-create')

        <a class="ant-btn ant-btn-link admin-header-link" href="/api/docs" target="_blank">
            API Docs
        </a>

        @include('layouts.partials.header.theme-toggle')

        @include('layouts.partials.header.notifications')

        @include('layouts.partials.header.user-menu')
    </div>
</header>

