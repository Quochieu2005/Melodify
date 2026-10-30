@php
    $isAuthenticated = auth('admin')->check();
    $backUrl = $isAuthenticated ? route('admin.dashboard') : route('admin.login');
    $backLabel = $isAuthenticated ? 'Về trang tổng quan' : 'Về trang đăng nhập';
@endphp
<!DOCTYPE html>
<html lang="vi" data-admin-theme="light">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $status ?? 500 }} · Melodify Admin</title>
    @vite(['resources/css/app.css', 'resources/js/app.js'])
    <style>
        .admin-error-page { align-items: center; background: var(--admin-bg, #f4f7f7); display: flex; justify-content: center; min-height: 100vh; padding: 24px; }
        .admin-error-card { background: var(--admin-surface, #fff); border: 1px solid var(--admin-border, #dce5e5); border-radius: 18px; box-shadow: 0 18px 45px rgb(21 38 37 / 9%); max-width: 560px; padding: 42px; text-align: center; width: 100%; }
        .admin-error-brand { color: var(--admin-accent, #00a8b8); font-size: 15px; font-weight: 800; letter-spacing: .04em; text-decoration: none; }
        .admin-error-status { color: var(--admin-accent, #00a8b8); font-size: clamp(58px, 12vw, 92px); font-weight: 800; line-height: 1; margin: 28px 0 16px; }
        .admin-error-card h1 { color: var(--admin-text, #142638); font-size: 24px; margin: 0 0 10px; }
        .admin-error-card p { color: var(--admin-text-secondary, #637276); line-height: 1.6; margin: 0 auto 26px; max-width: 440px; }
        .admin-error-card a:last-child { display: inline-flex; }
        [data-admin-theme="dark"] .admin-error-page { background: var(--admin-bg, #0d1b1a); }
    </style>
</head>
<body class="admin-body">
    <main class="admin-error-page">
        <section class="admin-error-card" aria-labelledby="error-title">
            <a class="admin-error-brand" href="{{ $backUrl }}">Melodify Admin</a>
            <div class="admin-error-status">{{ $status ?? 500 }}</div>
            <h1 id="error-title">{{ $title ?? 'Đã xảy ra lỗi' }}</h1>
            <p>{{ $message ?? 'Hệ thống chưa thể hoàn tất yêu cầu này. Vui lòng thử lại sau.' }}</p>
            <a class="ant-btn ant-btn-primary" href="{{ $backUrl }}">{{ $backLabel }}</a>
        </section>
    </main>
</body>
</html>
