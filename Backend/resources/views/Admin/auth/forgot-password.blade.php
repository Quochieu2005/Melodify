@extends('layouts.auth')

@section('content')
<div class="ant-card admin-auth-card">
    <h1>Quên mật khẩu</h1>
    <p>Nhập email quản trị để nhận liên kết đặt lại mật khẩu.</p>
    <form method="POST" action="{{ route('admin.password.email') }}" class="admin-auth-form">
        @csrf
        <label>Email<input class="ant-input" type="email" name="email" value="{{ old('email') }}" required autofocus></label>
        @error('email')<span class="admin-field-error">{{ $message }}</span>@enderror
        <button class="ant-btn ant-btn-primary" type="submit">Gửi liên kết</button>
        <a href="{{ route('admin.login') }}" class="admin-auth-link">Quay lại đăng nhập</a>
    </form>
</div>
@endsection
