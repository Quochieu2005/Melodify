const renderMediaPreview = (preview, imageUrl, caption, temporary = false) => {
    if (!preview) return;

    preview.replaceChildren();

    if (!imageUrl) {
        const empty = document.createElement('span');
        empty.textContent = 'Chưa có ảnh xem trước';
        preview.append(empty);
        return;
    }

    const image = document.createElement('img');
    image.src = imageUrl;
    image.alt = caption || 'Ảnh được chọn';
    image.loading = 'lazy';
    preview.append(image);

    const label = document.createElement('span');
    label.textContent = temporary ? 'Ảnh mới, sẽ tải lên khi lưu' : (caption || 'Ảnh đã chọn');
    preview.append(label);
};

document.querySelectorAll('[data-media-picker]').forEach((picker) => {
    const preview = picker.querySelector('[data-media-preview]');
    const fileInput = picker.querySelector('[data-media-input]');
    const cards = Array.from(picker.querySelectorAll('[data-media-card]'));

    const updateCards = () => cards.forEach((card) => {
        card.classList.toggle('is-selected', Boolean(card.querySelector('input')?.checked));
    });

    updateCards();

    fileInput?.addEventListener('change', () => {
        const file = fileInput.files?.[0];
        if (!file) return;

        cards.forEach((card) => {
            const input = card.querySelector('input');
            if (input) input.checked = false;
        });
        updateCards();

        const reader = new FileReader();
        reader.addEventListener('load', () => renderMediaPreview(preview, String(reader.result || ''), file.name, true), { once: true });
        reader.readAsDataURL(file);
    });

    cards.forEach((card) => {
        const input = card.querySelector('input');
        input?.addEventListener('change', () => {
            if (!input.checked) return;
            if (fileInput) fileInput.value = '';
            renderMediaPreview(preview, card.dataset.imageUrl || '', card.dataset.imageName || 'Ảnh từ kho');
            updateCards();
        });
    });
});

document.querySelectorAll('[data-selection-panel]').forEach((panel) => {
    const search = panel.querySelector('[data-selection-search]');
    const options = Array.from(panel.querySelectorAll('[data-selection-option]'));

    search?.addEventListener('input', () => {
        const keyword = search.value.trim().toLocaleLowerCase('vi-VN');
        options.forEach((option) => {
            option.hidden = keyword !== '' && !option.textContent.toLocaleLowerCase('vi-VN').includes(keyword);
        });
    });
});

const playlistSongPanel = document.querySelector('[data-playlist-song-panel]');
const playlistArtistPanel = document.querySelector('[data-playlist-artist-panel]');

if (playlistSongPanel && playlistArtistPanel) {
    const songInputs = [...playlistSongPanel.querySelectorAll('[data-playlist-song]')];
    const artistInputs = [...playlistArtistPanel.querySelectorAll('[data-playlist-auto-artist]')];

    const syncPlaylistArtists = () => {
        const selectedArtistIds = new Set();

        songInputs
            .filter((input) => input.checked)
            .forEach((input) => {
                String(input.dataset.artistIds || '')
                    .split(',')
                    .map((id) => id.trim())
                    .filter(Boolean)
                    .forEach((id) => selectedArtistIds.add(id));
            });

        artistInputs.forEach((input) => {
            input.checked = selectedArtistIds.has(String(input.value));
            input.disabled = true;
        });
    };

    songInputs.forEach((input) => input.addEventListener('change', syncPlaylistArtists));
    syncPlaylistArtists();
}

const sortOrderForm = document.querySelector('[data-sort-order-form]');
const sortOrderInput = sortOrderForm?.querySelector('[data-sort-order-input]');
const sortOrderType = sortOrderForm?.querySelector('[data-playlist-type], [data-topic-type]');
const sortOrderCustom = sortOrderForm?.querySelector('[data-playlist-type-custom], [data-topic-type-custom]');

if (sortOrderForm && sortOrderInput && sortOrderType) {
    let suggestions = {};
    try {
        suggestions = JSON.parse(sortOrderForm.dataset.sortOrderGroups || '{}');
    } catch {
        suggestions = {};
    }

    let userChangedOrder = false;
    let lastSuggestedOrder = sortOrderInput.value;

    const groupKey = () => {
        const type = sortOrderType.value || '';
        if (type === 'custom') return `custom:${sortOrderCustom?.value.trim() || ''}`;
        return type;
    };

    const syncSortOrder = () => {
        if (userChangedOrder) return;
        const key = groupKey();
        const nextOrder = Object.prototype.hasOwnProperty.call(suggestions, key)
            ? suggestions[key]
            : 0;
        sortOrderInput.value = String(nextOrder);
        lastSuggestedOrder = sortOrderInput.value;
    };

    sortOrderInput.addEventListener('input', () => {
        userChangedOrder = sortOrderInput.value !== lastSuggestedOrder;
    });
    sortOrderType.addEventListener('change', syncSortOrder);
    sortOrderCustom?.addEventListener('input', syncSortOrder);
    syncSortOrder();
}
