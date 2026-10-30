@php($isEditing = $isEditing ?? filled($item))
<section class="admin-page admin-form-page">
    <div class="admin-page-header">
        <div>
            <a href="{{ route('admin.admins.index') }}" class="admin-back-link">← Quay lại danh sách quản trị viên</a>
            <h1 class="admin-page-title">{{ $isEditing ? 'Chỉnh sửa quản trị viên' : 'Tạo quản trị viên' }}</h1>
            <p class="admin-page-description">Admin lớn có toàn quyền; Admin nhỏ chỉ dùng các nhóm quyền được chọn.</p>
        </div>
    </div>
    <form method="POST" action="{{ $isEditing ? route('admin.admins.update', $item->getKey()) : route('admin.admins.store') }}" enctype="multipart/form-data" class="ant-card admin-resource-form" autocomplete="off">
        @csrf
        @if($isEditing) @method('PUT') @endif
        <div class="admin-resource-form-heading"><div><strong>Thông tin quản trị viên</strong><span>Mật khẩu khởi tạo được hệ thống cấp và mã hóa bằng bcrypt.</span></div><span class="ant-tag {{ $isEditing ? 'ant-tag-blue' : 'ant-tag-green' }}">{{ $isEditing ? 'Đang chỉnh sửa' : 'Tạo mới' }}</span></div>
        <div class="admin-form-grid">
            <div class="admin-form-group"><label class="admin-form-label" for="admin-name">Họ tên <span>*</span></label><input id="admin-name" name="name" data-slug-source="admin-slug" value="{{ old('name', $item?->name) }}" maxlength="120" class="ant-input admin-form-input @error('name') is-invalid @enderror" required>@error('name')<p class="admin-field-error">{{ $message }}</p>@enderror</div>
            <div class="admin-form-group"><label class="admin-form-label" for="admin-email">Email <span>*</span></label><input id="admin-email" name="email" type="email" value="{{ old('email', $item?->email) }}" maxlength="160" autocomplete="email" class="ant-input admin-form-input @error('email') is-invalid @enderror" required>@error('email')<p class="admin-field-error">{{ $message }}</p>@enderror</div>
            <div class="admin-form-group">
                <label class="admin-form-label" for="admin-slug">Slug</label>
                <div class="admin-slug-input-row">
                    <input id="admin-slug" name="slug" value="{{ old('slug', $item?->slug) }}" maxlength="140" pattern="[A-Za-z0-9_-]+" class="ant-input admin-form-input @error('slug') is-invalid @enderror" autocomplete="off" spellcheck="false" aria-describedby="admin-slug-help">
                    <button type="button" class="ant-btn admin-slug-reset" data-slug-reset="admin-slug">Theo họ tên</button>
                </div>
                <p class="admin-field-help" id="admin-slug-help">Tự tạo theo họ tên. Bạn vẫn có thể tự sửa slug, chỉ dùng chữ không dấu, số, dấu gạch ngang hoặc gạch dưới.</p>
                @error('slug')<p class="admin-field-error">{{ $message }}</p>@enderror
            </div>
            <div class="admin-form-group"><label class="admin-form-label" for="admin-role">Phân quyền <span>*</span></label><select id="admin-role" name="role" class="ant-input admin-form-input @error('role') is-invalid @enderror" required>@foreach($fields['role']['options'] ?? [] as $value => $label)<option value="{{ $value }}" @selected(old('role', $item?->role ?? 'admin') === $value)>{{ $label }}</option>@endforeach</select>@error('role')<p class="admin-field-error">{{ $message }}</p>@enderror</div>
            <div class="admin-form-group"><label class="admin-form-label" for="admin-status">Trạng thái <span>*</span></label><select id="admin-status" name="status" class="ant-input admin-form-input @error('status') is-invalid @enderror" required>@foreach($fields['status']['options'] ?? [] as $value => $label)<option value="{{ $value }}" @selected(old('status', $item?->status ?? 'active') === $value)>{{ $label }}</option>@endforeach</select>@error('status')<p class="admin-field-error">{{ $message }}</p>@enderror</div>
            <div class="admin-form-group admin-form-span">
                <label class="admin-form-label" for="admin-avatar-file">Ảnh đại diện</label>
                <div class="admin-avatar-upload-row">
                    <div class="admin-avatar-upload-preview" data-avatar-preview>
                        @if(filled($item?->avatar))
                            <img src="{{ $item->avatar }}" alt="Ảnh đại diện hiện tại">
                        @else
                            <span>{{ mb_strtoupper(mb_substr($item?->name ?? 'A', 0, 1)) }}</span>
                        @endif
                    </div>
                    <div class="admin-avatar-upload-copy">
                        <input id="admin-avatar-file" class="ant-input" type="file" name="avatar_file" accept="image/jpeg,image/png,image/webp" data-avatar-input>
                        <p class="admin-form-help">JPG, PNG hoặc WebP, tối đa 5 MB. Ảnh được lưu trên Cloudinary trong folder <code>admin</code>.</p>
                        @if($isEditing && filled($item?->avatar))
                            <label class="admin-avatar-remove-option"><input type="checkbox" name="remove_avatar" value="1" @checked(old('remove_avatar'))> Xóa ảnh hiện tại</label>
                        @endif
                        @error('avatar_file')<p class="admin-field-error">{{ $message }}</p>@enderror
                    </div>
                </div>
            </div>
            @php($selectedPermissions = array_values((array) old('permissions', $item?->permissions ?? [])))
            @php($selectedRole = old('role', $item?->role ?? 'admin'))
            <fieldset class="admin-form-group admin-form-span admin-permission-group">
                <legend class="admin-form-label">Chức năng được phép</legend>
                <p class="admin-field-help">Quyền chung cho phép Thêm, Sửa và Xóa toàn bộ phần Admin, ngoại trừ mục Quản trị viên. Các nhóm quyền cũ bên dưới vẫn hoạt động độc lập.</p>
                <div class="admin-permission-options">
                    @if(in_array('banners.manage', $selectedPermissions, true) && $selectedRole !== 'super_admin')
                        <input type="hidden" name="permissions[]" value="banners.manage">
                    @endif
                    @foreach(config('admin-permissions.groups', []) as $permission => $option)
                        @continue($option['hidden'] ?? false)
                        <label class="admin-checkbox-card">
                            <input type="checkbox" name="permissions[]" value="{{ $permission }}"
                                @checked($selectedRole === 'super_admin' || in_array($permission, $selectedPermissions, true))
                                @disabled($selectedRole === 'super_admin')>
                            <span><strong>{{ $option['label'] }}</strong><small>{{ $option['description'] }}</small></span>
                        </label>
                    @endforeach
                </div>
                @error('permissions')<p class="admin-field-error">{{ $message }}</p>@enderror
                @error('permissions.*')<p class="admin-field-error">{{ $message }}</p>@enderror
            </fieldset>
        </div>
        <div class="admin-form-actions admin-resource-form-actions"><a href="{{ route('admin.admins.index') }}" class="ant-btn">Hủy</a><button class="ant-btn ant-btn-primary" type="submit">{{ $isEditing ? 'Lưu thay đổi' : 'Tạo quản trị viên' }}</button></div>
    </form>
</section>
