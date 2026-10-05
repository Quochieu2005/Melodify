<?php

namespace App\Http\Controllers\AdminController;

use App\Models\Album;
use App\Models\Artist;

class AlbumController extends CrudResourceController
{
    protected string $model = Album::class;

    protected string $resource = 'albums';

    protected string $title = 'album';

    protected array $columns = ['title' => 'Tên album', 'artist.name' => 'Nghệ sĩ', 'release_date' => 'Ngày phát hành', 'status' => 'Trạng thái'];

    protected array $fields = [
        'title' => ['label' => 'Tên album', 'required' => true],
        'slug' => ['label' => 'Slug', 'required' => true],
        'artist_id' => ['label' => 'Nghệ sĩ', 'type' => 'select', 'placeholder' => 'Chọn nghệ sĩ', 'required' => true, 'option_model' => Artist::class, 'option_label' => 'name'],
        'release_date' => ['label' => 'Ngày phát hành', 'type' => 'date'],
        'cover_url' => ['label' => 'URL ảnh bìa', 'type' => 'url'],
        'status' => ['label' => 'Trạng thái', 'type' => 'select', 'required' => true, 'options' => ['draft' => 'Bản nháp', 'published' => 'Đã phát hành', 'blocked' => 'Đã chặn']],
    ];
}
