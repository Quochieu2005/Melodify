/**
 * Melodify Admin Interface - Ant Design Vanilla JS Controllers
 */
document.addEventListener('DOMContentLoaded', () => {
    const toast = document.querySelector('[data-toast]');
    const closeToast = () => {
        if (!toast) return;
        toast.classList.add('is-hiding');
        window.setTimeout(() => toast.remove(), 220);
    };
    document.querySelector('[data-toast-close]')?.addEventListener('click', closeToast);
    if (toast) window.setTimeout(closeToast, 4200);

    document.querySelectorAll('[data-confirm-delete]').forEach((form) => {
        form.addEventListener('submit', (event) => {
            if (!window.confirm('Bạn chắc chắn muốn xóa mục này? Hành động này không thể hoàn tác.')) event.preventDefault();
        });
    });
    const rootHtml = document.documentElement;
    const adminShell = document.querySelector('[data-admin-shell]');
    const sidebarToggleBtn = document.querySelector('[data-sidebar-toggle]');
    const themeToggleBtn = document.querySelector('[data-theme-toggle]');
    const searchInput = document.getElementById('admin-search-input');

    // ==========================================
    // 1. Quản lý Thu gọn / Mở rộng Sidebar
    // ==========================================
    const savedSidebarState = localStorage.getItem('melodify-sidebar-collapsed');
    if (savedSidebarState === 'true' && adminShell) {
        adminShell.classList.add('is-sidebar-collapsed');
    }

    sidebarToggleBtn?.addEventListener('click', () => {
        if (!adminShell) return;
        const isCollapsed = adminShell.classList.toggle('is-sidebar-collapsed');
        localStorage.setItem('melodify-sidebar-collapsed', isCollapsed ? 'true' : 'false');
    });

    // ==========================================
    // 1b. Mobile Sidebar Open/Close
    // ==========================================
    const mobileToggleBtn = document.querySelector('[data-sidebar-mobile-toggle]');
    const sidebarCloseBtn = document.querySelector('[data-sidebar-close]');
    const sidebarOverlay = document.querySelector('[data-sidebar-overlay]');

    const openMobileSidebar = () => {
        if (!adminShell) return;
        adminShell.classList.add('is-sidebar-open');
        document.body.style.overflow = 'hidden';
    };

    const closeMobileSidebar = () => {
        if (!adminShell) return;
        adminShell.classList.remove('is-sidebar-open');
        document.body.style.overflow = '';
    };

    mobileToggleBtn?.addEventListener('click', openMobileSidebar);
    sidebarCloseBtn?.addEventListener('click', closeMobileSidebar);
    sidebarOverlay?.addEventListener('click', closeMobileSidebar);

    // Close mobile sidebar on navigation link click
    document.querySelectorAll('.admin-menu .ant-menu-item > a').forEach((link) => {
        link.addEventListener('click', () => {
            if (window.innerWidth < 768) {
                closeMobileSidebar();
            }
        });
    });

    // ==========================================
    // 2. Quản lý Giao diện Sáng / Tối / Theo hệ thống
    // ==========================================
    const themeOptions = document.querySelectorAll('[data-theme-value]');
    const systemThemeMedia = window.matchMedia('(prefers-color-scheme: dark)');

    const updateThemeUI = (pref, effectiveTheme) => {
        rootHtml.setAttribute('data-admin-theme', effectiveTheme);
        rootHtml.setAttribute('data-theme-preference', pref);
        rootHtml.style.colorScheme = effectiveTheme;

        themeOptions.forEach((option) => {
            const val = option.getAttribute('data-theme-value');
            if (val === pref) {
                option.classList.add('ant-dropdown-menu-item-selected', 'is-selected');
            } else {
                option.classList.remove('ant-dropdown-menu-item-selected', 'is-selected');
            }
        });
    };

    const applyThemePreference = (pref) => {
        let effectiveTheme = pref;
        if (pref === 'system') {
            effectiveTheme = systemThemeMedia.matches ? 'dark' : 'light';
        }
        localStorage.setItem('melodify-theme-preference', pref);
        localStorage.setItem('melodify-theme', effectiveTheme);
        updateThemeUI(pref, effectiveTheme);
    };

    // Khởi tạo theme: ưu tiên melodify-theme-preference, mặc định là 'system'
    const savedPref = localStorage.getItem('melodify-theme-preference')
        || localStorage.getItem('melodify-theme')
        || 'system';
    applyThemePreference(savedPref);

    // Lắng nghe thay đổi theme hệ thống khi đang ở chế độ 'system'
    systemThemeMedia.addEventListener('change', () => {
        const currentPref = localStorage.getItem('melodify-theme-preference') || 'system';
        if (currentPref === 'system') {
            applyThemePreference('system');
        }
    });

    // Xử lý chọn mode trong dropdown
    themeOptions.forEach((option) => {
        option.addEventListener('click', (e) => {
            e.stopPropagation();
            const val = option.getAttribute('data-theme-value');
            if (val) {
                applyThemePreference(val);
                closeAllDropdowns();
            }
        });
    });

    // ==========================================
    // 3. Quản lý Submenu (Accordion mở/đóng)
    // ==========================================
    const submenuTriggers = document.querySelectorAll('[data-submenu-trigger]');
    submenuTriggers.forEach((trigger) => {
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            const submenuContainer = trigger.closest('[data-menu-submenu]');
            if (!submenuContainer) return;

            const isOpen = submenuContainer.classList.toggle('ant-menu-submenu-open');
            trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        });
    });

    // ==========================================
    // 4. Quản lý Ant Design Dropdown Menus
    // ==========================================
    const dropdownTriggers = document.querySelectorAll('[data-dropdown-trigger]');
    const allDropdownTargets = document.querySelectorAll('[data-dropdown-target]');

    const closeAllDropdowns = () => {
        dropdownTriggers.forEach((btn) => btn.setAttribute('aria-expanded', 'false'));
        allDropdownTargets.forEach((target) => {
            target.hidden = true;
            target.classList.remove('ant-dropdown-open');
        });
    };

    dropdownTriggers.forEach((trigger) => {
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const targetId = trigger.getAttribute('data-dropdown-trigger');
            const targetMenu = document.querySelector(`[data-dropdown-target="${targetId}"]`);

            if (!targetMenu) return;

            const isCurrentlyOpen = !targetMenu.hidden;

            closeAllDropdowns();

            if (!isCurrentlyOpen) {
                targetMenu.hidden = false;
                targetMenu.classList.add('ant-dropdown-open');
                trigger.setAttribute('aria-expanded', 'true');
            }
        });
    });

    // Đóng dropdown khi click ngoài
    document.addEventListener('click', (e) => {
        if (!e.target.closest('[data-dropdown-scope]')) {
            closeAllDropdowns();
        }
    });

    // Đóng dropdown khi bấm Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAllDropdowns();
        }
    });

    // ==========================================
    // 5. Phím tắt tìm kiếm nhanh "/"
    // ==========================================
    document.addEventListener('keydown', (e) => {
        if (e.key === '/' && document.activeElement !== searchInput && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
            e.preventDefault();
            searchInput?.focus();
        }
    });

    // ==========================================
    // 6. Đánh dấu đã đọc thông báo
    // ==========================================
    const markReadBtn = document.querySelector('[data-mark-all-read]');
    const notificationBadge = document.querySelector('.admin-notification-dot');
    const notificationItems = document.querySelectorAll('.notification-item');

    markReadBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        notificationItems.forEach((item) => {
            item.classList.remove('is-unread');
            const unreadDot = item.querySelector('.notification-unread-dot');
            if (unreadDot) {
                unreadDot.style.display = 'none';
            }
        });
        if (notificationBadge) {
            notificationBadge.style.display = 'none';
        }
        markReadBtn.textContent = 'Đã đọc';
        markReadBtn.style.pointerEvents = 'none';
        markReadBtn.style.opacity = '0.5';
    });

    // ==========================================
    // 7. Đồng bộ mục đang chọn trong cài đặt tài khoản
    // ==========================================
    const settingsNav = document.querySelector('[data-settings-nav]');

    if (settingsNav) {
        const sectionLinks = [...settingsNav.querySelectorAll('a[href^="#"]')];
        const sections = sectionLinks
            .map((link) => document.querySelector(link.getAttribute('href')))
            .filter(Boolean);

        const setActiveSettingsLink = (sectionId) => {
            settingsNav.querySelectorAll('a').forEach((link) => {
                const isActive = link.getAttribute('href') === `#${sectionId}`;
                link.classList.toggle('is-active', isActive);
                if (isActive) link.setAttribute('aria-current', 'true');
                else link.removeAttribute('aria-current');
            });
        };

        sectionLinks.forEach((link) => {
            link.addEventListener('click', () => {
                setActiveSettingsLink(link.getAttribute('href').slice(1));
            });
        });

        const initialSection = window.location.hash.slice(1);
        if (sections.some((section) => section.id === initialSection)) {
            setActiveSettingsLink(initialSection);
        }

        const observer = new IntersectionObserver((entries) => {
            const visible = entries
                .filter((entry) => entry.isIntersecting)
                .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
            if (visible) setActiveSettingsLink(visible.target.id);
        }, { rootMargin: '-18% 0px -62% 0px', threshold: [0.1, 0.35, 0.6] });

        sections.forEach((section) => observer.observe(section));
    }
});

