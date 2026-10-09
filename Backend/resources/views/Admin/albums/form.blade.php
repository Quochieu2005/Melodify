@php($isEditing = $isEditing ?? filled($item))
@php($selectedArtistIds = collect(old('artist_ids', $selectedArtistIds ?? []))->map(fn ($id) => (string) $id)->all())
@php($selectedSongIds = collect(old('song_ids', $selectedSongIds ?? []))->map(fn ($id) => (string) $id)->all())
<section class="admin-page admin-form-page admin-catalog-page">
    <div class="admin-page-header">
        <div>
            <a href="{{ route('admin.albums.index') }}" class="admin-back-link">← Quay lại danh sách album</a>
            <h1 class="admin-page-title">{{ $isEditing ? 'Chỉnh sửa album' : 'Thêm album' }}</h1>
            <p class="admin-page-description">Thêm ảnh bìa, nhiều nghệ sĩ và các bài hát thuộc album ở cùng một nơi.</p>
        </div>
    </div>

    <form method="POST" action="{{ $isEditing ? route('admin.albums.update', $item->getKey()) : route('admin.albums.store') }}" enctype="multipart/form-data" class="ant-card admin-resource-form admin-catalog-form" autocomplete="off">
        @csrf
        @if($isEditing) @method('PUT') @endif
        <div class="admin-resource-form-heading"><div><strong>Thông tin album</strong><span>Tên, nghệ sĩ và ảnh bìa là các thông tin bắt buộc.</span></div><span class="ant-tag {{ $isEditing ? 'ant-tag-blue' : 'ant-tag-green' }}">{{ $isEditing ? 'Đang chỉnh sửa' : 'Tạo mới' }}</span></div>

        <div class="admin-catalog-form-layout">
            <div class="admin-form-grid admin-catalog-fields">
                <div class="admin-form-group admin-form-span"><label class="admin-form-label" for="album-title">Tên album <span>*</span></label><input id="album-title" name="title" data-slug-source="album-slug" value="{{ old('title', $item?->title) }}" maxlength="160" class="ant-input admin-form-input @error('title') is-invalid @enderror" required>@error('title')<p class="admin-field-error">{{ $message }}</p>@enderror</div>
                <div class="admin-form-group"><label class="admin-form-label" for="album-slug">Slug</label><div class="admin-slug-input-row"><input id="album-slug" name="slug" value="{{ old('slug', $item?->slug) }}" maxlength="180" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" class="ant-input admin-form-input @error('slug') is-invalid @enderror" placeholder="tu-dong-theo-ten"><button type="button" class="ant-btn admin-slug-reset" data-slug-reset="album-slug">Theo tên</button></div><p class="admin-field-help">Để trống để tạo theo tên; slug không được trùng.</p>@error('slug')<p class="admin-field-error">{{ $message }}</p>@enderror</div>
                <div class="admin-form-group"><label class="admin-form-label" for="album-release-date">Ngày phát hành</label><input id="album-release-date" name="release_date" type="date" value="{{ old('release_date', $item?->release_date?->format('Y-m-d')) }}" max="{{ now()->toDateString() }}" class="ant-input admin-form-input @error('release_date') is-invalid @enderror">@error('release_date')<p class="admin-field-error">{{ $message }}</p>@enderror</div>
                <div class="admin-form-group"><label class="admin-form-label" for="album-status">Trạng thái <span>*</span></label><select id="album-status" name="status" class="ant-input admin-form-input @error('status') is-invalid @enderror" required>@foreach (['draft' => 'Bản nháp', 'published' => 'Đã phát hành', 'blocked' => 'Đã chặn'] as $value => $label)<option value="{{ $value }}" @selected(old('status', $item?->status ?? 'draft') === $value)>{{ $label }}</option>@endforeach</select>@error('status')<p class="admin-field-error">{{ $message }}</p>@enderror</div>
                <div class="admin-form-group"><label class="admin-form-label">Nghệ sĩ <span>*</span></label><div class="admin-selection-panel admin-selection-panel-compact @error('artist_ids') is-invalid @enderror" data-selection-panel><input type="search" class="ant-input admin-selection-search" placeholder="Tìm nghệ sĩ..." data-selection-search aria-label="Tìm nghệ sĩ album"><div class="admin-selection-list">@forelse($artists ?? [] as $artist)<label class="admin-selection-option" data-selection-option><input type="checkbox" name="artist_ids[]" value="{{ $artist->getKey() }}" @checked(in_array((string) $artist->getKey(), $selectedArtistIds, true))><span><strong>{{ $artist->name }}</strong><small>{{ $artist->status === 'active' ? 'Đang hoạt động' : 'Tạm ẩn' }}</small></span></label>@empty<div class="admin-selection-empty">Chưa có nghệ sĩ. Hãy tạo nghệ sĩ trước.</div>@endforelse</div></div><p class="admin-field-help">Chọn ít nhất một; có thể chọn nhiều nghệ sĩ.</p>@error('artist_ids')<p class="admin-field-error">{{ $message }}</p>@enderror</div>
                <div class="admin-form-group admin-form-span"><label class="admin-form-label">Bài hát thuộc album</label><div class="admin-selection-panel" data-selection-panel><input type="search" class="ant-input admin-selection-search" placeholder="Tìm bài hát trong kho..." data-selection-search aria-label="Tìm bài hát thuộc album"><div class="admin-selection-list">@forelse($songs ?? [] as $song)<label class="admin-selection-option" data-selection-option><input type="checkbox" name="song_ids[]" value="{{ $song->getKey() }}" @checked(in_array((string) $song->getKey(), $selectedSongIds, true))><span><strong>{{ $song->title }}</strong><small>{{ $song->artist_name ?: 'Chưa có nghệ sĩ' }}</small></span></label>@empty<div class="admin-selection-empty">Chưa có bài hát trong kho.</div>@endforelse</div></div><p class="admin-field-help">Chọn các bài đã nhập kho; lưu album sẽ tự gắn chúng vào album này.</p>@error('song_ids')<p class="admin-field-error">{{ $message }}</p>@enderror</div>
            </div>

            @php($currentPublicId = $item?->cover_public_id)
            @php($currentImageUrl = $item?->cover_url)
            <aside class="admin-media-library" data-media-picker>
                <div class="admin-media-library-heading"><div><strong>Ảnh bìa album</strong><span>Kho Cloudinary: melodify</span></div>@if(filled($currentImageUrl))<span class="ant-tag ant-tag-green">Đang dùng ảnh</span>@endif</div>
                <div class="admin-media-preview" data-media-preview>@if(filled($currentImageUrl))<img src="{{ $currentImageUrl }}" alt="Ảnh album hiện tại"><span>Ảnh hiện tại</span>@else<span>Chưa có ảnh xem trước</span>@endif</div>
                <label class="admin-media-upload"><input type="file" name="image" accept="image/jpeg,image/png,image/webp" data-media-input><span class="admin-media-upload-icon">↑</span><span><strong>Tải ảnh mới</strong><small>JPG, PNG hoặc WEBP · tối đa 5MB</small></span></label>
                @error('image')<p class="admin-field-error">{{ $message }}</p>@enderror
                @error('image_asset_id')<p class="admin-field-error">{{ $message }}</p>@enderror
                <div class="admin-media-library-title">Chọn ảnh đã lưu</div>
                <div class="admin-media-grid">@forelse($mediaAssets ?? [] as $asset)<label class="admin-media-card" data-media-card data-image-url="{{ $asset->secure_url }}" data-image-name="{{ $asset->original_name ?: 'Ảnh từ kho' }}"><input type="radio" name="image_asset_id" value="{{ $asset->getKey() }}" @checked((string) old('image_asset_id') === (string) $asset->getKey() || (!old('image_asset_id') && $currentPublicId === $asset->public_id))><img src="{{ \App\Services\MediaAssetService::thumbnailUrl($asset->secure_url) }}" alt="{{ $asset->original_name ?: 'Ảnh Melodify' }}" loading="lazy" decoding="async"><span>{{ \Illuminate\Support\Str::limit($asset->original_name ?: 'Ảnh đã lưu', 22) }}</span></label>@empty<div class="admin-media-empty">Chưa có ảnh trong kho. Hãy tải ảnh đầu tiên.</div>@endforelse</div>
            </aside>
        </div>
        <div class="admin-form-actions admin-resource-form-actions"><a href="{{ route('admin.albums.index') }}" class="ant-btn">Hủy</a><button class="ant-btn ant-btn-primary" type="submit">{{ $isEditing ? 'Lưu thay đổi' : 'Tạo album' }}</button></div>
    </form>
</section>
