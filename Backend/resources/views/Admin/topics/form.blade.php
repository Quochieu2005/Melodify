@php($isEditing = $isEditing ?? filled($item))
<section class="admin-page admin-form-page admin-catalog-page">
    <div class="admin-page-header">
        <div>
            <a href="{{ route('admin.topics.index') }}" class="admin-back-link">← Quay lại danh sách chủ đề</a>
            <h1 class="admin-page-title">{{ $isEditing ? 'Chỉnh sửa chủ đề' : 'Thêm chủ đề' }}</h1>
            <p class="admin-page-description">Quản lý tên, slug, mô tả, thứ tự và ảnh đại diện cho chủ đề.</p>
        </div>
    </div>

    <form method="POST" action="{{ $isEditing ? route('admin.topics.update', $item->getKey()) : route('admin.topics.store') }}" enctype="multipart/form-data" class="ant-card admin-resource-form admin-catalog-form" autocomplete="off">
        @csrf
        @if($isEditing) @method('PUT') @endif
        <div class="admin-resource-form-heading"><div><strong>Thông tin chủ đề</strong><span>Tên tối đa 150 ký tự, mô tả tối đa 2.000 ký tự.</span></div><span class="ant-tag {{ $isEditing ? 'ant-tag-blue' : 'ant-tag-green' }}">{{ $isEditing ? 'Đang chỉnh sửa' : 'Tạo mới' }}</span></div>

        <div class="admin-catalog-form-layout">
            <div class="admin-form-grid admin-catalog-fields">
                <div class="admin-form-group"><label class="admin-form-label" for="topic-name">Tên chủ đề <span>*</span></label><input id="topic-name" name="name" value="{{ old('name', $item?->name) }}" maxlength="150" class="ant-input admin-form-input @error('name') is-invalid @enderror" required>@error('name')<p class="admin-field-error">{{ $message }}</p>@enderror</div>
                <div class="admin-form-group"><label class="admin-form-label" for="topic-slug">Slug</label><input id="topic-slug" name="slug" value="{{ old('slug', $item?->slug) }}" maxlength="180" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" class="ant-input admin-form-input @error('slug') is-invalid @enderror" placeholder="tu-dong-theo-ten"><p class="admin-field-help">Để trống để tự tạo; slug không được trùng.</p>@error('slug')<p class="admin-field-error">{{ $message }}</p>@enderror</div>
                <div class="admin-form-group admin-form-span"><label class="admin-form-label" for="topic-description">Mô tả</label><textarea id="topic-description" name="description" rows="5" maxlength="2000" class="ant-input admin-form-input @error('description') is-invalid @enderror">{{ old('description', $item?->description) }}</textarea><p class="admin-field-help">Không nhập HTML hoặc mã script.</p>@error('description')<p class="admin-field-error">{{ $message }}</p>@enderror</div>
                <div class="admin-form-group"><label class="admin-form-label" for="topic-sort-order">Thứ tự hiển thị <span>*</span></label><input id="topic-sort-order" name="sort_order" type="number" min="0" max="9999" step="1" inputmode="numeric" value="{{ old('sort_order', $item?->sort_order ?? 0) }}" class="ant-input admin-form-input @error('sort_order') is-invalid @enderror" required><p class="admin-field-help">Chỉ nhận số nguyên từ 0 đến 9.999.</p>@error('sort_order')<p class="admin-field-error">{{ $message }}</p>@enderror</div>
                <div class="admin-form-group"><label class="admin-form-label" for="topic-status">Trạng thái <span>*</span></label><select id="topic-status" name="status" class="ant-input admin-form-input @error('status') is-invalid @enderror" required><option value="active" @selected(old('status', $item?->status ?? 'active') === 'active')>Hoạt động</option><option value="inactive" @selected(old('status', $item?->status) === 'inactive')>Tạm ẩn</option></select>@error('status')<p class="admin-field-error">{{ $message }}</p>@enderror</div>
            </div>

            @php($currentPublicId = $item?->image_public_id)
            @php($currentImageUrl = $item?->image_url)
            <aside class="admin-media-library">
                <div class="admin-media-library-heading"><div><strong>Ảnh chủ đề</strong><span>Kho Cloudinary: melodify</span></div>@if(filled($currentImageUrl))<span class="ant-tag ant-tag-green">Đang dùng ảnh</span>@endif</div>
                <label class="admin-media-upload"><input type="file" name="image" accept="image/jpeg,image/png,image/webp"><span class="admin-media-upload-icon">↑</span><span><strong>Tải ảnh mới</strong><small>JPG, PNG hoặc WEBP · tối đa 5MB</small></span></label>
                @error('image')<p class="admin-field-error">{{ $message }}</p>@enderror
                @error('image_asset_id')<p class="admin-field-error">{{ $message }}</p>@enderror
                <div class="admin-media-library-title">Chọn ảnh đã lưu</div>
                <div class="admin-media-grid">
                    @forelse($mediaAssets as $asset)
                        <label class="admin-media-card"><input type="radio" name="image_asset_id" value="{{ $asset->getKey() }}" @checked((string) old('image_asset_id') === (string) $asset->getKey() || (!old('image_asset_id') && $currentPublicId === $asset->public_id))><img src="{{ $asset->secure_url }}" alt="{{ $asset->original_name ?: 'Ảnh Melodify' }}"><span>{{ \Illuminate\Support\Str::limit($asset->original_name ?: 'Ảnh đã lưu', 22) }}</span></label>
                    @empty
                        <div class="admin-media-empty">Chưa có ảnh trong kho. Hãy tải ảnh đầu tiên.</div>
                    @endforelse
                </div>
            </aside>
        </div>
        <div class="admin-form-actions admin-resource-form-actions"><a href="{{ route('admin.topics.index') }}" class="ant-btn">Hủy</a><button type="submit" class="ant-btn ant-btn-primary">{{ $isEditing ? 'Lưu thay đổi' : 'Tạo chủ đề' }}</button></div>
    </form>
</section>
