<?php

namespace App\Http\Controllers\AdminController;

use App\Models\User;

class UserController extends CrudResourceController
{
    protected string $model = User::class;

    protected string $resource = 'users';

    protected string $title = 'người dùng';

    protected string $viewDirectory = 'Admin.users';

    protected array $columns = ['avatar_url' => 'Ảnh', 'name' => 'Họ tên', 'username' => 'Username', 'email' => 'Email', 'phone' => 'Điện thoại', 'created_at' => 'Ngày tham gia', 'is_premium' => 'Premium', 'last_login_at' => 'Đăng nhập lần cuối', 'last_login_method' => 'Cách đăng nhập gần nhất', 'status' => 'Trạng thái'];

    protected array $searchable = ['name', 'username', 'email', 'phone', 'slug'];

    protected array $fields = [
        'name' => ['label' => 'Họ tên', 'required' => true],
        'email' => ['label' => 'Email', 'type' => 'email', 'required' => true],
        'username' => ['label' => 'Tên đăng nhập'],
        'slug' => ['label' => 'Slug', 'required' => true],
        'phone' => ['label' => 'Số điện thoại'],
        'is_premium' => ['label' => 'Premium / VIP', 'type' => 'checkbox'],
        'password' => ['label' => 'Mật khẩu', 'type' => 'password', 'help' => 'Để trống khi sửa nếu không muốn đổi mật khẩu.'],
        'password_confirmation' => ['label' => 'Xác nhận mật khẩu', 'type' => 'password'],
        'status' => ['label' => 'Trạng thái', 'type' => 'select', 'required' => true, 'options' => ['active' => 'Hoạt động', 'blocked' => 'Đã khóa']],
    ];

    protected function normalize(array $data, mixed $ignoreId = null): array
    {
        $data = parent::normalize($data, $ignoreId);
        $data['is_premium'] = request()->boolean('is_premium') ? 1 : 0;

        return $data;
    }
}
