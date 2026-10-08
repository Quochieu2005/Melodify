@extends('layouts.auth')

@section('content')
<main class="admin-login-page admin-forgot-page">
    <section class="admin-login-visual" aria-label="Xác minh mã OTP">
        <a href="{{ route('admin.login') }}" class="admin-login-brand"><span class="admin-login-brand-mark">♪</span><span>Melodify</span></a>
        <div class="admin-login-message">
            <p>Xác minh bảo mật</p>
            <h1>Đặt lại mật khẩu<br>một cách an toàn.</h1>
            <span>Mã được gửi đến email quản trị của bạn và hết hạn sau 5 phút.</span>
        </div>
        <small>© {{ date('Y') }} Melodify. Music meets management.</small>
    </section>
    <section class="admin-login-panel">
        <div class="admin-login-mobile-brand"><span>♪</span> Melodify</div>
        <div class="admin-login-form-wrap">
            <header><span class="admin-login-eyebrow">Melodify Admin</span><h2>Xác minh OTP</h2><p>Nhập mã 6 số đã gửi tới <strong>{{ $email }}</strong> để tiếp tục.</p></header>
            @if(session('success'))<p class="admin-auth-success" role="status">{{ session('success') }}</p>@endif
            <form method="POST" action="{{ route('admin.password.otp.verify') }}" class="admin-auth-form admin-otp-form" data-otp-form data-otp-expires-at="{{ $expiresAt }}">
                @csrf
                <label for="otp-code"><span>Mã OTP</span><span class="admin-login-input-wrap"><x-anticon name="safety-certificate" class="admin-login-input-icon" /><input id="otp-code" class="ant-input @error('code') is-invalid @enderror" type="text" name="code" value="{{ old('code') }}" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="6 chữ số" required autofocus></span></label>
                @error('code')<p class="admin-field-error">{{ $message }}</p>@enderror
                <div class="admin-otp-status" aria-live="polite">
                    <span>Mã còn hiệu lực</span>
                    <strong data-otp-countdown>05:00</strong>
                </div>
                <p class="admin-otp-expired-message" data-otp-expired-message hidden>Mã OTP đã hết hạn. Hãy gửi lại mã mới để tiếp tục.</p>
                <button class="ant-btn ant-btn-primary admin-login-submit" type="submit" data-otp-submit>Xác minh mã OTP <span>→</span></button>
                <a href="{{ route('admin.password.request') }}" class="admin-auth-back admin-otp-resend-link" data-otp-resend>Gửi lại mã OTP</a>
            </form>
        </div>
    </section>
</main>
@endsection
