@extends('layouts.auth')

@section('content')
<main class="admin-login-page admin-forgot-page">
    <section class="admin-login-visual" aria-label="Khôi phục tài khoản Melodify Admin">
        <a href="{{ route('admin.login') }}" class="admin-login-brand"><span class="admin-login-brand-mark">♪</span><span>Melodify</span></a>
        <div class="admin-login-message">
            <p>Khôi phục tài khoản</p>
            <h1>Trở lại nhịp quản trị<br>chỉ trong vài bước.</h1>
            <span>Chúng tôi sẽ gửi liên kết đặt lại mật khẩu đến email quản trị đã đăng ký.</span>
        </div>
        <small>© {{ date('Y') }} Melodify. Music meets management.</small>
    </section>
    <section class="admin-login-panel">
        <div class="admin-login-mobile-brand"><span>♪</span> Melodify</div>
        <div class="admin-login-form-wrap">
            <header><span class="admin-login-eyebrow">Melodify Admin</span><h2>Quên mật khẩu?</h2><p>Nhập email quản trị để nhận liên kết đặt lại mật khẩu.</p></header>
            <form method="POST" action="{{ route('admin.password.email') }}" class="admin-auth-form">
                @csrf
                <label><span>Email quản trị</span><span class="admin-login-input-wrap"><x-anticon name="mail" class="admin-login-input-icon" /><input class="ant-input" type="email" name="email" value="{{ old('email') }}" placeholder="admin@melodify.vn" required autofocus></span></label>
                @error('email')<span class="admin-field-error">{{ $message }}</span>@enderror
                <button class="ant-btn ant-btn-primary admin-login-submit" type="submit">Gửi liên kết đặt lại <span>→</span></button>
                <a href="{{ route('admin.login') }}" class="admin-auth-back">← Quay lại đăng nhập</a>
            </form>
        </div>
    </section>
</main>
@endsection
