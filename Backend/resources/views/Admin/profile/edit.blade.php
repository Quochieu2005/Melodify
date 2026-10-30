@extends('layouts.admin')

@section('content')
<section class="admin-page">
    <div class="admin-page-header">
        <div><h1 class="admin-page-title">Hồ sơ quản trị viên</h1><p class="admin-page-description">Cập nhật thông tin cá nhân và bảo mật tài khoản.</p></div>
    </div>
    <div class="admin-profile-grid">
        <form method="POST" action="{{ route('admin.profile.update') }}" enctype="multipart/form-data" class="ant-card admin-profile-form">
            @csrf @method('PUT')
            <header class="admin-profile-form-heading">
                <div><h2>Thông tin cá nhân</h2><p>Thông tin được dùng để nhận diện tài khoản quản trị.</p></div>
            </header>
            <div class="admin-profile-form-body">
                <div class="admin-form-group"><label class="admin-form-label" for="profile-name">Họ tên</label><input id="profile-name" class="ant-input" name="name" value="{{ old('name', $admin->name) }}" maxlength="120" required>@error('name')<p class="admin-field-error">{{ $message }}</p>@enderror</div>
                <div class="admin-form-group"><label class="admin-form-label" for="profile-email">Email</label><input id="profile-email" class="ant-input" type="email" name="email" value="{{ old('email', $admin->email) }}" maxlength="160" autocomplete="email" required>@error('email')<p class="admin-field-error">{{ $message }}</p>@enderror</div>
                <div class="admin-form-group admin-form-span">
                    <label class="admin-form-label" for="profile-avatar-file">Ảnh đại diện</label>
                    <div class="admin-avatar-upload-row">
                        <div class="admin-avatar-upload-preview" data-avatar-preview>
                            @if(filled($admin->avatar))
                                <img src="{{ $admin->avatar }}" alt="Ảnh đại diện hiện tại">
                            @else
                                <span>{{ mb_strtoupper(mb_substr($admin->name, 0, 1)) }}</span>
                            @endif
                        </div>
                        <div class="admin-avatar-upload-copy">
                            <input id="profile-avatar-file" class="ant-input" type="file" name="avatar_file" accept="image/jpeg,image/png,image/webp" data-avatar-input>
                            <p class="admin-form-help">Ảnh JPG, PNG hoặc WebP, tối đa 5 MB. Ảnh sẽ được lưu trong Cloudinary ở folder <code>admin</code>.</p>
                            @error('avatar_file')<p class="admin-field-error">{{ $message }}</p>@enderror
                        </div>
                    </div>
                </div>
            </div>
            <footer class="admin-profile-form-actions"><button class="ant-btn ant-btn-primary" type="submit">Lưu hồ sơ</button></footer>
        </form>
        @if(filled($admin->avatar))
            <form method="POST" action="{{ route('admin.profile.avatar.destroy') }}" class="admin-profile-remove-avatar-form">
                @csrf @method('DELETE')
                <button class="ant-btn admin-btn-danger" type="submit">Xóa ảnh đại diện</button>
            </form>
        @endif
        <aside class="ant-card admin-profile-summary">
            @if(filled($admin->avatar))
                <img class="admin-profile-summary-avatar admin-profile-summary-avatar-image" src="{{ $admin->avatar }}" alt="Ảnh đại diện {{ $admin->name }}">
            @else
                <span class="admin-profile-summary-avatar">{{ mb_strtoupper(mb_substr($admin->name, 0, 1)) }}</span>
            @endif
            <h2>{{ $admin->name }}</h2>
            <p>{{ $admin->email }}</p>
            <span class="ant-tag ant-tag-green">{{ $admin->role === 'super_admin' ? 'Admin lớn' : 'Admin nhỏ' }}</span>
            <a href="{{ route('admin.profile.settings') }}" class="ant-btn">Mở cài đặt tài khoản</a>
        </aside>
    </div>
</section>
@endsection
