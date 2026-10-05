@extends('layouts.admin')

@section('content')
@php($isEditing = filled($item))
<section class="admin-page admin-form-page admin-banner-form-page">
    <div class="admin-page-header">
        <div>
            <a href="{{ route('admin.banners.index') }}" class="admin-back-link">← Quay lại danh sách banner</a>
            <p class="admin-page-kicker">Melodify / Banner</p>
            <h1 class="admin-page-title">{{ $isEditing ? 'Chỉnh sửa banner' : 'Tạo banner mới' }}</h1>
            <p class="admin-page-description">{{ $isEditing ? 'Cập nhật nội dung, liên kết và vị trí hiển thị.' : 'Tải ảnh lên Cloudinary và cấu hình vị trí hiển thị trên hệ thống.' }}</p>
        </div>
    </div>

    <form method="POST" action="{{ $isEditing ? route('admin.banners.update', $item->getKey()) : route('admin.banners.store') }}" enctype="multipart/form-data" class="ant-card admin-resource-form admin-banner-form">
        @csrf
        @if($isEditing) @method('PUT') @endif

        <div class="admin-resource-form-heading">
            <div>
                <strong>Thông tin banner</strong>
                <span>Các trường có dấu * là bắt buộc.</span>
            </div>
            <span class="ant-tag {{ $isEditing ? 'ant-tag-blue' : 'ant-tag-green' }}">{{ $isEditing ? 'Đang chỉnh sửa' : 'Tạo mới' }}</span>
        </div>

        <div class="admin-banner-form-layout">
            <div class="admin-banner-form-fields">
                <div class="admin-form-group">
                    <label class="admin-form-label" for="banner-title">Tên banner <span aria-hidden="true">*</span></label>
                    <input id="banner-title" name="title" value="{{ old('title', $item?->title) }}" class="ant-input admin-form-input @error('title') is-invalid @enderror" required>
                    @error('title')<p class="admin-field-error">{{ $message }}</p>@enderror
                </div>

                <div class="admin-form-group">
                    <label class="admin-form-label" for="banner-slug">Slug</label>
                    <input id="banner-slug" name="slug" value="{{ old('slug', $item?->slug) }}" class="ant-input admin-form-input @error('slug') is-invalid @enderror" placeholder="Tự tạo theo tên banner">
                    <p class="admin-field-help">Để trống để tự tạo. Nếu tự nhập, slug phải duy nhất và chỉ dùng chữ, số, dấu gạch ngang hoặc gạch dưới.</p>
                    @error('slug')<p class="admin-field-error">{{ $message }}</p>@enderror
                </div>

                <div class="admin-form-group admin-form-span">
                    <label class="admin-form-label" for="banner-link-url">URL khi nhấn vào banner</label>
                    <div class="admin-banner-input-with-icon">
                        <x-anticon name="file-text" aria-hidden="true" />
                        <input id="banner-link-url" name="link_url" value="{{ old('link_url', $item?->link_url) }}" class="ant-input admin-form-input @error('link_url') is-invalid @enderror" placeholder="/home hoặc https://melodify.vn/...">
                    </div>
                    <p class="admin-field-help">Có thể dùng đường dẫn nội bộ bắt đầu bằng / hoặc URL đầy đủ.</p>
                    @error('link_url')<p class="admin-field-error">{{ $message }}</p>@enderror
                </div>

                <div class="admin-form-group">
                    <label class="admin-form-label" for="banner-sort-order">Thứ tự hiển thị <span aria-hidden="true">*</span></label>
                    <input id="banner-sort-order" name="sort_order" type="number" min="0" max="999999" value="{{ old('sort_order', $item?->sort_order ?? 0) }}" class="ant-input admin-form-input @error('sort_order') is-invalid @enderror" required>
                    <p class="admin-field-help">Số nhỏ hơn sẽ được hiển thị trước.</p>
                    @error('sort_order')<p class="admin-field-error">{{ $message }}</p>@enderror
                </div>

                <div class="admin-form-group">
                    <label class="admin-form-label" for="banner-status">Trạng thái <span aria-hidden="true">*</span></label>
                    <select id="banner-status" name="status" class="ant-input admin-form-input @error('status') is-invalid @enderror" required>
                        <option value="active" @selected(old('status', $item?->status ?? 'active') === 'active')>Đang hiển thị</option>
                        <option value="inactive" @selected(old('status', $item?->status) === 'inactive')>Tạm ẩn</option>
                    </select>
                    @error('status')<p class="admin-field-error">{{ $message }}</p>@enderror
                </div>
            </div>

            <aside class="admin-banner-upload-card">
                <div class="admin-banner-preview" data-banner-preview>
                    @if($item?->image_url)
                        <img src="{{ $item->image_url }}" alt="Ảnh banner hiện tại">
                    @else
                        <x-anticon name="cloud-upload" aria-hidden="true" />
                        <strong>Chưa có ảnh</strong>
                        <span>Ảnh sẽ được lưu trong Cloudinary / banner</span>
                    @endif
                </div>
                <label class="admin-form-label" for="banner-image">Ảnh banner @if(! $isEditing)<span aria-hidden="true">*</span>@endif</label>
                <input id="banner-image" name="image" type="file" accept="image/jpeg,image/png,image/webp" class="ant-input admin-form-input @error('image') is-invalid @enderror" data-banner-input @required(! $isEditing)>
                <p class="admin-field-help">JPG, PNG hoặc WebP, tối đa 5 MB. Ảnh mới sẽ thay ảnh cũ.</p>
                @error('image')<p class="admin-field-error">{{ $message }}</p>@enderror
            </aside>
        </div>

        <div class="admin-form-actions admin-resource-form-actions">
            <a href="{{ route('admin.banners.index') }}" class="ant-btn">Hủy</a>
            <button type="submit" class="ant-btn ant-btn-primary">{{ $isEditing ? 'Lưu thay đổi' : 'Tạo banner' }}</button>
        </div>
    </form>
</section>
@endsection
