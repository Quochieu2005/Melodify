@extends('layouts.admin')

@section('content')
<section class="admin-page admin-form-page admin-banner-form-page">
    <div class="admin-page-header">
        <a href="{{ route('admin.banners.index') }}" class="admin-back-link">← Quay lại danh sách banner</a>
    </div>
    <form method="POST" action="{{ route('admin.banners.update', $item->slug) }}" enctype="multipart/form-data" class="ant-card admin-resource-form admin-banner-form" autocomplete="off">
        @csrf @method('PUT')
        <div class="admin-resource-form-heading">
            <div class="admin-banner-heading-copy">
                <span class="admin-banner-heading-icon"><x-anticon name="sound" aria-hidden="true" /></span>
                <div><strong>Chỉnh sửa banner</strong><span>Cập nhật ảnh, đường dẫn và vị trí hiển thị trên hệ thống.</span></div>
            </div>
            <span class="ant-tag ant-tag-blue"><x-anticon name="setting" aria-hidden="true" /> Đang chỉnh sửa</span>
        </div>
        <div class="admin-banner-form-layout">
            <div class="admin-banner-form-fields">
                <div class="admin-banner-section-heading admin-form-span">
                    <span class="admin-banner-section-marker" aria-hidden="true"></span>
                    <div><strong>Nội dung & đường dẫn</strong><p>Đặt tên dễ nhận biết và nơi người dùng sẽ đến khi nhấn vào banner.</p></div>
                </div>
                <div class="admin-form-group"><label class="admin-form-label" for="banner-title">Tên banner <span>*</span></label><input id="banner-title" name="title" data-slug-source="banner-slug" value="{{ old('title', $item->title) }}" maxlength="100" class="ant-input admin-form-input @error('title') is-invalid @enderror" required><p class="admin-field-help">Tối đa 100 ký tự.</p>@error('title')<p class="admin-field-error">{{ $message }}</p>@enderror</div>
                <div class="admin-form-group"><label class="admin-form-label" for="banner-slug">Slug</label><div class="admin-slug-input-row"><input id="banner-slug" name="slug" value="{{ old('slug', $item->slug) }}" maxlength="120" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" class="ant-input admin-form-input @error('slug') is-invalid @enderror" placeholder="tu-dong-theo-ten"><button type="button" class="ant-btn admin-slug-reset" data-slug-reset="banner-slug">Theo tên</button></div><p class="admin-field-help">Tối đa 120 ký tự; tự tạo theo tên hoặc tự sửa, không được trùng.</p>@error('slug')<p class="admin-field-error">{{ $message }}</p>@enderror</div>
                <div class="admin-form-group admin-form-span"><label class="admin-form-label" for="banner-link-url">URL khi nhấn vào banner</label><input id="banner-link-url" name="link_url" type="text" value="{{ old('link_url', $item->link_url) }}" maxlength="500" class="ant-input admin-form-input @error('link_url') is-invalid @enderror" placeholder="/home hoặc https://melodify.vn/..."><p class="admin-field-help">Chỉ dùng đường dẫn nội bộ bắt đầu bằng / hoặc URL http(s) hợp lệ.</p>@error('link_url')<p class="admin-field-error">{{ $message }}</p>@enderror</div>
                @include('Admin.banners.relations')
                <div class="admin-banner-section-heading admin-form-span">
                    <span class="admin-banner-section-marker" aria-hidden="true"></span>
                    <div><strong>Cách hiển thị</strong><p>Điều chỉnh thứ tự và trạng thái xuất hiện của banner.</p></div>
                </div>
                <div class="admin-form-group"><label class="admin-form-label" for="banner-sort-order">Thứ tự hiển thị <span>*</span></label><input id="banner-sort-order" name="sort_order" type="number" min="0" max="9999" step="1" inputmode="numeric" value="{{ old('sort_order', $item->sort_order) }}" class="ant-input admin-form-input @error('sort_order') is-invalid @enderror" required><p class="admin-field-help">Có thể trùng. Khi bằng nhau, banner tạo mới hơn được hiển thị trước.</p>@error('sort_order')<p class="admin-field-error">{{ $message }}</p>@enderror</div>
                <div class="admin-form-group"><label class="admin-form-label" for="banner-status">Trạng thái <span>*</span></label><select id="banner-status" name="status" class="ant-input admin-form-input @error('status') is-invalid @enderror" required><option value="active" @selected(old('status', $item->status) === 'active')>Đang hiển thị</option><option value="inactive" @selected(old('status', $item->status) === 'inactive')>Tạm ẩn</option></select>@error('status')<p class="admin-field-error">{{ $message }}</p>@enderror</div>
            </div>
            <aside class="admin-banner-upload-card admin-media-library" data-media-picker>
                <div class="admin-banner-upload-heading"><span class="admin-banner-upload-icon"><x-anticon name="cloud-upload" aria-hidden="true" /></span><div><strong>Ảnh hiển thị</strong><span>Khung đề xuất 16:7</span></div></div>
                <div class="admin-banner-preview admin-media-preview" data-banner-preview data-media-preview>@if(filled($item->image_url))<img src="{{ $item->image_url }}" alt="Ảnh banner hiện tại"><span>Ảnh hiện tại</span>@else<span>Chưa có ảnh xem trước</span>@endif</div>
                <div class="admin-banner-upload-meta"><div><label class="admin-form-label" for="banner-image">Ảnh banner</label><p>Bỏ trống để giữ ảnh hiện tại.</p></div><span class="ant-tag ant-tag-blue">16:7</span></div>
                <label class="admin-banner-file-picker" for="banner-image"><span class="admin-banner-file-picker-icon"><x-anticon name="folder" aria-hidden="true" /></span><span><strong>Chọn ảnh mới</strong><small>Hoặc chọn ảnh đã lưu bên dưới</small></span><span class="admin-banner-file-picker-action">Chọn tệp</span><input id="banner-image" name="image" type="file" accept="image/jpeg,image/png,image/webp" class="admin-banner-file-input @error('image') is-invalid @enderror" data-banner-input data-media-input></label>
                <p class="admin-banner-selected-file" data-banner-file-name>{{ filled($item->image_url) ? 'Đang dùng ảnh hiện tại' : 'Chưa chọn tệp' }}</p>
                @error('image')<p class="admin-field-error">{{ $message }}</p>@enderror
                @error('image_asset_id')<p class="admin-field-error">{{ $message }}</p>@enderror
                <div class="admin-media-library-title">Chọn ảnh đã lưu</div><div class="admin-media-grid">@forelse($mediaAssets ?? [] as $asset)<label class="admin-media-card" data-media-card data-image-url="{{ $asset->secure_url }}" data-image-name="{{ $asset->original_name ?: 'Ảnh từ kho' }}"><input type="radio" name="image_asset_id" value="{{ $asset->getKey() }}" @checked((string) old('image_asset_id') === (string) $asset->getKey() || (!old('image_asset_id') && $item->image_public_id === $asset->public_id))><img src="{{ \App\Services\MediaAssetService::thumbnailUrl($asset->secure_url) }}" alt="{{ $asset->original_name ?: 'Ảnh Melodify' }}" loading="lazy" decoding="async"><span>{{ \Illuminate\Support\Str::limit($asset->original_name ?: 'Ảnh đã lưu', 22) }}</span></label>@empty<div class="admin-media-empty">Chưa có ảnh trong kho.</div>@endforelse</div>
            </aside>
        </div>
        <div class="admin-form-actions admin-resource-form-actions"><a href="{{ route('admin.banners.index') }}" class="ant-btn">Hủy</a><button type="submit" class="ant-btn ant-btn-primary">Lưu thay đổi</button></div>
    </form>
</section>
@endsection
