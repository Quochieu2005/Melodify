<?php

namespace App\Http\Controllers\AdminController;

use App\Models\Genre;

class GenreController extends CrudResourceController
{
    protected string $model = Genre::class;

    protected string $resource = 'genres';

    protected string $title = 'thể loại';

    protected array $columns = ['name' => 'Tên thể loại', 'slug' => 'Slug', 'status' => 'Trạng thái'];

    protected array $fields = [
        'name' => ['label' => 'Tên thể loại', 'required' => true],
        'slug' => ['label' => 'Slug', 'required' => true],
        'description' => ['label' => 'Mô tả', 'type' => 'textarea'],
        'status' => ['label' => 'Trạng thái', 'type' => 'select', 'required' => true, 'options' => ['active' => 'Hoạt động', 'inactive' => 'Tạm ẩn']],
    ];
}
