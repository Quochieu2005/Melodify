<?php

namespace App\Http\Controllers\AdminController;

use App\Models\Topic;
use App\Rules\PlainText;

class TopicController extends MediaCatalogController
{
    protected string $model = Topic::class;

    protected string $resource = 'topics';

    protected string $title = 'chủ đề';

    protected string $viewDirectory = 'Admin.topics';

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
            'name' => ['bail', 'required', 'string', 'min:1', 'max:150', new PlainText()],
            'slug' => ['nullable', 'alpha_dash', 'max:180', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', new PlainText()],
            'description' => ['nullable', 'string', 'max:2000', new PlainText()],
            'sort_order' => ['required', 'integer', 'min:0', 'max:9999'],
            'status' => ['required', 'in:active,inactive'],
            'image' => [$item === null ? 'required_without:image_asset_id' : 'nullable', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120', 'dimensions:max_width=4000,max_height=4000'],
            'image_asset_id' => [$item === null ? 'required_without:image' : 'nullable', 'string', 'alpha_dash', 'max:64'],
        ];
    }
}
