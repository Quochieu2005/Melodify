document.addEventListener('DOMContentLoaded', () => {
    const navigation = document.querySelector('[data-admin-sidebar] .admin-sider-nav-container');

    if (!navigation) return;

    const activeItem = navigation.querySelector(
        '.ant-menu-item-selected, .admin-catalog-sidebar-list a.is-selected'
    );

    // Sau khi chuyển trang, đưa đúng mục đang chọn vào vùng nhìn thấy của
    // sidebar; không đặt lại thanh cuộn về đầu menu.
    requestAnimationFrame(() => {
        activeItem?.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' });
    });
});
