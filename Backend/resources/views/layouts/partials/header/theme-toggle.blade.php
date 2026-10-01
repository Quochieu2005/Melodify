<div class="ant-dropdown-trigger-container admin-dropdown-container" data-dropdown-scope>
    <button 
        type="button" 
        class="ant-btn ant-btn-text ant-btn-circle admin-icon-btn admin-theme-btn" 
        data-dropdown-trigger="theme-selector" 
        aria-expanded="false" 
        aria-label="Chọn giao diện" 
        title="Chọn giao diện"
    >
        <x-anticon name="sun" class="admin-theme-icon-light" />
        <x-anticon name="moon" class="admin-theme-icon-dark" />
        <x-anticon name="desktop" class="admin-theme-icon-system" />
    </button>

    <div class="ant-dropdown admin-dropdown-menu-wrapper admin-theme-dropdown" data-dropdown-target="theme-selector" hidden>
        <ul class="ant-dropdown-menu" role="menu">
            <li class="ant-dropdown-menu-item admin-theme-option" role="menuitem" data-theme-value="light">
                <div class="admin-theme-option-inner">
                    <x-anticon name="sun" class="admin-dropdown-item-icon" />
                    <span>Sáng</span>
                    <x-anticon name="check" class="admin-theme-check-icon" />
                </div>
            </li>
            <li class="ant-dropdown-menu-item admin-theme-option" role="menuitem" data-theme-value="dark">
                <div class="admin-theme-option-inner">
                    <x-anticon name="moon" class="admin-dropdown-item-icon" />
                    <span>Tối</span>
                    <x-anticon name="check" class="admin-theme-check-icon" />
                </div>
            </li>
            <li class="ant-dropdown-menu-item admin-theme-option" role="menuitem" data-theme-value="system">
                <div class="admin-theme-option-inner">
                    <x-anticon name="desktop" class="admin-dropdown-item-icon" />
                    <span>Hệ thống</span>
                    <x-anticon name="check" class="admin-theme-check-icon" />
                </div>
            </li>
        </ul>
    </div>
</div>

