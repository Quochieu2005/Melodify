<?php

namespace App\Http\Controllers\AdminController;

use App\Models\Album;
use App\Models\Song;

class SongController extends CrudResourceController
{
    protected string $model = Song::class;

    protected string $resource = 'songs';

    protected string $title = 'bài hát';

    protected string $viewDirectory = 'Admin.songs';

    protected array $columns = ['title' => 'Tên bài hát', 'release_date' => 'Ngày phát hành', 'duration_seconds' => 'Thời lượng', 'status' => 'Trạng thái'];

    protected array $fields = [
        'title' => ['label' => 'Tên bài hát', 'required' => true],
        'slug' => ['label' => 'Slug', 'required' => true, 'help' => 'Ví dụ: lac-troi-son-tung-mtp'],
        'album_id' => ['label' => 'Album', 'type' => 'select', 'placeholder' => 'Không thuộc album', 'option_model' => Album::class, 'option_label' => 'title'],
        'release_date' => ['label' => 'Ngày phát hành', 'type' => 'date'],
        'duration_seconds' => ['label' => 'Thời lượng (giây)', 'type' => 'number'],
        'explicit' => ['label' => 'Nội dung nhạy cảm', 'type' => 'checkbox'],
        'status' => ['label' => 'Trạng thái', 'type' => 'select', 'required' => true, 'options' => ['draft' => 'Bản nháp', 'published' => 'Đã phát hành', 'blocked' => 'Đã chặn']],
    ];
}
