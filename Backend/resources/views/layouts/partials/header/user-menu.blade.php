<div class="ant-dropdown-trigger-container admin-dropdown-container" data-dropdown-scope>
    <button 
        type="button" 
        class="admin-account-btn" 
        data-dropdown-trigger="user-account" 
        aria-expanded="false"
        aria-label="Tài khoản cá nhân"
    >
        <span class="ant-avatar ant-avatar-circle admin-account-avatar">
            <x-anticon name="user" />
        </span>
        <span class="admin-account-info">
            <strong class="admin-account-name">Admin</strong>
            <small class="admin-account-role">Quản trị viên</small>
        </span>
    </button>

    <div class="ant-dropdown admin-dropdown-menu-wrapper admin-account-dropdown" data-dropdown-target="user-account" hidden>
        <ul class="ant-dropdown-menu" role="menu">
            <li class="ant-dropdown-menu-item ant-dropdown-menu-item-disabled admin-account-item-heading" role="menuitem">
                <div class="account-menu-heading">
                    <span class="ant-avatar ant-avatar-circle admin-account-avatar-large">
                        <x-anticon name="user" />
                    </span>
                    <span class="account-menu-text">
                        <strong>Admin</strong>
                        <small>admin@melodify.local</small>
                    </span>
                </div>
            </li>
            <li class="ant-dropdown-menu-item-divider"></li>
            <li class="ant-dropdown-menu-item" role="menuitem">
                <a href="#" class="admin-dropdown-link">
                    <x-anticon name="user" class="admin-dropdown-item-icon" />
                    <span>Hồ sơ cá nhân</span>
                </a>
            </li>
            <li class="ant-dropdown-menu-item" role="menuitem">
                <a href="#" class="admin-dropdown-link">
                    <x-anticon name="setting" class="admin-dropdown-item-icon" />
                    <span>Cài đặt tài khoản</span>
                </a>
            </li>
            <li class="ant-dropdown-menu-item-divider"></li>
            <li class="ant-dropdown-menu-item ant-dropdown-menu-item-danger" role="menuitem">
                <a href="#" class="admin-dropdown-link admin-logout-link">
                    <x-anticon name="logout" class="admin-dropdown-item-icon" />
                    <span>Đăng xuất</span>
                </a>
            </li>
        </ul>
    </div>
</div>
