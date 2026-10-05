@extends('layouts.admin')

@section('content')
<section class="admin-page admin-form-page admin-catalog-page">
    <div class="admin-page-header">
        <div>
            <a href="{{ route("admin.$resource.index") }}" class="admin-back-link">← Quay lại</a>
            <h1 class="admin-page-title">{{ $item ? 'Chỉnh sửa' : 'Thêm' }} {{ $resourceTitle }}</h1>
            <p class="admin-page-description">Thông tin có dấu * là bắt buộc. Bạn có thể dùng ảnh mới hoặc chọn ảnh cũ trong kho ảnh.</p>
        </div>
    </div>

    <form method="POST" enctype="multipart/form-data" action="{{ $item ? route("admin.$resource.update", $item->getKey()) : route("admin.$resource.store") }}" class="ant-card admin-resource-form admin-catalog-form">
        @csrf
        @if($item) @method('PUT') @endif

        <div class="admin-resource-form-heading">
            <div><strong>Thông tin {{ $resourceTitle }}</strong><span>Slug có thể tự tạo theo tên hoặc nhập thủ công.</span></div>
            <span class="ant-tag {{ $item ? 'ant-tag-blue' : 'ant-tag-green' }}">{{ $item ? 'Đang chỉnh sửa' : 'Tạo mới' }}</span>
        </div>

        <div class="admin-catalog-form-layout">
            <div class="admin-form-grid admin-catalog-fields">
                @foreach($fields as $name => $field)
                    @php
                        $type = $field['type'] ?? 'text';
                        $value = old($name, $item ? data_get($item, $name) : ($field['default'] ?? null));
                    @endphp
                    <div class="admin-form-group {{ in_array($type, ['textarea', 'checkbox'], true) ? 'admin-form-span' : '' }}">
                        @if($type === 'checkbox')
                            <label class="admin-checkbox-card">
                                <input type="hidden" name="{{ $name }}" value="0">
                                <input type="checkbox" name="{{ $name }}" value="1" @checked((bool) $value)>
                                <span><strong>{{ $field['label'] }}</strong><small>{{ $field['help'] ?? 'Bật hoặc tắt tùy chọn này.' }}</small></span>
                            </label>
                        @else
                            <label class="admin-form-label" for="{{ $name }}">{{ $field['label'] }} @if($field['required'] ?? false)<span aria-hidden="true">*</span>@endif</label>
                            @if($type === 'textarea')
                                <textarea id="{{ $name }}" name="{{ $name }}" rows="5" class="ant-input admin-form-input @error($name) is-invalid @enderror">{{ $value }}</textarea>
                            @elseif($type === 'select')
                                <select id="{{ $name }}" name="{{ $name }}" class="ant-input admin-form-input @error($name) is-invalid @enderror">
                                    @if(isset($field['placeholder']))<option value="">{{ $field['placeholder'] }}</option>@endif
                                    @foreach($field['options'] ?? [] as $optionValue => $optionLabel)
                                        <option value="{{ $optionValue }}" @selected((string) $value === (string) $optionValue)>{{ $optionLabel }}</option>
                                    @endforeach
                                </select>
                            @else
                                <input id="{{ $name }}" name="{{ $name }}" type="{{ $type }}" value="{{ $value }}" class="ant-input admin-form-input @error($name) is-invalid @enderror" @required($field['required'] ?? false)>
                            @endif
                        @endif
                        @error($name)<p class="admin-field-error">{{ $message }}</p>@enderror
                        @if($field['help'] ?? false)<p class="admin-field-help">{{ $field['help'] }}</p>@endif
                    </div>
                @endforeach
            </div>

            @php($currentPublicId = $item ? data_get($item, $imagePublicIdField) : null)
            @php($currentImageUrl = $item ? data_get($item, $imageUrlField) : null)
            <aside class="admin-media-library">
                <div class="admin-media-library-heading">
                    <div><strong>Ảnh đại diện</strong><span>Folder Cloudinary: melodify</span></div>
                    @if(filled($currentImageUrl))<span class="ant-tag ant-tag-green">Đang dùng ảnh</span>@endif
                </div>

                <label class="admin-media-upload">
                    <input type="file" name="image" accept="image/jpeg,image/png,image/webp">
                    <span class="admin-media-upload-icon">↑</span>
                    <span><strong>Tải ảnh mới</strong><small>JPG, PNG hoặc WEBP · tối đa 5MB</small></span>
                </label>
                @error('image')<p class="admin-field-error">{{ $message }}</p>@enderror
                @error('image_asset_id')<p class="admin-field-error">{{ $message }}</p>@enderror

                <div class="admin-media-library-title">Chọn ảnh đã lưu</div>
                <div class="admin-media-grid">
                    @forelse($mediaAssets as $asset)
                        <label class="admin-media-card">
                            <input type="radio" name="image_asset_id" value="{{ $asset->getKey() }}" @checked((string) old('image_asset_id') === (string) $asset->getKey() || (!old('image_asset_id') && $currentPublicId === $asset->public_id))>
                            <img src="{{ $asset->secure_url }}" alt="{{ $asset->original_name ?: 'Ảnh melodify' }}">
                            <span>{{ IlluminateSupportStr::limit($asset->original_name ?: 'Ảnh đã lưu', 22) }}</span>
                        </label>
                    @empty
                        <div class="admin-media-empty">Chưa có ảnh trong kho. Hãy tải ảnh đầu tiên.</div>
                    @endforelse
                </div>
            </aside>
        </div>

        <div class="admin-form-actions admin-resource-form-actions">
            <a href="{{ route("admin.$resource.index") }}" class="ant-btn">Hủy</a>
            <button type="submit" class="ant-btn ant-btn-primary">{{ $item ? 'Lưu thay đổi' : 'Tạo mới' }}</button>
        </div>
    </form>
</section>
@endsection
