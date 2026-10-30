<div class="ant-dropdown-trigger-container admin-dropdown-container" data-dropdown-scope>
    <button type="button" class="ant-btn ant-btn-primary admin-create-btn" data-dropdown-trigger="quick-create" aria-expanded="false">
        <x-anticon name="plus" />
        <span>Thêm mới</span>
        <x-anticon name="down" class="admin-btn-arrow" />
    </button>
    <div class="ant-dropdown admin-dropdown-menu-wrapper" data-dropdown-target="quick-create" hidden>
        <ul class="ant-dropdown-menu" role="menu">
            <li class="ant-dropdown-menu-item" role="menuitem">
                <a href="#" class="admin-dropdown-link">
                    <x-anticon name="sound" class="admin-dropdown-item-icon" />
                    <span>Thêm bài hát</span>
                </a>
            </li>
            <li class="ant-dropdown-menu-item" role="menuitem">
                <a href="#" class="admin-dropdown-link">
                    <x-anticon name="play-circle" class="admin-dropdown-item-icon" />
                    <span>Thêm album</span>
                </a>
            </li>
            <li class="ant-dropdown-menu-item" role="menuitem">
                <a href="#" class="admin-dropdown-link">
                    <x-anticon name="appstore" class="admin-dropdown-item-icon" />
                    <span>Thêm playlist</span>
                </a>
            </li>
        </ul>
    </div>
</div>
