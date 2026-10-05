<?php

namespace App\Http\Controllers\AdminController;

use App\Models\Playlist;
use App\Models\User;
use Illuminate\Http\Request;

class PlaylistController extends MediaCatalogController
{
    protected string $model = Playlist::class;

    protected string $resource = 'playlists';

    protected string $title = 'playlist';

    protected string $imageUrlField = 'cover_url';

    protected string $imagePublicIdField = 'cover_public_id';

    protected array $columns = [
        'cover_url' => 'Ảnh bìa',
        'name' => 'Tên playlist',
        'visibility' => 'Hiển thị',
        'status' => 'Trạng thái',
        'is_system' => 'Hệ thống',
    ];

    protected array $formFields = [
        'name' => ['label' => 'Tên playlist', 'required' => true],
        'slug' => ['label' => 'Slug', 'help' => 'Để trống để tự tạo theo tên; slug không được trùng.'],
        'user_id' => ['label' => 'Chủ sở hữu', 'type' => 'select', 'placeholder' => 'Playlist hệ thống', 'option_model' => User::class, 'option_label' => 'email'],
        'description' => ['label' => 'Mô tả', 'type' => 'textarea'],
        'is_system' => ['label' => 'Playlist hệ thống', 'type' => 'checkbox', 'help' => 'Playlist hệ thống không gắn với người dùng cụ thể.'],
        'visibility' => ['label' => 'Quyền hiển thị', 'type' => 'select', 'required' => true, 'options' => ['public' => 'Công khai', 'private' => 'Riêng tư', 'unlisted' => 'Không công khai']],
        'sort_order' => ['label' => 'Thứ tự hiển thị', 'type' => 'number', 'default' => 0, 'required' => true],
        'status' => ['label' => 'Trạng thái', 'type' => 'select', 'required' => true, 'options' => ['active' => 'Hoạt động', 'inactive' => 'Tạm ẩn']],
    ];

    protected function rules(?object $item): array
    {
        return [
            'name' => ['required', 'string', 'max:180'],
            'slug' => ['nullable', 'string', 'max:220', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/'],
            'user_id' => ['nullable', 'string'],
            'description' => ['nullable', 'string'],
            'is_system' => ['nullable', 'boolean'],
            'visibility' => ['required', 'in:public,private,unlisted'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'status' => ['required', 'in:active,inactive'],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'image_asset_id' => ['nullable', 'string'],
        ];
    }

    protected function normalizePayload(array $data, Request $request): array
    {
        $data = parent::normalizePayload($data, $request);

        if ($data['is_system'] ?? false) {
            $data['user_id'] = null;
        }

        return $data;
    }
}
