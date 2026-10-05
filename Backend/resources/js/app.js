/**
 * Melodify Admin Interface - Ant Design Vanilla JS Controllers
 */
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-password-toggle]').forEach((toggle) => {
        const input = toggle.closest('.admin-login-input-wrap')?.querySelector('[data-password-input]');
        if (!input) return;

        toggle.addEventListener('click', () => {
            const shouldShow = input.type === 'password';
            input.type = shouldShow ? 'text' : 'password';
            toggle.classList.toggle('is-visible', shouldShow);
            toggle.setAttribute('aria-pressed', shouldShow ? 'true' : 'false');
            toggle.setAttribute('aria-label', shouldShow ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
            input.focus();
        });
    });

    const otpForm = document.querySelector('[data-otp-form]');
    if (otpForm) {
        const otpInput = otpForm.querySelector('#otp-code');
        const otpSubmit = otpForm.querySelector('[data-otp-submit]');
        const countdown = otpForm.querySelector('[data-otp-countdown]');
        const expiredMessage = otpForm.querySelector('[data-otp-expired-message]');
        const expiresAt = Number(otpForm.dataset.otpExpiresAt || 0) * 1000;

        const formatRemaining = (milliseconds) => {
            const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
            const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
            const seconds = String(totalSeconds % 60).padStart(2, '0');

            return `${minutes}:${seconds}`;
        };

        const expireOtp = () => {
            otpForm.classList.add('is-expired');
            if (otpInput) otpInput.disabled = true;
            if (otpSubmit) otpSubmit.disabled = true;
            if (countdown) countdown.textContent = '00:00';
            if (expiredMessage) expiredMessage.hidden = false;
        };

        const updateCountdown = () => {
            const remaining = expiresAt - Date.now();

            if (remaining <= 0) {
                expireOtp();
                window.clearInterval(countdownTimer);
                return;
            }

            if (countdown) countdown.textContent = formatRemaining(remaining);
        };

        otpInput?.addEventListener('input', () => {
            otpInput.value = otpInput.value.replace(/\D/g, '').slice(0, 6);
        });

        const countdownTimer = window.setInterval(updateCountdown, 1000);
        updateCountdown();
    }

    const passwordResetForm = document.querySelector('[data-password-reset-form]');
    if (passwordResetForm) {
        const passwordInput = passwordResetForm.querySelector('[name="password"]');
        const confirmationInput = passwordResetForm.querySelector('[name="password_confirmation"]');
        const mismatchMessage = passwordResetForm.querySelector('[data-password-match-error]');

        const validatePasswordMatch = () => {
            const mismatch = Boolean(confirmationInput?.value) && passwordInput?.value !== confirmationInput.value;

            if (confirmationInput) {
                confirmationInput.setCustomValidity(mismatch ? 'Hai mật khẩu chưa giống nhau.' : '');
            }
            if (mismatchMessage) mismatchMessage.hidden = !mismatch;

            return !mismatch;
        };

        passwordInput?.addEventListener('input', validatePasswordMatch);
        confirmationInput?.addEventListener('input', validatePasswordMatch);
        passwordResetForm.addEventListener('submit', (event) => {
            if (!validatePasswordMatch()) {
                event.preventDefault();
                confirmationInput?.reportValidity();
            }
        });
    }

    const avatarInput = document.querySelector('[data-avatar-input]');
    const avatarPreview = document.querySelector('[data-avatar-preview]');
    avatarInput?.addEventListener('change', () => {
        const [file] = avatarInput.files || [];
        if (!file || !avatarPreview) return;

        const imageUrl = URL.createObjectURL(file);
        avatarPreview.replaceChildren();
        const image = document.createElement('img');
        image.src = imageUrl;
        image.alt = 'Ảnh đại diện mới';
        image.onload = () => URL.revokeObjectURL(imageUrl);
        avatarPreview.append(image);
    });

    const bannerInput = document.querySelector('[data-banner-input]');
    const bannerPreview = document.querySelector('[data-banner-preview]');
    bannerInput?.addEventListener('change', () => {
        const [file] = bannerInput.files || [];
        if (!file || !bannerPreview) return;

        const imageUrl = URL.createObjectURL(file);
        bannerPreview.replaceChildren();
        const image = document.createElement('img');
        image.src = imageUrl;
        image.alt = 'Ảnh banner mới';
        image.onload = () => URL.revokeObjectURL(imageUrl);
        bannerPreview.append(image);
    });

    const closeToast = (toast) => {
        if (!toast || toast.classList.contains('is-hiding')) return;
        toast.classList.add('is-hiding');
        window.setTimeout(() => toast.remove(), 220);
    };

    const scheduleToastDismissal = (toast) => {
        const delay = toast.classList.contains('admin-toast-error') ? 6000 : 4200;
        window.setTimeout(() => closeToast(toast), delay);
    };

    document.querySelectorAll('[data-toast]').forEach(scheduleToastDismissal);

    document.addEventListener('click', (event) => {
        const closeButton = event.target.closest('[data-toast-close]');
        if (closeButton) closeToast(closeButton.closest('[data-toast]'));
    });

    window.MelodifyToast = {
        show(message, type = 'info') {
            const allowedTypes = ['success', 'error', 'warning', 'info'];
            const toastType = allowedTypes.includes(type) ? type : 'info';
            let stack = document.querySelector('[data-toast-stack]');

            if (!stack) {
                stack = document.createElement('div');
                stack.className = 'admin-toast-stack';
                stack.dataset.toastStack = '';
                stack.setAttribute('aria-live', 'polite');
                stack.setAttribute('aria-atomic', 'true');
                document.body.append(stack);
            }

            const toast = document.createElement('div');
            toast.className = `admin-toast admin-toast-${toastType}`;
            toast.dataset.toast = '';
            toast.setAttribute('role', toastType === 'error' ? 'alert' : 'status');

            const icon = document.createElement('span');
            icon.className = 'admin-toast-icon';
            icon.setAttribute('aria-hidden', 'true');
            icon.textContent = toastType === 'success' ? '✓' : '!';

            const text = document.createElement('span');
            text.className = 'admin-toast-message';
            text.textContent = message;

            const closeButton = document.createElement('button');
            closeButton.type = 'button';
            closeButton.className = 'admin-toast-close';
            closeButton.dataset.toastClose = '';
            closeButton.setAttribute('aria-label', 'Đóng thông báo');
            closeButton.textContent = '×';

            toast.append(icon, text, closeButton);
            stack.append(toast);
            scheduleToastDismissal(toast);
        },
    };

    document.querySelector('[data-appearance-form]')?.addEventListener('submit', () => {
        const form = document.querySelector('[data-appearance-form]');
        const preference = form?.querySelector('[name="theme"]')?.value;
        if (preference) {
            localStorage.setItem('melodify-theme-preference', preference);
            localStorage.setItem('melodify-theme', preference === 'system'
                ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
                : preference);
        }
    });

    const idleTimeout = Number(document.body.dataset.adminIdleTimeout || 0) * 1000;
    const logoutUrl = document.body.dataset.adminLogoutUrl;
    if (idleTimeout > 0 && logoutUrl) {
        let idleTimer;
        let idleLogoutSubmitted = false;

        const logoutAfterIdle = () => {
            if (idleLogoutSubmitted) return;
            idleLogoutSubmitted = true;

            const form = document.createElement('form');
            form.method = 'POST';
            form.action = logoutUrl;
            const token = document.querySelector('meta[name="csrf-token"]')?.content;
            if (token) {
                const csrf = document.createElement('input');
                csrf.type = 'hidden';
                csrf.name = '_token';
                csrf.value = token;
                form.append(csrf);
            }
            document.body.append(form);
            form.submit();
        };

        const resetIdleTimer = () => {
            window.clearTimeout(idleTimer);
            idleTimer = window.setTimeout(logoutAfterIdle, idleTimeout);
        };

        ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach((eventName) => {
            document.addEventListener(eventName, resetIdleTimer, { passive: true });
        });
        resetIdleTimer();
    }

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

