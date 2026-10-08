@php($isEditing = $isEditing ?? filled($item))
<section class="admin-page admin-form-page">
    <div class="admin-page-header">
        <div>
            <a href="{{ route('admin.albums.index') }}" class="admin-back-link">← Quay lại danh sách album</a>
            <h1 class="admin-page-title">{{ $isEditing ? 'Chỉnh sửa album' : 'Thêm album' }}</h1>
            <p class="admin-page-description">Album luôn phải thuộc về một nghệ sĩ đã có trong hệ thống.</p>
        </div>
    </div>
    <form method="POST"
        action="{{ $isEditing ? route('admin.albums.update', $item->getKey()) : route('admin.albums.store') }}"
        class="ant-card admin-resource-form" autocomplete="off">
        @csrf
        @if ($isEditing)
            @method('PUT')
        @endif
        <div class="admin-resource-form-heading">
            <div><strong>Thông tin album</strong><span>Tên, slug và nghệ sĩ phải hợp lệ trước khi lưu.</span></div><span
                class="ant-tag {{ $isEditing ? 'ant-tag-blue' : 'ant-tag-green' }}">{{ $isEditing ? 'Đang chỉnh sửa' : 'Tạo mới' }}</span>
        </div>
        <div class="admin-form-grid">
            <div class="admin-form-group admin-form-span"><label class="admin-form-label" for="album-title">Tên album
                    <span>*</span></label><input id="album-title" name="title"
                    value="{{ old('title', $item?->title) }}" maxlength="160"
                    class="ant-input admin-form-input @error('title') is-invalid @enderror" required>
                @error('title')
                    <p class="admin-field-error">{{ $message }}</p>
                @enderror
            </div>
            <div class="admin-form-group"><label class="admin-form-label" for="album-slug">Slug
                    <span>*</span></label><input id="album-slug" name="slug" value="{{ old('slug', $item?->slug) }}"
                    maxlength="180" pattern="[A-Za-z0-9_-]+"
                    class="ant-input admin-form-input @error('slug') is-invalid @enderror" required>
                @error('slug')
                    <p class="admin-field-error">{{ $message }}</p>
                @enderror
            </div>
            <div class="admin-form-group"><label class="admin-form-label" for="album-artist">Nghệ sĩ
                    <span>*</span></label><select id="album-artist" name="artist_id"
                    class="ant-input admin-form-input @error('artist_id') is-invalid @enderror" required>
                    <option value="">Chọn nghệ sĩ</option>
                    @foreach ($fields['artist_id']['options'] ?? [] as $id => $label)
                        <option value="{{ $id }}" @selected((string) old('artist_id', $item?->artist_id) === (string) $id)>{{ $label }}</option>
                    @endforeach
                </select>
                @error('artist_id')
                    <p class="admin-field-error">{{ $message }}</p>
                @enderror
            </div>
            <div class="admin-form-group"><label class="admin-form-label" for="album-release-date">Ngày phát
                    hành</label><input id="album-release-date" name="release_date" type="date"
                    value="{{ old('release_date', $item?->release_date?->format('Y-m-d')) }}"
                    max="{{ now()->toDateString() }}"
                    class="ant-input admin-form-input @error('release_date') is-invalid @enderror">
                @error('release_date')
                    <p class="admin-field-error">{{ $message }}</p>
                @enderror
            </div>
            <div class="admin-form-group admin-form-span"><label class="admin-form-label" for="album-cover-url">URL ảnh
                    bìa</label><input id="album-cover-url" name="cover_url" type="url"
                    value="{{ old('cover_url', $item?->cover_url) }}" maxlength="500" placeholder="https://..."
                    class="ant-input admin-form-input @error('cover_url') is-invalid @enderror">
                @error('cover_url')
                    <p class="admin-field-error">{{ $message }}</p>
                @enderror
            </div>
            <div class="admin-form-group"><label class="admin-form-label" for="album-status">Trạng thái
                    <span>*</span></label><select id="album-status" name="status"
                    class="ant-input admin-form-input @error('status') is-invalid @enderror" required>
                    @foreach (['draft' => 'Bản nháp', 'published' => 'Đã phát hành', 'blocked' => 'Đã chặn'] as $value => $label)
                        <option value="{{ $value }}" @selected(old('status', $item?->status ?? 'draft') === $value)>{{ $label }}</option>
                    @endforeach
                </select>
                @error('status')
                    <p class="admin-field-error">{{ $message }}</p>
                @enderror
            </div>
        </div>
        <div class="admin-form-actions admin-resource-form-actions"><a href="{{ route('admin.albums.index') }}"
                class="ant-btn">Hủy</a><button class="ant-btn ant-btn-primary"
                type="submit">{{ $isEditing ? 'Lưu thay đổi' : 'Tạo album' }}</button></div>
    </form>
</section>
