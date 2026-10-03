<?php

namespace App\Http\Controllers\AdminController;

use App\Models\Playlist;

class PlaylistController extends CrudResourceController
{
    protected string $model = Playlist::class;

    protected string $resource = 'playlists';

    protected string $title = 'playlist';

    protected array $columns = ['name' => 'Tên playlist', 'is_system' => 'Hệ thống', 'status' => 'Trạng thái'];

    protected array $fields = [
        'name' => ['label' => 'Tên playlist', 'required' => true],
        'description' => ['label' => 'Mô tả', 'type' => 'textarea'],
        'cover_url' => ['label' => 'URL ảnh bìa', 'type' => 'url'],
        'is_system' => ['label' => 'Playlist hệ thống', 'type' => 'checkbox'],
        'status' => ['label' => 'Trạng thái', 'type' => 'select', 'required' => true, 'options' => ['active' => 'Hoạt động', 'inactive' => 'Tạm ẩn']],
    ];
}
