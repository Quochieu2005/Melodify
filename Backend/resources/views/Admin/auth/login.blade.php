@extends('layouts.auth')

@section('content')
<main class="admin-login-page">
    <section class="admin-login-visual" aria-label="Melodify Admin">
        <a href="{{ route('admin.login') }}" class="admin-login-brand">
            <span class="admin-login-brand-mark">♪</span>
            <span>Melodify</span>
        </a>
        <div class="admin-login-message">
            <div class="admin-login-art" aria-hidden="true">
                <span class="admin-login-disc"></span>
                <span class="admin-login-wave admin-login-wave-one"></span>
                <span class="admin-login-wave admin-login-wave-two"></span>
            </div>
            <p>Không gian quản trị</p>
            <h1>Điều hành âm nhạc<br>theo nhịp của bạn.</h1>
            <span>Quản lý nội dung, nghệ sĩ và cộng đồng Melodify trong một giao diện tập trung.</span>
        </div>
        <small>© {{ date('Y') }} Melodify. Music meets management.</small>
    </section>

    <section class="admin-login-panel">
        <div class="admin-login-mobile-brand"><span>♪</span> Melodify</div>
        <div class="admin-login-form-wrap">
            <header>
                <span class="admin-login-eyebrow">Melodify Admin</span>
                <h2>Chào mừng trở lại</h2>
                <p>Nhập thông tin để truy cập bảng điều khiển.</p>
            </header>
            <div class="admin-auth-form" aria-label="Biểu mẫu đăng nhập minh họa">
                <label>
                    <span>Email quản trị</span>
                    <span class="admin-login-input-wrap"><x-anticon name="mail" class="admin-login-input-icon" /><input class="ant-input" type="email" placeholder="admin@melodify.vn"></span>
                </label>
                <label>
                    <span>Mật khẩu</span>
                    <span class="admin-login-input-wrap"><x-anticon name="lock" class="admin-login-input-icon" /><input class="ant-input" type="password" placeholder="Nhập mật khẩu" data-password-input><button type="button" class="admin-password-toggle" data-password-toggle aria-label="Hiện mật khẩu" aria-pressed="false"><x-anticon name="eye" class="admin-password-eye-show" /><x-anticon name="eye-invisible" class="admin-password-eye-hide" /></button></span>
                </label>
                <div class="admin-login-options">
                    <label class="admin-checkbox-row"><input type="checkbox"> <span>Ghi nhớ đăng nhập</span></label>
                    <a href="{{ route('admin.password.request') }}" class="admin-login-text-button">Quên mật khẩu?</a>
                </div>
                <a href="{{ route('admin.dashboard') }}" class="ant-btn ant-btn-primary admin-login-submit">Đăng nhập <span>→</span></a>
            </div>
            <p class="admin-login-demo-note"><span>i</span> Giao diện minh họa — chưa kích hoạt xác thực.</p>
        </div>
    </section>
</main>
@endsection
