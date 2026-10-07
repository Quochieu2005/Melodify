@php($isEditing = $isEditing ?? filled($item))
<section class="admin-page admin-form-page">
    <div class="admin-page-header">
        <div>
            <a href="{{ route('admin.artists.index') }}" class="admin-back-link">← Quay lại danh sách nghệ sĩ</a>
            <h1 class="admin-page-title">{{ $isEditing ? 'Chỉnh sửa nghệ sĩ' : 'Thêm nghệ sĩ' }}</h1>
            <p class="admin-page-description">Thông tin nghệ sĩ chỉ nhận văn bản an toàn, không nhận HTML hoặc script.</p>
        </div>
    </div>
    <form method="POST" action="{{ $isEditing ? route('admin.artists.update', $item->getKey()) : route('admin.artists.store') }}" class="ant-card admin-resource-form" autocomplete="off">
        @csrf
        @if($isEditing) @method('PUT') @endif
        <div class="admin-resource-form-heading"><div><strong>Thông tin nghệ sĩ</strong><span>Slug tối đa 140 ký tự và phải duy nhất.</span></div><span class="ant-tag {{ $isEditing ? 'ant-tag-blue' : 'ant-tag-green' }}">{{ $isEditing ? 'Đang chỉnh sửa' : 'Tạo mới' }}</span></div>
        <div class="admin-form-grid">
            <div class="admin-form-group"><label class="admin-form-label" for="artist-name">Tên nghệ sĩ <span>*</span></label><input id="artist-name" name="name" data-slug-source="artist-slug" value="{{ old('name', $item?->name) }}" maxlength="120" class="ant-input admin-form-input @error('name') is-invalid @enderror" required>@error('name')<p class="admin-field-error">{{ $message }}</p>@enderror</div>
            <div class="admin-form-group"><label class="admin-form-label" for="artist-slug">Slug <span>*</span></label><div class="admin-slug-input-row"><input id="artist-slug" name="slug" value="{{ old('slug', $item?->slug) }}" maxlength="140" pattern="[A-Za-z0-9_-]+" class="ant-input admin-form-input @error('slug') is-invalid @enderror" required><button type="button" class="ant-btn admin-slug-reset" data-slug-reset="artist-slug">Theo tên</button></div><p class="admin-field-help">Tự tạo theo tên, hoặc tự sửa; slug không được trùng.</p>@error('slug')<p class="admin-field-error">{{ $message }}</p>@enderror</div>
            <div class="admin-form-group"><label class="admin-form-label" for="artist-user">Tài khoản liên kết</label><select id="artist-user" name="user_id" class="ant-input admin-form-input @error('user_id') is-invalid @enderror"><option value="">Không liên kết tài khoản</option>@foreach($fields['user_id']['options'] ?? [] as $id => $label)<option value="{{ $id }}" @selected((string) old('user_id', $item?->user_id) === (string) $id)>{{ $label }}</option>@endforeach</select>@error('user_id')<p class="admin-field-error">{{ $message }}</p>@enderror</div>
            <div class="admin-form-group"><label class="admin-form-label" for="artist-status">Trạng thái <span>*</span></label><select id="artist-status" name="status" class="ant-input admin-form-input @error('status') is-invalid @enderror" required>@foreach(['active' => 'Hoạt động', 'inactive' => 'Tạm ẩn', 'blocked' => 'Đã chặn'] as $value => $label)<option value="{{ $value }}" @selected(old('status', $item?->status ?? 'active') === $value)>{{ $label }}</option>@endforeach</select>@error('status')<p class="admin-field-error">{{ $message }}</p>@enderror</div>
            <div class="admin-form-group admin-form-span"><label class="admin-form-label" for="artist-bio">Giới thiệu</label><textarea id="artist-bio" name="bio" rows="6" maxlength="2000" class="ant-input admin-form-input @error('bio') is-invalid @enderror">{{ old('bio', $item?->bio) }}</textarea><p class="admin-field-help">Tối đa 2.000 ký tự.</p>@error('bio')<p class="admin-field-error">{{ $message }}</p>@enderror</div>
            <div class="admin-form-group admin-form-span"><label class="admin-form-label" for="artist-avatar-url">URL ảnh đại diện</label><input id="artist-avatar-url" name="avatar_url" type="url" value="{{ old('avatar_url', $item?->avatar_url) }}" maxlength="500" placeholder="https://..." class="ant-input admin-form-input @error('avatar_url') is-invalid @enderror">@error('avatar_url')<p class="admin-field-error">{{ $message }}</p>@enderror</div>
            <div class="admin-form-group admin-form-span"><label class="admin-checkbox-card"><input type="hidden" name="verified" value="0"><input type="checkbox" name="verified" value="1" @checked(old('verified', $item?->verified))><span><strong>Đã xác minh</strong><small>Hiển thị nghệ sĩ với trạng thái đã xác minh.</small></span></label></div>
        </div>
        <div class="admin-form-actions admin-resource-form-actions"><a href="{{ route('admin.artists.index') }}" class="ant-btn">Hủy</a><button class="ant-btn ant-btn-primary" type="submit">{{ $isEditing ? 'Lưu thay đổi' : 'Tạo nghệ sĩ' }}</button></div>
    </form>
</section>
