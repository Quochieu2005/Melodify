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
            <svg class="admin-menu-toggle-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
                <rect x="3.75" y="4.75" width="16.5" height="14.5" rx="2.25" />
                <path d="M9 5v14M13 9h4M13 12h4M13 15h4" />
            </svg>
        </button>

        {{-- Mobile drawer toggle; app.js already handles this data attribute. --}}
        <button
            type="button"
            class="ant-btn ant-btn-text ant-btn-circle admin-icon-btn admin-mobile-toggle"
            data-sidebar-mobile-toggle
            aria-label="Mở menu"
            aria-controls="admin-sider"
            aria-expanded="false"
        >
            <svg class="admin-menu-toggle-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
                <rect x="3.75" y="4.75" width="16.5" height="14.5" rx="2.25" />
                <path d="M9 5v14M13 9h4M13 12h4M13 15h4" />
            </svg>
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

