<?php

namespace App\Http\Controllers\AdminController;

use App\Models\User;

class UserController extends CrudResourceController
{
    protected string $model = User::class;

    protected string $resource = 'users';

    protected string $title = 'người dùng';

    protected array $columns = ['name' => 'Họ tên', 'email' => 'Email', 'phone' => 'Điện thoại', 'status' => 'Trạng thái'];

    protected array $fields = [
        'name' => ['label' => 'Họ tên', 'required' => true],
        'email' => ['label' => 'Email', 'type' => 'email', 'required' => true],
        'phone' => ['label' => 'Số điện thoại'],
        'password' => ['label' => 'Mật khẩu', 'type' => 'password', 'help' => 'Để trống khi sửa nếu không muốn đổi mật khẩu.'],
        'password_confirmation' => ['label' => 'Xác nhận mật khẩu', 'type' => 'password'],
        'status' => ['label' => 'Trạng thái', 'type' => 'select', 'required' => true, 'options' => ['active' => 'Hoạt động', 'blocked' => 'Đã khóa']],
    ];
}
