<?php

namespace App\Http\Controllers\AdminController;

use App\Models\Song;

class SongController extends CrudResourceController
{
    protected string $model = Song::class;

    protected string $resource = 'songs';

    protected string $title = 'bài hát';

    protected array $columns = ['title' => 'Tên bài hát', 'release_date' => 'Ngày phát hành', 'duration_seconds' => 'Thời lượng', 'status' => 'Trạng thái'];

    protected array $fields = [
        'title' => ['label' => 'Tên bài hát', 'required' => true],
        'album_id' => ['label' => 'Mã album'],
        'release_date' => ['label' => 'Ngày phát hành', 'type' => 'date'],
        'duration_seconds' => ['label' => 'Thời lượng (giây)', 'type' => 'number'],
        'explicit' => ['label' => 'Nội dung nhạy cảm', 'type' => 'checkbox'],
        'status' => ['label' => 'Trạng thái', 'type' => 'select', 'required' => true, 'options' => ['draft' => 'Bản nháp', 'published' => 'Đã phát hành', 'blocked' => 'Đã chặn']],
    ];
}
