<?php

namespace App\Http\Controllers\AdminController;

use App\Models\Admin;
use Illuminate\Http\RedirectResponse;

class AdminManagementController extends CrudResourceController
{
    protected string $model = Admin::class;

    protected string $resource = 'admins';

    protected string $title = 'quản trị viên';

    protected array $columns = [
        'name' => 'Họ tên',
        'email' => 'Email',
        'role' => 'Vai trò',
        'status' => 'Trạng thái',
    ];

    protected array $fields = [
        'name' => ['label' => 'Họ tên', 'required' => true],
        'email' => ['label' => 'Email', 'type' => 'email', 'required' => true],
        'slug' => ['label' => 'Slug', 'required' => true, 'help' => 'Dùng chữ thường, số và dấu gạch ngang.'],
        'avatar' => ['label' => 'URL ảnh đại diện', 'type' => 'url'],
        'role' => ['label' => 'Vai trò', 'type' => 'select', 'required' => true, 'options' => ['super_admin' => 'Quản trị cấp cao', 'content_manager' => 'Quản lý nội dung', 'support' => 'Hỗ trợ người dùng']],
        'status' => ['label' => 'Trạng thái', 'type' => 'select', 'required' => true, 'options' => ['active' => 'Hoạt động', 'inactive' => 'Tạm khóa']],
        'password' => ['label' => 'Mật khẩu', 'type' => 'password', 'help' => 'Để trống khi sửa nếu không muốn đổi mật khẩu.'],
        'password_confirmation' => ['label' => 'Xác nhận mật khẩu', 'type' => 'password'],
    ];

    protected function normalize(array $data): array
    {
        $data = parent::normalize($data);
        $data['is_active'] = ($data['status'] ?? 'inactive') === 'active';

        return $data;
    }

    public function destroy(string $id): RedirectResponse
    {
        if ((string) auth('admin')->id() === $id) {
            return back()->with('error', 'Bạn không thể xóa tài khoản đang đăng nhập.');
        }

        $admin = Admin::query()->findOrFail($id);

        if ($admin->role === 'super_admin' && Admin::query()->where('role', 'super_admin')->count() <= 1) {
            return back()->with('error', 'Hệ thống phải còn ít nhất một quản trị viên cấp cao.');
        }

        return parent::destroy($id);
    }
}
