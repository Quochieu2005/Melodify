<?php

namespace App\Http\Controllers\AdminController;

use App\Models\Genre;
use App\Rules\PlainText;

class GenreController extends MediaCatalogController
{
    protected string $model = Genre::class;

    protected string $resource = 'genres';

    protected string $title = 'thể loại';

    protected string $viewDirectory = 'Admin.genres';

    protected array $columns = [
        'image_url' => 'Ảnh',
        'name' => 'Tên thể loại',
        'slug' => 'Slug',
        'sort_order' => 'Thứ tự',
        'status' => 'Trạng thái',
    ];

    protected array $formFields = [
        'name' => ['label' => 'Tên thể loại', 'required' => true],
        'slug' => ['label' => 'Slug', 'help' => 'Để trống để tự tạo theo tên; slug không được trùng.'],
        'description' => ['label' => 'Mô tả', 'type' => 'textarea'],
        'sort_order' => ['label' => 'Thứ tự hiển thị', 'type' => 'number', 'default' => 0, 'required' => true],
        'status' => ['label' => 'Trạng thái', 'type' => 'select', 'required' => true, 'options' => ['active' => 'Hoạt động', 'inactive' => 'Tạm ẩn']],
    ];

    protected function rules(?object $item): array
    {
        return [
            'name' => ['required', 'string', 'max:150', new PlainText()],
            'slug' => ['nullable', 'string', 'max:180', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', new PlainText()],
            'description' => ['nullable', 'string', 'max:2000', new PlainText()],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:9999'],
            'status' => ['required', 'in:active,inactive'],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'image_asset_id' => ['nullable', 'string', 'max:64'],
        ];
    }
}
