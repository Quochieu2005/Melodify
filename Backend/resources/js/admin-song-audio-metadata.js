const initializeSongAudioMetadata = () => {
    const audioInput = document.querySelector('#song-audio-file');
    const status = document.querySelector('[data-song-audio-metadata-status]');
    const coverInput = document.querySelector('#song-cover-image-file');
    const coverPreview = document.querySelector('[data-song-cover-preview]');

    if (!audioInput || !status) return;

    const fieldIds = [
        'song-title', 'song-artist', 'song-album', 'song-duration',
        'song-release-date', 'song-lyrics', 'song-synced-lyrics',
    ];
    const userEdited = new Set();
    const autoFilled = new Map();
    const initialValues = new Map(fieldIds.map((id) => [id, document.getElementById(id)?.value || '']));
    let autoCoverFile = null;
    let previewUrl = null;
    let changingCoverProgrammatically = false;
    let readSequence = 0;

    fieldIds.forEach((id) => {
        const field = document.getElementById(id);
        field?.addEventListener('input', (event) => {
            if (event.isTrusted) userEdited.add(id);
        });
        field?.addEventListener('change', (event) => {
            if (event.isTrusted) userEdited.add(id);
        });
    });

    const setStatus = (message, isError = false) => {
        status.textContent = message;
        status.classList.toggle('admin-field-error', isError);
        status.classList.toggle('admin-field-help', !isError);
    };

    const dispatchFieldEvents = (field) => {
        field.dispatchEvent(new Event('input', { bubbles: true }));
        field.dispatchEvent(new Event('change', { bubbles: true }));
    };

    const setMetadataValue = (id, value) => {
        const field = document.getElementById(id);
        const normalized = value == null ? '' : String(value).trim();
        if (!field || normalized === '') return false;
        if (userEdited.has(id)) return false;

        const previousAutoValue = autoFilled.get(id);
        const originalValue = initialValues.get(id) || '';
        if (field.value.trim() !== '' && field.value !== previousAutoValue && field.value !== originalValue) return false;

        field.value = normalized;
        autoFilled.set(id, normalized);
        dispatchFieldEvents(field);
        return true;
    };

    const setAlbumFromMetadata = (albumName) => {
        const field = document.getElementById('song-album');
        if (!field || !albumName || userEdited.has('song-album')) return false;

        const normalize = (value) => String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLocaleLowerCase('vi-VN')
            .replace(/[^\p{L}\p{N}]+/gu, ' ')
            .trim();
        const albumKey = normalize(albumName);
        const matchingOption = [...field.options].find((option) => option.value && normalize(option.textContent) === albumKey);
        const previousAutoValue = autoFilled.get('song-album');

        if (matchingOption) {
            const originalValue = initialValues.get('song-album') || '';
            if (field.value !== '' && field.value !== previousAutoValue && field.value !== originalValue) return false;
            field.value = matchingOption.value;
            autoFilled.set('song-album', matchingOption.value);
            dispatchFieldEvents(field);
            return true;
        }

        if (previousAutoValue && field.value === previousAutoValue) {
            field.value = '';
            autoFilled.set('song-album', '');
            dispatchFieldEvents(field);
        }
        return false;
    };

    const releasePreviewUrl = () => {
        if (!previewUrl) return;
        URL.revokeObjectURL(previewUrl);
        previewUrl = null;
    };

    const isSameFile = (first, second) => Boolean(first && second && (
        first === second
        || (first.name === second.name
            && first.size === second.size
            && first.type === second.type
            && first.lastModified === second.lastModified)
    ));

    const showCoverPreview = (file, label) => {
        if (!coverPreview) return;
        coverPreview.replaceChildren();
        releasePreviewUrl();
        if (!file) return;

        previewUrl = URL.createObjectURL(file);
        const image = document.createElement('img');
        image.src = previewUrl;
        image.alt = 'Ảnh bìa bài hát';
        image.style.width = '64px';
        image.style.height = '64px';
        image.style.objectFit = 'cover';
        image.style.borderRadius = '8px';
        image.addEventListener('error', () => {
            image.remove();
            const message = document.createElement('span');
            message.textContent = 'Không xem trước được ảnh này.';
            coverPreview.append(message);
        }, { once: true });
        const caption = document.createElement('span');
        caption.textContent = label;
        coverPreview.append(image, caption);
    };

    const assignEmbeddedCover = (picture) => {
        if (!coverInput || !picture?.data?.length) return false;

        const mimeType = String(picture.format || '').toLowerCase();
        const extension = ({
            'image/jpeg': 'jpg',
            'image/jpg': 'jpg',
            'image/png': 'png',
            'image/webp': 'webp',
        })[mimeType];
        if (!extension) return false;

        const currentCover = coverInput.files?.[0] || null;
        if (userEdited.has('song-cover-image-file') || (currentCover && !isSameFile(currentCover, autoCoverFile))) return false;

        try {
            const coverFile = new File([picture.data], `embedded-cover.${extension}`, { type: mimeType });
            const transfer = new DataTransfer();
            transfer.items.add(coverFile);
            changingCoverProgrammatically = true;
            coverInput.files = transfer.files;
            autoCoverFile = coverFile;
            showCoverPreview(coverFile, 'Ảnh bìa nhúng trong file — sẽ tải lên khi lưu.');
            coverInput.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
        } catch {
            return false;
        } finally {
            changingCoverProgrammatically = false;
        }
    };

    const clearPreviousEmbeddedCover = () => {
        if (!coverInput || !autoCoverFile || !isSameFile(coverInput.files?.[0], autoCoverFile)) return;
        changingCoverProgrammatically = true;
        coverInput.value = '';
        autoCoverFile = null;
        showCoverPreview(null, '');
        coverInput.dispatchEvent(new Event('change', { bubbles: true }));
        changingCoverProgrammatically = false;
    };

    coverInput?.addEventListener('change', (event) => {
        if (changingCoverProgrammatically) return;
        const file = coverInput.files?.[0] || null;
        if (event.isTrusted) {
            userEdited.add('song-cover-image-file');
            autoCoverFile = null;
        }
        showCoverPreview(file, file ? `${file.name} — sẽ tải lên khi lưu.` : '');
    });

    const getBrowserDuration = (file) => new Promise((resolve) => {
        const objectUrl = URL.createObjectURL(file);
        const audio = document.createElement('audio');
        let settled = false;
        const finish = (duration = null) => {
            if (settled) return;
            settled = true;
            clearTimeout(timeout);
            audio.removeAttribute('src');
            audio.load();
            URL.revokeObjectURL(objectUrl);
            resolve(Number.isFinite(duration) && duration > 0 ? duration : null);
        };
        const timeout = setTimeout(() => finish(), 6000);
        audio.preload = 'metadata';
        audio.addEventListener('loadedmetadata', () => finish(audio.duration), { once: true });
        audio.addEventListener('error', () => finish(), { once: true });
        audio.src = objectUrl;
    });

    const formatDuration = (seconds) => {
        if (!Number.isFinite(seconds) || seconds <= 0) return '';
        const total = Math.round(seconds);
        const hours = Math.floor(total / 3600);
        const minutes = Math.floor((total % 3600) / 60);
        const remainder = total % 60;
        return hours > 0
            ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
            : `${minutes}:${String(remainder).padStart(2, '0')}`;
    };

    const filenameTitle = (file) => file.name.replace(/\.[^.]+$/, '').replace(/[._]+/g, ' ').trim();

    const readAudioMetadata = async (file, sequence) => {
        setStatus(`Đang đọc thông tin trong “${file.name}”…`);
        try {
            const { parseBlob } = await import('music-metadata');
            const metadata = await parseBlob(file, { duration: true });
            if (sequence !== readSequence) return;

            const common = metadata.common || {};
            const taggedTitle = String(common.title || '').trim();
            const brokenTitleTag = (taggedTitle.match(/\?/g) || []).length >= 2;
            const titleFromTag = Boolean(taggedTitle) && !brokenTitleTag;
            const title = titleFromTag ? taggedTitle : filenameTitle(file);
            const artist = String(common.artist || common.artists?.join(', ') || '').trim();
            const album = String(common.album || '').trim();
            const duration = Number(metadata.format?.duration) || await getBrowserDuration(file);
            const releaseDate = typeof common.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(common.date)
                ? common.date
                : '';
            const lyrics = Array.isArray(common.lyrics)
                ? common.lyrics.map((entry) => typeof entry === 'string' ? entry : (entry?.text || entry?.lyrics || '')).filter(Boolean).join('\n').trim()
                : '';

            setMetadataValue('song-title', title);
            setMetadataValue('song-artist', artist);
            if (album) setAlbumFromMetadata(album);
            if (duration) setMetadataValue('song-duration', Math.round(duration));
            if (releaseDate) setMetadataValue('song-release-date', releaseDate);
            if (lyrics) {
                const isSynced = /\[\d{1,2}:\d{2}(?:\.\d+)?\]/.test(lyrics);
                setMetadataValue(isSynced ? 'song-synced-lyrics' : 'song-lyrics', lyrics);
            }

            const coverAdded = common.picture?.length ? assignEmbeddedCover(common.picture[0]) : false;
            if (!common.picture?.length) clearPreviousEmbeddedCover();

            const summary = [
                `Tên: ${title}${titleFromTag ? '' : ` (từ tên file${brokenTitleTag ? ', tag bị lỗi ký tự' : ''})`}`,
                artist ? `Nghệ sĩ: ${artist}` : '',
                album ? `Album: ${album}${setAlbumFromMetadata(album) ? ' (đã khớp album trong Admin)' : ' (chưa khớp album có sẵn)'}` : '',
                duration ? `Thời lượng: ${formatDuration(duration)}` : '',
                common.date ? `Ngày trong tag: ${common.date}` : '',
                lyrics ? 'Đã tìm thấy lời trong tag.' : '',
                coverAdded ? 'Đã chọn ảnh bìa nhúng để tải lên cùng bài hát.' : common.picture?.length ? 'Có ảnh bìa nhúng nhưng định dạng chưa hỗ trợ tự tải.' : '',
            ].filter(Boolean).join(' · ');
            setStatus(`${summary || 'Không tìm thấy tag mô tả trong file.'} File chỉ được gửi khi lưu biểu mẫu.`);
        } catch (error) {
            if (sequence !== readSequence) return;
            clearPreviousEmbeddedCover();
            const duration = await getBrowserDuration(file);
            if (sequence !== readSequence) return;
            setMetadataValue('song-title', filenameTitle(file));
            if (duration) setMetadataValue('song-duration', Math.round(duration));
            setStatus(`Không đọc được tag metadata của file. Đã thử lấy thời lượng bằng trình duyệt${duration ? ` (${formatDuration(duration)})` : ''}; tên bài tạm lấy từ tên file. Bạn có thể nhập các thông tin còn thiếu thủ công.`, true);
            console.warn('Could not read song audio metadata.', error);
        }
    };

    audioInput.addEventListener('change', () => {
        const file = audioInput.files?.[0];
        if (!file) return;
        readSequence += 1;
        void readAudioMetadata(file, readSequence);
    });
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSongAudioMetadata, { once: true });
} else {
    initializeSongAudioMetadata();
}