(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia?.('(prefers-color-scheme: dark)');

    const resolveTheme = (preference) => {
        if (preference === 'dark' || preference === 'light') {
            return preference;
        }

        return mediaQuery?.matches ? 'dark' : 'light';
    };

    const applyTheme = (preference) => {
        const theme = resolveTheme(preference);
        root.setAttribute('data-admin-theme', theme);
        root.setAttribute('data-theme-preference', preference);
        root.style.colorScheme = theme;
    };

    const savedPreference = localStorage.getItem('melodify-theme-preference') || 'system';
    applyTheme(savedPreference);

    mediaQuery?.addEventListener?.('change', () => {
        const preference = localStorage.getItem('melodify-theme-preference') || 'system';

        if (preference === 'system') {
            applyTheme('system');
        }
    });

    window.MelodifyAdminTheme = {
        apply(preference) {
            const normalized = ['light', 'dark', 'system'].includes(preference) ? preference : 'system';
            const effectiveTheme = resolveTheme(normalized);
            localStorage.setItem('melodify-theme-preference', normalized);
            localStorage.setItem('melodify-theme', effectiveTheme);
            applyTheme(normalized);
        },
    };
})();
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-appearance-form] select[name="theme"]').forEach((select) => {
        select.value = localStorage.getItem('melodify-theme-preference')
            || select.value
            || 'system';

        select.addEventListener('change', () => {
            window.MelodifyAdminTheme?.apply(select.value);
        });
    });
});

document.addEventListener('submit', (event) => {
    const form = event.target;

    if (!(form instanceof HTMLFormElement) || !form.matches('[data-appearance-form]')) {
        return;
    }

    const preference = form.elements.namedItem('theme')?.value;
    window.MelodifyAdminTheme?.apply(preference);
});
