@extends('layouts.admin')

@section('content')
<section class="admin-page admin-form-page">
    <div class="admin-page-header">
        <div>
            <a href="{{ route("admin.$resource.index") }}" class="admin-back-link">← Quay lại</a>
            <h1 class="admin-page-title">{{ $item ? 'Chỉnh sửa' : 'Thêm' }} {{ $resourceTitle }}</h1>
            <p class="admin-page-description">{{ $item ? 'Cập nhật thông tin và lưu thay đổi.' : 'Điền các thông tin cần thiết để tạo dữ liệu mới.' }}</p>
        </div>
    </div>

    <form method="POST" action="{{ $item ? route("admin.$resource.update", $item->getKey()) : route("admin.$resource.store") }}" class="ant-card admin-resource-form">
        @csrf
        @if($item) @method('PUT') @endif

        <div class="admin-resource-form-heading">
            <div><strong>Thông tin {{ $resourceTitle }}</strong><span>Các trường có dấu * là bắt buộc.</span></div>
            <span class="ant-tag {{ $item ? 'ant-tag-blue' : 'ant-tag-green' }}">{{ $item ? 'Đang chỉnh sửa' : 'Tạo mới' }}</span>
        </div>

        <div class="admin-form-grid">
            @foreach($fields as $name => $field)
                @php
                    $type = $field['type'] ?? 'text';
                    $value = old($name, $item ? data_get($item, $name) : null);
                    if ($value instanceof \DateTimeInterface) $value = $value->format('Y-m-d');
                @endphp
                <div class="admin-form-group {{ in_array($type, ['textarea', 'checkbox', 'checkbox_group'], true) ? 'admin-form-span' : '' }}">
                    @if($type === 'checkbox')
                        <label class="admin-checkbox-card">
                            <input type="hidden" name="{{ $name }}" value="0">
                            <input type="checkbox" name="{{ $name }}" value="1" @checked((bool) $value)>
                            <span><strong>{{ $field['label'] }}</strong><small>{{ $field['help'] ?? 'Bật hoặc tắt tùy chọn này.' }}</small></span>
                        </label>
                    @elseif($type === 'checkbox_group')
                        @php($selectedValues = collect($value ?? [])->map(fn ($item) => (string) $item)->all())
                        <fieldset class="admin-permission-group">
                            <legend class="admin-form-label">{{ $field['label'] }}</legend>
                            <div class="admin-permission-options">
                                @foreach($field['options'] as $optionValue => $option)
                                    <label class="admin-checkbox-card">
                                        <input type="checkbox" name="{{ $name }}[]" value="{{ $optionValue }}" @checked(in_array($optionValue, $selectedValues, true))>
                                        <span><strong>{{ is_array($option) ? $option['label'] : $option }}</strong><small>{{ is_array($option) ? ($option['description'] ?? '') : '' }}</small></span>
                                    </label>
                                @endforeach
                            </div>
                        </fieldset>
                    @else
                        <label class="admin-form-label" for="{{ $name }}">{{ $field['label'] }} @if($field['required'] ?? false)<span aria-hidden="true">*</span>@endif</label>
                        @if($type === 'textarea')
                            <textarea id="{{ $name }}" name="{{ $name }}" rows="4" class="ant-input admin-form-input @error($name) is-invalid @enderror">{{ $value }}</textarea>
                        @elseif($type === 'select')
                            <select id="{{ $name }}" name="{{ $name }}" class="ant-input admin-form-input @error($name) is-invalid @enderror">
                                @if(isset($field['placeholder']))<option value="">{{ $field['placeholder'] }}</option>@endif
                                @foreach($field['options'] as $optionValue => $optionLabel)
                                    <option value="{{ $optionValue }}" @selected($value === $optionValue)>{{ $optionLabel }}</option>
                                @endforeach
                            </select>
                        @else
                            <input id="{{ $name }}" name="{{ $name }}" type="{{ $type }}" value="{{ $type === 'password' ? '' : $value }}" class="ant-input admin-form-input @error($name) is-invalid @enderror" @required($field['required'] ?? false)>
                        @endif
                    @endif
                    @error($name)<p class="admin-field-error">{{ $message }}</p>@enderror
                    @if($field['help'] ?? false)<p class="admin-field-help">{{ $field['help'] }}</p>@endif
                </div>
            @endforeach
        </div>

        <div class="admin-form-actions admin-resource-form-actions">
            <a href="{{ route("admin.$resource.index") }}" class="ant-btn">Hủy</a>
            <button type="submit" class="ant-btn ant-btn-primary">{{ $item ? 'Lưu thay đổi' : 'Tạo mới' }}</button>
        </div>
    </form>
</section>
@endsection
