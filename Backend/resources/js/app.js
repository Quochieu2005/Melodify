/**
 * Melodify Admin Interface - Ant Design Vanilla JS Controllers
 */
document.addEventListener('DOMContentLoaded', () => {
    const slugify = (value) => value
        .replace(/[đĐơƠưƯ]/g, (character) => ({
            đ: 'd', Đ: 'D', ơ: 'o', Ơ: 'O', ư: 'u', Ư: 'U',
        })[character] || character)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '-')
        .replace(/-{2,}/g, '-')
        .replace(/^[-_]+|[-_]+$/g, '')
        .slice(0, 220);

    document.querySelectorAll('[data-slug-source]').forEach((source) => {
        const form = source.closest('form') || document;
        const targetId = source.dataset.slugSource;
        const slugInput = [...form.querySelectorAll('input[name="slug"]')]
            .find((input) => input.id === targetId);
        const resetButton = [...form.querySelectorAll('[data-slug-reset]')]
            .find((button) => button.dataset.slugReset === targetId);

        if (!targetId || !slugInput) return;

        const sourceSlug = () => {
            const maxLength = Number(slugInput.maxLength);
            const generatedSlug = slugify(source.value || '');

            return maxLength > 0 ? generatedSlug.slice(0, maxLength) : generatedSlug;
        };
        let followsSource = slugInput.value.trim() === '' || slugInput.value.trim() === sourceSlug();

        const syncSlug = () => {
            if (followsSource) slugInput.value = sourceSlug();
        };

        source.addEventListener('input', syncSlug);
        slugInput.addEventListener('input', () => {
            const typedSlug = slugInput.value.trim();
            followsSource = typedSlug === '' || typedSlug === sourceSlug();
        });
        resetButton?.addEventListener('click', () => {
            followsSource = true;
            syncSlug();
            slugInput.focus();
        });

        syncSlug();
    });

    document.querySelectorAll('[data-password-toggle]').forEach((toggle) => {
        const input = toggle.closest('.admin-login-input-wrap')?.querySelector('[data-password-input]')
            || document.getElementById(toggle.dataset.passwordFor || '');
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

    const adminSelectAll = document.querySelector('[data-admin-select-all]');
    const adminRecipients = [...document.querySelectorAll('[data-admin-recipient]')];
    const adminBulkSend = document.querySelector('[data-admin-bulk-send]');

    if (adminSelectAll && adminBulkSend) {
        const updateBulkSelection = () => {
            const enabledRecipients = adminRecipients.filter((input) => !input.disabled);
            const selectedRecipients = enabledRecipients.filter((input) => input.checked);
            adminBulkSend.disabled = selectedRecipients.length === 0;
            adminSelectAll.disabled = enabledRecipients.length === 0;
            adminSelectAll.checked = enabledRecipients.length > 0 && selectedRecipients.length === enabledRecipients.length;
            adminSelectAll.indeterminate = selectedRecipients.length > 0 && selectedRecipients.length < enabledRecipients.length;
        };

        adminSelectAll.addEventListener('change', () => {
            adminRecipients.forEach((input) => {
                if (!input.disabled) input.checked = adminSelectAll.checked;
            });
            updateBulkSelection();
        });

        adminRecipients.forEach((input) => input.addEventListener('change', updateBulkSelection));
        updateBulkSelection();
    }

    const bannerSelectAll = document.querySelector('[data-banner-select-all]');
    const bannerSelections = [...document.querySelectorAll('[data-banner-select]')];
    const bannerBulkDelete = document.querySelector('[data-banner-bulk-delete]');
    const bannerSelectedCount = document.querySelector('[data-banner-selected-count]');

    if (bannerSelectAll && bannerBulkDelete) {
        const updateBannerSelection = () => {
            const selectedCount = bannerSelections.filter((input) => input.checked).length;
            bannerBulkDelete.disabled = selectedCount === 0;
            bannerSelectAll.checked = bannerSelections.length > 0 && selectedCount === bannerSelections.length;
            bannerSelectAll.indeterminate = selectedCount > 0 && selectedCount < bannerSelections.length;
            if (bannerSelectedCount) bannerSelectedCount.textContent = `(${selectedCount})`;
        };

        bannerSelectAll.addEventListener('change', () => {
            bannerSelections.forEach((input) => {
                input.checked = bannerSelectAll.checked;
            });
            updateBannerSelection();
        });

        bannerSelections.forEach((input) => input.addEventListener('change', updateBannerSelection));
        updateBannerSelection();
    }

    const catalogSelectAll = document.querySelector('[data-catalog-select-all]');
    const catalogSelections = [...document.querySelectorAll('[data-catalog-select]')];
    const catalogBulkDelete = document.querySelector('[data-catalog-bulk-delete]');
    const catalogSelectedCount = document.querySelector('[data-catalog-selected-count]');

    if (catalogSelectAll && catalogBulkDelete) {
        const updateCatalogSelection = () => {
            const selectedCount = catalogSelections.filter((input) => input.checked).length;
            catalogBulkDelete.disabled = selectedCount === 0;
            catalogSelectAll.checked = catalogSelections.length > 0 && selectedCount === catalogSelections.length;
            catalogSelectAll.indeterminate = selectedCount > 0 && selectedCount < catalogSelections.length;
            if (catalogSelectedCount) catalogSelectedCount.textContent = `(${selectedCount})`;
        };

        catalogSelectAll.addEventListener('change', () => {
            catalogSelections.forEach((input) => {
                input.checked = catalogSelectAll.checked;
            });
            updateCatalogSelection();
        });

        catalogSelections.forEach((input) => input.addEventListener('change', updateCatalogSelection));
        updateCatalogSelection();
    }

    const songSelectAll = document.querySelector('[data-song-select-all]');
    const songSelections = [...document.querySelectorAll('[data-song-select]')];
    const songBulkDelete = document.querySelector('[data-song-bulk-delete]');
    const songSelectedCount = document.querySelector('[data-song-selected-count]');

    if (songSelectAll && songBulkDelete) {
        const updateSongSelection = () => {
            const selectedCount = songSelections.filter((input) => input.checked).length;
            songBulkDelete.disabled = selectedCount === 0;
            songSelectAll.checked = songSelections.length > 0 && selectedCount === songSelections.length;
            songSelectAll.indeterminate = selectedCount > 0 && selectedCount < songSelections.length;
            if (songSelectedCount) songSelectedCount.textContent = `(${selectedCount})`;
        };

        songSelectAll.addEventListener('change', () => {
            songSelections.forEach((input) => {
                input.checked = songSelectAll.checked;
            });
            updateSongSelection();
        });

        songSelections.forEach((input) => input.addEventListener('change', updateSongSelection));
        updateSongSelection();
    }

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

    document.querySelectorAll('input[type="number"][name="sort_order"]').forEach((sortOrderInput) => {
        const normalizeSortOrder = () => {
            if (/^\d+$/.test(sortOrderInput.value)) {
                sortOrderInput.value = String(Number(sortOrderInput.value));
            }
        };

        if (sortOrderInput.value === '0') sortOrderInput.select();
        sortOrderInput.addEventListener('focus', () => {
            if (sortOrderInput.value === '0') sortOrderInput.select();
        });
        sortOrderInput.addEventListener('keydown', (event) => {
            if (sortOrderInput.value === '0' && /^\d$/.test(event.key)) {
                sortOrderInput.select();
            }
        });
        sortOrderInput.addEventListener('input', normalizeSortOrder);
        sortOrderInput.addEventListener('blur', normalizeSortOrder);
    });

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

    const artistAvatarUrl = document.querySelector('[data-artist-avatar-url]');
    const artistAvatarFile = document.querySelector('[data-artist-avatar-file]');
    const artistAvatarFileName = document.querySelector('[data-artist-avatar-file-name]');
    const artistAvatarPreview = document.querySelector('[data-artist-avatar-preview]');
    const artistNameInput = document.querySelector('#artist-name');
    const artistNamePreview = document.querySelector('[data-artist-name-preview]');

    if (artistAvatarUrl && artistAvatarFile && artistAvatarPreview) {
        const fallback = artistAvatarPreview.dataset.fallback || 'N';
        const renderFallback = () => {
            artistAvatarPreview.replaceChildren();
            const fallbackText = document.createElement('span');
            fallbackText.textContent = fallback;
            artistAvatarPreview.append(fallbackText);
        };

        const renderArtistAvatar = () => {
            const url = artistAvatarUrl.value.trim();
            if (!url) {
                renderFallback();
                return;
            }

            const image = document.createElement('img');
            image.alt = 'Ảnh đại diện nghệ sĩ';
            image.src = url;
            image.addEventListener('error', renderFallback, { once: true });
            artistAvatarPreview.replaceChildren(image);
        };

        artistAvatarUrl.addEventListener('input', () => {
            if (artistAvatarUrl.value.trim()) {
                artistAvatarFile.value = '';
                if (artistAvatarFileName) artistAvatarFileName.textContent = 'Chưa chọn tệp.';
            }
            renderArtistAvatar();
        });
        artistAvatarUrl.addEventListener('change', renderArtistAvatar);
        artistAvatarFile.addEventListener('change', () => {
            const [file] = artistAvatarFile.files || [];
            if (!file) {
                if (artistAvatarFileName) artistAvatarFileName.textContent = 'Chưa chọn tệp.';
                return;
            }

            artistAvatarUrl.value = '';
            if (artistAvatarFileName) artistAvatarFileName.textContent = `Đã chọn: ${file.name}`;

            const imageUrl = URL.createObjectURL(file);
            const image = document.createElement('img');
            image.alt = 'Ảnh đại diện mới';
            image.src = imageUrl;
            image.onload = () => URL.revokeObjectURL(imageUrl);
            image.addEventListener('error', renderFallback, { once: true });
            artistAvatarPreview.replaceChildren(image);
        });
    }

    artistNameInput?.addEventListener('input', () => {
        if (artistNamePreview) artistNamePreview.textContent = artistNameInput.value.trim() || 'Tên nghệ sĩ';
    });

    const topicImageInput = document.querySelector('[data-topic-image-input]');
    const topicImagePreview = document.querySelector('[data-topic-image-preview]');
    const topicImageLibrary = document.querySelectorAll('[data-topic-image-library]');

    if (topicImageInput && topicImagePreview) {
        const renderTopicImage = (imageUrl, caption, temporary = false) => {
            topicImagePreview.replaceChildren();

            if (!imageUrl) {
                const empty = document.createElement('span');
                empty.textContent = 'Chưa có ảnh xem trước';
                topicImagePreview.append(empty);
                return;
            }

            const image = document.createElement('img');
            image.src = imageUrl;
            image.alt = 'Ảnh chủ đề xem trước';
            if (temporary) image.onload = () => URL.revokeObjectURL(imageUrl);

            const label = document.createElement('span');
            label.textContent = caption;
            topicImagePreview.append(image, label);
        };

        topicImageInput.addEventListener('change', () => {
            const [file] = topicImageInput.files || [];
            if (!file) return;

            topicImageLibrary.forEach((radio) => {
                radio.checked = false;
            });
            renderTopicImage(URL.createObjectURL(file), `Ảnh mới: ${file.name}`, true);
        });

        topicImageLibrary.forEach((radio) => {
            radio.addEventListener('change', () => {
                if (radio.checked) renderTopicImage(radio.dataset.imageUrl, 'Ảnh đã lưu trong kho');
            });
        });
    }

    const playlistImageInput = document.querySelector('[data-playlist-image-input]');
    const playlistImagePreview = document.querySelector('[data-playlist-image-preview]');
    const playlistImageLibrary = document.querySelectorAll('[data-playlist-image-library]');

    if (playlistImageInput && playlistImagePreview) {
        const renderPlaylistImage = (imageUrl, caption, temporary = false) => {
            playlistImagePreview.replaceChildren();

            if (!imageUrl) {
                const empty = document.createElement('span');
                empty.textContent = 'Chưa có ảnh xem trước';
                playlistImagePreview.append(empty);
                return;
            }

            const image = document.createElement('img');
            image.src = imageUrl;
            image.alt = 'Ảnh bìa playlist xem trước';
            if (temporary) image.onload = () => URL.revokeObjectURL(imageUrl);

            const label = document.createElement('span');
            label.textContent = caption;
            playlistImagePreview.append(image, label);
        };

        playlistImageInput.addEventListener('change', () => {
            const [file] = playlistImageInput.files || [];
            if (!file) return;

            playlistImageLibrary.forEach((radio) => {
                radio.checked = false;
            });
            renderPlaylistImage(URL.createObjectURL(file), `Ảnh mới: ${file.name}`, true);
        });

        playlistImageLibrary.forEach((radio) => {
            radio.addEventListener('change', () => {
                if (!radio.checked) return;

                playlistImageInput.value = '';
                renderPlaylistImage(radio.dataset.imageUrl, 'Ảnh đã lưu trong kho');
            });
        });

        const selectedLibraryImage = [...playlistImageLibrary].find((radio) => radio.checked);
        if (selectedLibraryImage) {
            renderPlaylistImage(selectedLibraryImage.dataset.imageUrl, 'Ảnh đã lưu trong kho');
        }
    }

    const topicType = document.querySelector('[data-topic-type]');
    const topicTypeCustomField = document.querySelector('[data-topic-type-custom-field]');
    const topicTypeCustom = document.querySelector('[data-topic-type-custom]');
    const syncTopicTypeCustom = () => {
        const isCustom = topicType?.value === 'custom';
        if (topicTypeCustomField) topicTypeCustomField.hidden = !isCustom;
        if (topicTypeCustom) topicTypeCustom.required = isCustom;
        if (!isCustom && topicTypeCustom) topicTypeCustom.value = '';
    };
    topicType?.addEventListener('change', syncTopicTypeCustom);
    syncTopicTypeCustom();

    const playlistType = document.querySelector('[data-playlist-type]');
    const playlistTypeCustomField = document.querySelector('[data-playlist-type-custom-field]');
    const playlistTypeCustom = document.querySelector('[data-playlist-type-custom]');
    const syncPlaylistTypeCustom = () => {
        const isCustom = playlistType?.value === 'custom';
        if (playlistTypeCustomField) playlistTypeCustomField.hidden = !isCustom;
        if (playlistTypeCustom) playlistTypeCustom.required = isCustom;
        if (!isCustom && playlistTypeCustom) playlistTypeCustom.value = '';
    };
    playlistType?.addEventListener('change', syncPlaylistTypeCustom);
    syncPlaylistTypeCustom();

    const bannerInput = document.querySelector('[data-banner-input]');
    const bannerPreview = document.querySelector('[data-banner-preview]');
    const bannerFileName = document.querySelector('[data-banner-file-name]');
    bannerInput?.addEventListener('change', () => {
        const [file] = bannerInput.files || [];
        if (!file || !bannerPreview) return;

        if (bannerFileName) bannerFileName.textContent = `Đã chọn: ${file.name}`;

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

    const deleteForms = [...document.querySelectorAll('[data-confirm-delete], [data-confirm-delete-bulk], [data-confirm-delete-all]')];
    if (deleteForms.length > 0) {
        const deleteModal = document.createElement('div');
        deleteModal.className = 'admin-confirm-modal';
        deleteModal.hidden = true;
        deleteModal.innerHTML = `
            <div class="admin-confirm-backdrop" data-confirm-backdrop></div>
            <div class="admin-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-confirm-delete-title" aria-describedby="admin-confirm-delete-message" tabindex="-1">
                <button type="button" class="admin-confirm-close" data-confirm-cancel aria-label="Đóng hộp thoại">
                    <span aria-hidden="true">×</span>
                </button>
                <div class="admin-confirm-body">
                    <div class="admin-confirm-icon" aria-hidden="true">!</div>
                    <div>
                        <h2 id="admin-confirm-delete-title">Xóa mục này?</h2>
                        <p id="admin-confirm-delete-message">Bạn có chắc chắn muốn xóa mục này không? Dữ liệu đã xóa sẽ không thể khôi phục.</p>
                    </div>
                </div>
                <div class="admin-confirm-actions">
                    <button type="button" class="ant-btn" data-confirm-cancel>Hủy</button>
                    <button type="button" class="ant-btn admin-confirm-delete-button" data-confirm-submit>Xóa vĩnh viễn</button>
                </div>
            </div>
        `;
        document.body.append(deleteModal);

        const deleteDialog = deleteModal.querySelector('.admin-confirm-dialog');
        const deleteTitle = deleteModal.querySelector('#admin-confirm-delete-title');
        const deleteMessage = deleteModal.querySelector('#admin-confirm-delete-message');
        const cancelButtons = [...deleteModal.querySelectorAll('[data-confirm-cancel]')];
        const confirmButton = deleteModal.querySelector('[data-confirm-submit]');
        const defaultDeleteTitle = 'Xóa mục này?';
        const defaultDeleteMessage = 'Bạn có chắc chắn muốn xóa mục này không? Dữ liệu đã xóa sẽ không thể khôi phục.';
        let pendingDeleteForm = null;
        let restoreFocusElement = null;

        const closeDeleteModal = () => {
            deleteModal.hidden = true;
            document.body.classList.remove('admin-modal-open');

            if (restoreFocusElement?.isConnected) restoreFocusElement.focus();

            pendingDeleteForm = null;
            restoreFocusElement = null;
            if (deleteTitle) deleteTitle.textContent = defaultDeleteTitle;
            if (deleteMessage) deleteMessage.textContent = defaultDeleteMessage;
            if (confirmButton) {
                confirmButton.disabled = false;
                confirmButton.textContent = 'Xóa vĩnh viễn';
            }
        };

        const openDeleteModal = (form, submitter) => {
            pendingDeleteForm = form;
            restoreFocusElement = submitter;
            if (form.matches('[data-confirm-delete-all]')) {
                const totalCount = form.dataset.confirmDeleteCount || 'toàn bộ';
                const resourceLabel = form.dataset.confirmResource || 'banner';
                if (deleteTitle) deleteTitle.textContent = `Xóa toàn bộ ${resourceLabel}?`;
                if (deleteMessage) deleteMessage.textContent = `Bạn có chắc chắn muốn xóa tất cả ${totalCount} ${resourceLabel} không? Dữ liệu đã xóa sẽ không thể khôi phục.`;
            } else if (form.matches('[data-confirm-delete-bulk]')) {
                const resourceLabel = form.dataset.confirmResource || 'banner';
                const countSelector = form.dataset.confirmCountSelector || '[data-banner-select]:checked';
                const selectedCount = document.querySelectorAll(countSelector).length;
                if (deleteTitle) deleteTitle.textContent = `Xóa ${selectedCount} ${resourceLabel} đã chọn?`;
                if (deleteMessage) deleteMessage.textContent = `Bạn có chắc chắn muốn xóa ${selectedCount} ${resourceLabel} này không? Dữ liệu đã xóa sẽ không thể khôi phục.`;
            } else {
                if (deleteTitle) deleteTitle.textContent = defaultDeleteTitle;
                if (deleteMessage) deleteMessage.textContent = defaultDeleteMessage;
            }
            deleteModal.hidden = false;
            document.body.classList.add('admin-modal-open');
            window.requestAnimationFrame(() => deleteDialog?.focus());
        };

        deleteForms.forEach((form) => {
            form.addEventListener('submit', (event) => {
                if (form.dataset.confirmed === 'true') {
                    delete form.dataset.confirmed;
                    return;
                }

                event.preventDefault();
                openDeleteModal(form, event.submitter || form.querySelector('button[type="submit"]'));
            });
        });

        cancelButtons.forEach((button) => button.addEventListener('click', closeDeleteModal));
        deleteModal.querySelector('[data-confirm-backdrop]')?.addEventListener('click', closeDeleteModal);
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && !deleteModal.hidden) {
                event.preventDefault();
                closeDeleteModal();
            }
        });

        confirmButton?.addEventListener('click', () => {
            if (!pendingDeleteForm) return;

            const form = pendingDeleteForm;
            confirmButton.disabled = true;
            confirmButton.textContent = 'Đang xóa...';
            form.dataset.confirmed = 'true';
            window.setTimeout(() => HTMLFormElement.prototype.submit.call(form), 80);
        });
    }

    document.querySelectorAll('[data-submit-once]').forEach((form) => {
        form.addEventListener('submit', () => {
            const submitButton = form.querySelector('button[type="submit"]');

            if (!submitButton) return;

            submitButton.disabled = true;
            submitButton.textContent = 'Đang lưu...';
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
