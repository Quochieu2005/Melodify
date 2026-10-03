<?php

namespace App\Http\Controllers\AdminController;

use App\Models\Artist;

class ArtistController extends CrudResourceController
{
    protected string $model = Artist::class;

    protected string $resource = 'artists';

    protected string $title = 'nghệ sĩ';

    protected array $columns = ['name' => 'Tên nghệ sĩ', 'verified' => 'Xác minh', 'status' => 'Trạng thái'];

    protected array $fields = [
        'name' => ['label' => 'Tên nghệ sĩ', 'required' => true],
        'bio' => ['label' => 'Giới thiệu', 'type' => 'textarea'],
        'avatar_url' => ['label' => 'URL ảnh đại diện', 'type' => 'url'],
        'verified' => ['label' => 'Đã xác minh', 'type' => 'checkbox'],
        'status' => ['label' => 'Trạng thái', 'type' => 'select', 'required' => true, 'options' => ['active' => 'Hoạt động', 'inactive' => 'Tạm ẩn', 'blocked' => 'Đã chặn']],
    ];
}
