@extends('layouts.admin')

@section('content')
<section class="admin-page">
    <div class="admin-page-header">
        <div><h1 class="admin-page-title">Hồ sơ quản trị viên</h1><p class="admin-page-description">Cập nhật thông tin cá nhân và bảo mật tài khoản.</p></div>
    </div>
    <div class="admin-profile-grid">
        <form method="POST" action="{{ route('admin.profile.update') }}" class="ant-card admin-resource-form">
            @csrf @method('PUT')
            <h2>Thông tin cá nhân</h2>
            <div class="admin-form-group"><label class="admin-form-label">Họ tên</label><input class="ant-input" name="name" value="{{ old('name', $admin->name) }}" required>@error('name')<p class="admin-field-error">{{ $message }}</p>@enderror</div>
            <div class="admin-form-group"><label class="admin-form-label">Email</label><input class="ant-input" type="email" name="email" value="{{ old('email', $admin->email) }}" required>@error('email')<p class="admin-field-error">{{ $message }}</p>@enderror</div>
            <div class="admin-form-group"><label class="admin-form-label">URL ảnh đại diện</label><input class="ant-input" type="url" name="avatar" value="{{ old('avatar', $admin->avatar) }}">@error('avatar')<p class="admin-field-error">{{ $message }}</p>@enderror</div>
            <div class="admin-form-actions"><button class="ant-btn ant-btn-primary">Lưu hồ sơ</button></div>
        </form>
        <aside class="ant-card admin-profile-summary">
            <span class="admin-profile-summary-avatar">{{ mb_strtoupper(mb_substr($admin->name, 0, 1)) }}</span>
            <h2>{{ $admin->name }}</h2>
            <p>{{ $admin->email }}</p>
            <span class="ant-tag ant-tag-green">Quản trị viên</span>
            <a href="{{ route('admin.profile.settings') }}" class="ant-btn">Mở cài đặt tài khoản</a>
        </aside>
    </div>
</section>
@endsection
