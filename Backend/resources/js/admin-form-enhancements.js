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
