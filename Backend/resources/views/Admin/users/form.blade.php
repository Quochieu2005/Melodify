@php($isEditing = $isEditing ?? filled($item))
<section class="admin-page admin-form-page">
    <div class="admin-page-header">
        <div>
            <a href="{{ route('admin.users.index') }}" class="admin-back-link">← Quay lại danh sách người dùng</a>
            <h1 class="admin-page-title">{{ $isEditing ? 'Chỉnh sửa người dùng' : 'Thêm người dùng' }}</h1>
            <p class="admin-page-description">Mật khẩu được mã hóa bằng bcrypt trước khi lưu.</p>
        </div>
    </div>
    <form method="POST"
        action="{{ $isEditing ? route('admin.users.update', $item->getKey()) : route('admin.users.store') }}"
        class="ant-card admin-resource-form" autocomplete="off">
        @csrf
        @if ($isEditing)
            @method('PUT')
        @endif
        <div class="admin-resource-form-heading">
            <div><strong>Thông tin tài khoản</strong><span>Email, username và slug phải đúng định dạng.</span></div>
            <span
                class="ant-tag {{ $isEditing ? 'ant-tag-blue' : 'ant-tag-green' }}">{{ $isEditing ? 'Đang chỉnh sửa' : 'Tạo mới' }}</span>
        </div>
        <div class="admin-form-grid">
            <div class="admin-form-group"><label class="admin-form-label" for="user-name">Họ tên
                    <span>*</span></label><input id="user-name" name="name" data-slug-source="user-slug"
                    value="{{ old('name', $item?->name) }}" maxlength="120"
                    class="ant-input admin-form-input @error('name') is-invalid @enderror" required>
                @error('name')
                    <p class="admin-field-error">{{ $message }}</p>
                @enderror
            </div>
            <div class="admin-form-group"><label class="admin-form-label" for="user-email">Email
                    <span>*</span></label><input id="user-email" name="email" type="email"
                    value="{{ old('email', $item?->email) }}" maxlength="160" autocomplete="email"
                    class="ant-input admin-form-input @error('email') is-invalid @enderror" required>
                @error('email')
                    <p class="admin-field-error">{{ $message }}</p>
                @enderror
            </div>
            <div class="admin-form-group"><label class="admin-form-label" for="user-username">Tên đăng
                    nhập</label><input id="user-username" name="username"
                    value="{{ old('username', $item?->username) }}" maxlength="80" pattern="[A-Za-z0-9_-]+"
                    class="ant-input admin-form-input @error('username') is-invalid @enderror">
                @error('username')
                    <p class="admin-field-error">{{ $message }}</p>
                @enderror
            </div>
            <div class="admin-form-group"><label class="admin-form-label" for="user-slug">Slug <span>*</span></label>
                <div class="admin-slug-input-row"><input id="user-slug" name="slug"
                        value="{{ old('slug', $item?->slug) }}" maxlength="140" pattern="[A-Za-z0-9_-]+"
                        class="ant-input admin-form-input @error('slug') is-invalid @enderror" required><button
                        type="button" class="ant-btn admin-slug-reset" data-slug-reset="user-slug">Theo tên</button>
                </div>
                <p class="admin-field-help">Tự tạo theo họ tên, hoặc tự sửa; slug không được trùng.</p>
                @error('slug')
                    <p class="admin-field-error">{{ $message }}</p>
                @enderror
            </div>
            <div class="admin-form-group"><label class="admin-form-label" for="user-phone">Số điện thoại</label><input
                    id="user-phone" name="phone" type="tel" value="{{ old('phone', $item?->phone) }}"
                    maxlength="30" inputmode="tel"
                    class="ant-input admin-form-input @error('phone') is-invalid @enderror">
                @error('phone')
                    <p class="admin-field-error">{{ $message }}</p>
                @enderror
            </div>
            <div class="admin-form-group admin-form-span"><label class="admin-checkbox-card"><input type="hidden"
                        name="is_premium" value="0"><input type="checkbox" name="is_premium" value="1"
                        @checked(old('is_premium', $item?->is_premium ?? false))><span><strong>Tài khoản Premium / VIP</strong><small>Giá trị lưu
                            trong users.is_premium: 1 là đã nạp VIP, 0 là tài khoản thường.</small></span></label>
                @error('is_premium')
                    <p class="admin-field-error">{{ $message }}</p>
                @enderror
            </div>
            <div class="admin-form-group"><label class="admin-form-label" for="user-status">Trạng thái
                    <span>*</span></label><select id="user-status" name="status"
                    class="ant-input admin-form-input @error('status') is-invalid @enderror" required>
                    @foreach (['active' => 'Hoạt động', 'blocked' => 'Đã khóa'] as $value => $label)
                        <option value="{{ $value }}" @selected(old('status', $item?->status ?? 'active') === $value)>{{ $label }}</option>
                    @endforeach
                </select>
                @error('status')
                    <p class="admin-field-error">{{ $message }}</p>
                @enderror
            </div>
            <div class="admin-form-group"><label class="admin-form-label" for="user-password">Mật khẩu
                    {{ $isEditing ? '' : '*' }}</label><input id="user-password" name="password" type="password"
                    minlength="8" maxlength="72" autocomplete="new-password"
                    class="ant-input admin-form-input @error('password') is-invalid @enderror" @required(!$isEditing)>
                <p class="admin-field-help">Tối thiểu 8, tối đa 72 ký tự. Để trống khi sửa nếu không đổi.</p>
                @error('password')
                    <p class="admin-field-error">{{ $message }}</p>
                @enderror
            </div>
            <div class="admin-form-group"><label class="admin-form-label" for="user-password-confirmation">Xác nhận
                    mật khẩu {{ $isEditing ? '' : '*' }}</label><input id="user-password-confirmation"
                    name="password_confirmation" type="password" minlength="8" maxlength="72"
                    autocomplete="new-password" class="ant-input admin-form-input" @required(!$isEditing)></div>
        </div>
        <div class="admin-form-actions admin-resource-form-actions"><a href="{{ route('admin.users.index') }}"
                class="ant-btn">Hủy</a><button class="ant-btn ant-btn-primary"
                type="submit">{{ $isEditing ? 'Lưu thay đổi' : 'Tạo người dùng' }}</button></div>
    </form>
</section>
