@php
    $isEditing = $isEditing ?? filled($item);
    $artistName = old('name', $item?->name);
    $avatarUrl = old('avatar_url', $item?->avatar_url);
    $avatarInitial = \Illuminate\Support\Str::upper(\Illuminate\Support\Str::substr($artistName ?: 'N', 0, 1));
@endphp

<section class="admin-page admin-form-page admin-artist-form-page">
    <div class="admin-page-header admin-artist-page-header">
        <div>
            <a href="{{ route('admin.artists.index') }}" class="admin-back-link">← Quay lại danh sách nghệ sĩ</a>
            <span class="admin-artist-kicker">Hồ sơ nghệ sĩ</span>
            <h1 class="admin-page-title">{{ $isEditing ? 'Chỉnh sửa nghệ sĩ' : 'Thêm nghệ sĩ' }}</h1>
            <p class="admin-page-description">{{ $isEditing ? 'Cập nhật thông tin và trạng thái hiển thị của nghệ sĩ.' : 'Tạo hồ sơ nghệ sĩ để quản lý album, bài hát và thông tin xác minh.' }}</p>
        </div>
    </div>

    <form method="POST" action="{{ $isEditing ? route('admin.artists.update', $item->getKey()) : route('admin.artists.store') }}" class="ant-card admin-resource-form admin-artist-form" enctype="multipart/form-data" autocomplete="off">
        @csrf
        @if($isEditing) @method('PUT') @endif

        <div class="admin-resource-form-heading admin-artist-form-heading">
            <div class="admin-artist-heading-copy">
                <span class="admin-artist-heading-icon" aria-hidden="true">♪</span>
                <div>
                    <strong>{{ $isEditing ? 'Chỉnh sửa hồ sơ' : 'Khởi tạo hồ sơ nghệ sĩ' }}</strong>
                    <span>Thông tin hiển thị công khai và liên kết tài khoản của nghệ sĩ.</span>
                </div>
            </div>
            <span class="ant-tag {{ $isEditing ? 'ant-tag-blue' : 'ant-tag-green' }}">{{ $isEditing ? 'Đang chỉnh sửa' : 'Tạo mới' }}</span>
        </div>

        <div class="admin-artist-form-layout">
            <div class="admin-artist-form-main">
                <section class="admin-artist-form-section">
                    <div class="admin-artist-section-heading">
                        <span>01</span>
                        <div>
                            <strong>Nhận diện nghệ sĩ</strong>
                            <small>Tên và đường dẫn dùng để nhận diện hồ sơ trên hệ thống.</small>
                        </div>
                    </div>

                    <div class="admin-artist-field-grid">
                        <div class="admin-form-group">
                            <label class="admin-form-label" for="artist-name">Tên nghệ sĩ <span>*</span></label>
                            <input id="artist-name" name="name" data-slug-source="artist-slug" value="{{ $artistName }}" maxlength="120" class="ant-input admin-form-input @error('name') is-invalid @enderror" placeholder="Ví dụ: Sơn Tùng M-TP" required>
                            <p class="admin-field-help">Tối đa 120 ký tự, không nhập HTML hoặc mã script.</p>
                            @error('name')<p class="admin-field-error">{{ $message }}</p>@enderror
                        </div>

                        <div class="admin-form-group">
                            <label class="admin-form-label" for="artist-slug">Slug <span>*</span></label>
                            <div class="admin-slug-input-row">
                                <input id="artist-slug" name="slug" value="{{ old('slug', $item?->slug) }}" maxlength="140" pattern="[A-Za-z0-9_-]+" class="ant-input admin-form-input @error('slug') is-invalid @enderror" placeholder="tu-dong-theo-ten" required>
                                <button type="button" class="ant-btn admin-slug-reset" data-slug-reset="artist-slug">Theo tên</button>
                            </div>
                            <p class="admin-field-help">Tối đa 140 ký tự, chỉ dùng chữ không dấu, số, gạch ngang hoặc gạch dưới.</p>
                            @error('slug')<p class="admin-field-error">{{ $message }}</p>@enderror
                        </div>
                    </div>
                </section>

                <section class="admin-artist-form-section">
                    <div class="admin-artist-section-heading">
                        <span>02</span>
                        <div>
                            <strong>Thông tin hồ sơ</strong>
                            <small>Bổ sung giới thiệu và tài khoản liên kết nếu có.</small>
                        </div>
                    </div>

                    <div class="admin-artist-field-grid">
                        <div class="admin-form-group">
                            <label class="admin-form-label" for="artist-user">Tài khoản liên kết</label>
                            <select id="artist-user" name="user_id" class="ant-input admin-form-input @error('user_id') is-invalid @enderror">
                                <option value="">Không liên kết tài khoản</option>
                                @foreach($fields['user_id']['options'] ?? [] as $id => $label)
                                    <option value="{{ $id }}" @selected((string) old('user_id', $item?->user_id) === (string) $id)>{{ $label }}</option>
                                @endforeach
                            </select>
                            <p class="admin-field-help">Có thể liên kết với tài khoản người dùng đã tồn tại.</p>
                            @error('user_id')<p class="admin-field-error">{{ $message }}</p>@enderror
                        </div>

                        <div class="admin-form-group">
                            <label class="admin-form-label">Xác minh hồ sơ</label>
                            <label class="admin-checkbox-card admin-artist-verified-card">
                                <input type="hidden" name="verified" value="0">
                                <input type="checkbox" name="verified" value="1" @checked(old('verified', $item?->verified))>
                                <span><strong>Đã xác minh</strong><small>Hiển thị huy hiệu xác minh trên hồ sơ nghệ sĩ.</small></span>
                            </label>
                        </div>

                        <div class="admin-form-group admin-form-span">
                            <label class="admin-form-label" for="artist-bio">Giới thiệu</label>
                            <textarea id="artist-bio" name="bio" rows="6" maxlength="2000" class="ant-input admin-form-input @error('bio') is-invalid @enderror" placeholder="Viết vài dòng giới thiệu về nghệ sĩ...">{{ old('bio', $item?->bio) }}</textarea>
                            <p class="admin-field-help">Tối đa 2.000 ký tự, nội dung sẽ hiển thị trên trang nghệ sĩ.</p>
                            @error('bio')<p class="admin-field-error">{{ $message }}</p>@enderror
                        </div>
                    </div>
                </section>
            </div>

            <aside class="admin-artist-form-sidebar">
                <div class="admin-artist-profile-card">
                    <div class="admin-artist-avatar-preview" data-artist-avatar-preview data-fallback="{{ $avatarInitial }}">
                        @if(filled($avatarUrl))
                            <img src="{{ $avatarUrl }}" alt="Ảnh đại diện {{ $artistName ?: 'nghệ sĩ' }}">
                        @else
                            <span>{{ $avatarInitial }}</span>
                        @endif
                    </div>
                    <span class="admin-artist-profile-label">ẢNH ĐẠI DIỆN</span>
                    <strong data-artist-name-preview>{{ $artistName ?: 'Tên nghệ sĩ' }}</strong>
                    <p>Ảnh sẽ được hiển thị trong danh sách nghệ sĩ và các nội dung liên quan.</p>

                    <div class="admin-form-group admin-artist-avatar-field">
                        <label class="admin-form-label" for="artist-avatar-file">Tải ảnh từ máy</label>
                        <label class="admin-artist-file-picker" for="artist-avatar-file">
                            <input id="artist-avatar-file" name="avatar_file" data-artist-avatar-file type="file" accept="image/jpeg,image/png,image/webp">
                            <span class="admin-artist-file-icon" aria-hidden="true">↑</span>
                            <span><strong>Chọn ảnh đại diện</strong><small>JPG, PNG hoặc WebP, tối đa 5 MB</small></span>
                            <span class="admin-artist-file-action">Chọn file</span>
                        </label>
                        <p class="admin-field-help" data-artist-avatar-file-name>Chưa chọn tệp.</p>
                        @error('avatar_file')<p class="admin-field-error">{{ $message }}</p>@enderror
                        <div class="admin-artist-avatar-divider"><span>hoặc</span></div>
                        <label class="admin-form-label" for="artist-avatar-url">URL ảnh đại diện</label>
                        <input id="artist-avatar-url" name="avatar_url" data-artist-avatar-url type="url" value="{{ $avatarUrl }}" maxlength="500" placeholder="https://..." class="ant-input admin-form-input @error('avatar_url') is-invalid @enderror">
                        <p class="admin-field-help">Dán đường dẫn ảnh HTTPS, tối đa 500 ký tự.</p>
                        @error('avatar_url')<p class="admin-field-error">{{ $message }}</p>@enderror
                    </div>
                </div>

                <div class="admin-artist-status-card">
                    <div class="admin-artist-status-heading">
                        <span class="admin-artist-status-dot" aria-hidden="true"></span>
                        <div>
                            <strong>Trạng thái hồ sơ</strong>
                            <small>Kiểm soát khả năng hiển thị của nghệ sĩ.</small>
                        </div>
                    </div>
                    <select id="artist-status" name="status" class="ant-input admin-form-input @error('status') is-invalid @enderror" required>
                        @foreach(['active' => 'Hoạt động', 'inactive' => 'Tạm ẩn', 'blocked' => 'Đã chặn'] as $value => $label)
                            <option value="{{ $value }}" @selected(old('status', $item?->status ?? 'active') === $value)>{{ $label }}</option>
                        @endforeach
                    </select>
                    @error('status')<p class="admin-field-error">{{ $message }}</p>@enderror
                </div>
            </aside>
        </div>

        <div class="admin-form-actions admin-resource-form-actions">
            <a href="{{ route('admin.artists.index') }}" class="ant-btn">Hủy</a>
            <button class="ant-btn ant-btn-primary" type="submit">{{ $isEditing ? 'Lưu thay đổi' : 'Tạo nghệ sĩ' }}</button>
        </div>
    </form>
</section>
