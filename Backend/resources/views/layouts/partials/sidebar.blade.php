<aside class="ant-layout-sider ant-layout-sider-light admin-sider" id="admin-sider" data-admin-sidebar>
    <div class="ant-layout-sider-children">
        <button type="button" class="admin-sidebar-close" data-sidebar-close aria-label="Đóng menu">
            <x-anticon name="close" />
        </button>
        @include('layouts.partials.sidebar.brand')
        <div class="admin-sider-nav-container">
            @include('layouts.partials.sidebar.menu')
        </div>
        @include('layouts.partials.sidebar.footer')
    </div>
</aside>

