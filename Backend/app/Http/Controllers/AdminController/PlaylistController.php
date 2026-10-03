<?php

namespace App\Http\Controllers\AdminController;

use App\Models\Playlist;
use App\Models\User;

class PlaylistController extends CrudResourceController
{
    protected string $model = Playlist::class;

    protected string $resource = 'playlists';

    protected string $title = 'playlist';

    protected array $columns = ['name' => 'Tên playlist', 'visibility' => 'Hiển thị', 'is_system' => 'Hệ thống'];

    protected array $fields = [
        'name' => ['label' => 'Tên playlist', 'required' => true],
        'slug' => ['label' => 'Slug', 'required' => true],
        'user_id' => ['label' => 'Chủ sở hữu', 'type' => 'select', 'placeholder' => 'Playlist hệ thống', 'option_model' => User::class, 'option_label' => 'email'],
        'description' => ['label' => 'Mô tả', 'type' => 'textarea'],
        'cover_url' => ['label' => 'URL ảnh bìa', 'type' => 'url'],
        'is_system' => ['label' => 'Playlist hệ thống', 'type' => 'checkbox'],
        'visibility' => ['label' => 'Quyền hiển thị', 'type' => 'select', 'required' => true, 'options' => ['public' => 'Công khai', 'private' => 'Riêng tư', 'unlisted' => 'Không công khai']],
    ];
}
