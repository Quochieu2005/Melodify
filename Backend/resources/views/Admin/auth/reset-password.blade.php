@extends('layouts.auth')

@section('content')
<main class="admin-login-page admin-forgot-page">
    <section class="admin-login-visual" aria-label="Tạo mật khẩu mới Melodify Admin">
        <a href="{{ route('admin.login') }}" class="admin-login-brand"><span class="admin-login-brand-mark">♪</span><span>Melodify</span></a>
        <div class="admin-login-message">
            <p>OTP đã được xác minh</p>
            <h1>Tạo mật khẩu<br>mới an toàn.</h1>
            <span>Chọn một mật khẩu riêng tư, đủ dài và dễ nhớ với bạn.</span>
        </div>
        <small>© {{ date('Y') }} Melodify. Music meets management.</small>
    </section>
    <section class="admin-login-panel">
        <div class="admin-login-mobile-brand"><span>♪</span> Melodify</div>
        <div class="admin-login-form-wrap">
            <header>
                <span class="admin-login-eyebrow">Melodify Admin</span>
                <h2>Tạo mật khẩu mới</h2>
                <p>OTP đã đúng. Nhập và xác nhận mật khẩu mới của bạn.</p>
            </header>
            @if(session('success'))<p class="admin-auth-success" role="status">{{ session('success') }}</p>@endif
            <form method="POST" action="{{ route('admin.password.reset') }}" class="admin-auth-form" data-password-reset-form>
                @csrf
                <label for="new-password">
                    <span>Mật khẩu mới</span>
                    <span class="admin-login-input-wrap">
                        <x-anticon name="lock" class="admin-login-input-icon" />
                        <input id="new-password" class="ant-input @error('password') is-invalid @enderror" type="password" name="password" autocomplete="new-password" placeholder="Ít nhất 8 ký tự" minlength="8" maxlength="72" data-password-input required>
                        <button type="button" class="admin-password-toggle" data-password-toggle aria-label="Hiện mật khẩu" aria-pressed="false"><x-anticon name="eye" class="admin-password-eye-show" /><x-anticon name="eye-invisible" class="admin-password-eye-hide" /></button>
                    </span>
                </label>
                <label for="confirm-password">
                    <span>Xác nhận mật khẩu mới</span>
                    <span class="admin-login-input-wrap">
                        <x-anticon name="lock" class="admin-login-input-icon" />
                        <input id="confirm-password" class="ant-input" type="password" name="password_confirmation" autocomplete="new-password" placeholder="Nhập lại mật khẩu mới" minlength="8" maxlength="72" data-password-confirmation required>
                        <button type="button" class="admin-password-toggle" data-password-toggle aria-label="Hiện mật khẩu" aria-pressed="false"><x-anticon name="eye" class="admin-password-eye-show" /><x-anticon name="eye-invisible" class="admin-password-eye-hide" /></button>
                    </span>
                </label>
                @error('password')<p class="admin-field-error">{{ $message }}</p>@enderror
                <p class="admin-password-match-error" data-password-match-error hidden>Hai mật khẩu chưa giống nhau.</p>
                <button class="ant-btn ant-btn-primary admin-login-submit" type="submit">Đặt lại mật khẩu <span>→</span></button>
            </form>
        </div>
    </section>
</main>
@endsection
