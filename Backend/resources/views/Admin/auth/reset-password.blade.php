@extends('layouts.auth')

@section('content')
<div class="ant-card admin-auth-card">
    <h1>Đặt lại mật khẩu</h1>
    <form method="POST" action="{{ route('admin.password.update') }}" class="admin-auth-form">
        @csrf
        <input type="hidden" name="token" value="{{ $token }}">
        <label>Email<input class="ant-input" type="email" name="email" value="{{ old('email', $email) }}" required></label>
        <label>Mật khẩu mới<input class="ant-input" type="password" name="password" required></label>
        <label>Xác nhận mật khẩu<input class="ant-input" type="password" name="password_confirmation" required></label>
        @if($errors->any())<span class="admin-field-error">{{ $errors->first() }}</span>@endif
        <button class="ant-btn ant-btn-primary" type="submit">Đổi mật khẩu</button>
    </form>
</div>
@endsection
