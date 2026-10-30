const planCodeAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const createPlanCode = () => {
    const values = new Uint32Array(8);
    crypto.getRandomValues(values);

    return [...values]
        .map((value) => planCodeAlphabet[value % planCodeAlphabet.length])
        .join('');
};

const formatPlanPrice = (value) => {
    const digits = String(value).replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 12);

    return digits ? Number(digits).toLocaleString('vi-VN') : '';
};

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-plan-code-form]').forEach((wrapper) => {
        const input = wrapper.querySelector('[data-plan-code]');
        const button = wrapper.querySelector('[data-generate-plan-code]');
        const status = wrapper.parentElement?.querySelector('[data-plan-code-status]');

        if (!input || !button) return;

        button.addEventListener('click', () => {
            input.value = createPlanCode();
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.focus();
            input.select();

            if (status) {
                status.textContent = 'Đã tạo mã mới. Bạn vẫn có thể sửa lại trước khi lưu.';
            }
        });
    });

    document.querySelectorAll('[data-plan-price-form]').forEach((wrapper) => {
        const displayInput = wrapper.querySelector('[data-plan-price-display]');
        const valueInput = wrapper.querySelector('[data-plan-price-value]');
        const form = wrapper.closest('form');

        if (!displayInput || !valueInput) return;

        const syncPrice = () => {
            const digits = displayInput.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 12);
            valueInput.value = digits;
            displayInput.value = formatPlanPrice(digits);
        };

        syncPrice();
        displayInput.addEventListener('input', syncPrice);
        form?.addEventListener('submit', syncPrice);
    });
});
