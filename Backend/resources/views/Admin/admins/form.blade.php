@php($isEditing = $isEditing ?? filled($item))
<section class="admin-page admin-form-page">
    <div class="admin-page-header">
        <div>
            <a href="{{ route('admin.admins.index') }}" class="admin-back-link">← Quay lại danh sách quản trị viên</a>
            <h1 class="admin-page-title">{{ $isEditing ? 'Chỉnh sửa quản trị viên' : 'Tạo quản trị viên' }}</h1>
            <p class="admin-page-description">Admin lớn có toàn quyền; Admin nhỏ chỉ dùng các nhóm quyền được chọn.</p>
        </div>
    </div>
    <form method="POST" action="{{ $isEditing ? route('admin.admins.update', $item->getKey()) : route('admin.admins.store') }}" class="ant-card admin-resource-form" autocomplete="off">
        @csrf
        @if($isEditing) @method('PUT') @endif
        <div class="admin-resource-form-heading"><div><strong>Thông tin quản trị viên</strong><span>Mật khẩu khởi tạo được hệ thống cấp và mã hóa bằng bcrypt.</span></div><span class="ant-tag {{ $isEditing ? 'ant-tag-blue' : 'ant-tag-green' }}">{{ $isEditing ? 'Đang chỉnh sửa' : 'Tạo mới' }}</span></div>
        <div class="admin-form-grid">
            <div class="admin-form-group"><label class="admin-form-label" for="admin-name">Họ tên <span>*</span></label><input id="admin-name" name="name" value="{{ old('name', $item?->name) }}" maxlength="120" class="ant-input admin-form-input @error('name') is-invalid @enderror" required>@error('name')<p class="admin-field-error">{{ $message }}</p>@enderror</div>
            <div class="admin-form-group"><label class="admin-form-label" for="admin-email">Email <span>*</span></label><input id="admin-email" name="email" type="email" value="{{ old('email', $item?->email) }}" maxlength="160" autocomplete="email" class="ant-input admin-form-input @error('email') is-invalid @enderror" required>@error('email')<p class="admin-field-error">{{ $message }}</p>@enderror</div>
            <div class="admin-form-group"><label class="admin-form-label" for="admin-slug">Slug</label><input id="admin-slug" name="slug" value="{{ old('slug', $item?->slug) }}" maxlength="140" pattern="[A-Za-z0-9_-]+" class="ant-input admin-form-input @error('slug') is-invalid @enderror"><p class="admin-field-help">Để trống để tự tạo theo họ tên.</p>@error('slug')<p class="admin-field-error">{{ $message }}</p>@enderror</div>
            <div class="admin-form-group"><label class="admin-form-label" for="admin-role">Phân quyền <span>*</span></label><select id="admin-role" name="role" class="ant-input admin-form-input @error('role') is-invalid @enderror" required>@foreach($fields['role']['options'] ?? [] as $value => $label)<option value="{{ $value }}" @selected(old('role', $item?->role ?? 'admin') === $value)>{{ $label }}</option>@endforeach</select>@error('role')<p class="admin-field-error">{{ $message }}</p>@enderror</div>
            <div class="admin-form-group"><label class="admin-form-label" for="admin-status">Trạng thái <span>*</span></label><select id="admin-status" name="status" class="ant-input admin-form-input @error('status') is-invalid @enderror" required>@foreach($fields['status']['options'] ?? [] as $value => $label)<option value="{{ $value }}" @selected(old('status', $item?->status ?? 'active') === $value)>{{ $label }}</option>@endforeach</select>@error('status')<p class="admin-field-error">{{ $message }}</p>@enderror</div>
            <fieldset class="admin-form-group admin-form-span admin-permission-group"><legend class="admin-form-label">Chức năng được phép</legend><p class="admin-field-help">Chỉ áp dụng cho Admin nhỏ. Admin lớn luôn có toàn quyền.</p><div class="admin-permission-options">@foreach($fields['permissions']['options'] ?? [] as $permission => $option)<label class="admin-checkbox-card"><input type="checkbox" name="permissions[]" value="{{ $permission }}" @checked(in_array($permission, old('permissions', $item?->permissions ?? []), true))><span><strong>{{ $option['label'] }}</strong><small>{{ $option['description'] }}</small></span></label>@endforeach</div>@error('permissions')<p class="admin-field-error">{{ $message }}</p>@enderror</fieldset>
        </div>
        <div class="admin-form-actions admin-resource-form-actions"><a href="{{ route('admin.admins.index') }}" class="ant-btn">Hủy</a><button class="ant-btn ant-btn-primary" type="submit">{{ $isEditing ? 'Lưu thay đổi' : 'Tạo quản trị viên' }}</button></div>
    </form>
</section>
