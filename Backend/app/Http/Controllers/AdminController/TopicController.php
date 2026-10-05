<?php

namespace App\Http\Controllers\AdminController;

use App\Models\Topic;

class TopicController extends MediaCatalogController
{
    protected string $model = Topic::class;

    protected string $resource = 'topics';

    protected string $title = 'chủ đề';

    protected array $columns = [
        'image_url' => 'Ảnh',
        'name' => 'Tên chủ đề',
        'slug' => 'Slug',
        'sort_order' => 'Thứ tự',
        'status' => 'Trạng thái',
    ];

    protected array $formFields = [
        'name' => ['label' => 'Tên chủ đề', 'required' => true],
        'slug' => ['label' => 'Slug', 'help' => 'Để trống để tự tạo theo tên; slug không được trùng.'],
        'description' => ['label' => 'Mô tả', 'type' => 'textarea'],
        'sort_order' => ['label' => 'Thứ tự hiển thị', 'type' => 'number', 'default' => 0, 'required' => true],
        'status' => ['label' => 'Trạng thái', 'type' => 'select', 'required' => true, 'options' => ['active' => 'Hoạt động', 'inactive' => 'Tạm ẩn']],
    ];

    protected function rules(?object $item): array
    {
        return [
            'name' => ['required', 'string', 'max:150'],
            'slug' => ['nullable', 'string', 'max:180', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/'],
            'description' => ['nullable', 'string'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'status' => ['required', 'in:active,inactive'],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'image_asset_id' => ['nullable', 'string'],
        ];
    }
}
