<?php

namespace App\Http\Controllers\AdminController;

use App\Http\Requests\Admin\AdminResourceRequest;
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
        'role' => ['label' => 'Phân quyền', 'type' => 'select', 'required' => true, 'help' => 'Admin lớn có toàn quyền; Admin nhỏ không thể quản lý tài khoản quản trị.', 'options' => ['super_admin' => 'Admin lớn', 'admin' => 'Admin nhỏ']],
        'permissions' => ['label' => 'Chức năng được phép', 'type' => 'checkbox_group', 'help' => 'Chỉ áp dụng cho Admin nhỏ. Admin lớn luôn có toàn quyền.', 'options' => [
            'content.manage' => ['label' => 'Nội dung âm nhạc', 'description' => 'Bài hát, album, thể loại, playlist và nghệ sĩ.'],
            'users.manage' => ['label' => 'Người dùng', 'description' => 'Xem, tạo, sửa và khóa tài khoản người dùng.'],
            'billing.manage' => ['label' => 'Gói và thanh toán', 'description' => 'Gói đăng ký và lịch sử giao dịch.'],
            'moderation.manage' => ['label' => 'Kiểm duyệt', 'description' => 'Bình luận và báo cáo vi phạm.'],
        ]],
        'status' => ['label' => 'Trạng thái', 'type' => 'select', 'required' => true, 'options' => ['active' => 'Hoạt động', 'inactive' => 'Tạm khóa']],
        'password' => ['label' => 'Mật khẩu', 'type' => 'password', 'help' => 'Để trống khi sửa nếu không muốn đổi mật khẩu.'],
        'password_confirmation' => ['label' => 'Xác nhận mật khẩu', 'type' => 'password'],
    ];

    protected function normalize(array $data): array
    {
        $data = parent::normalize($data);
        $data['is_active'] = ($data['status'] ?? 'inactive') === 'active';
        $availablePermissions = array_keys(config('admin-permissions.groups', []));

        $data['permissions'] = $data['role'] === 'super_admin'
            ? $availablePermissions
            : array_values(array_intersect($data['permissions'] ?? [], $availablePermissions));

        return $data;
    }

    public function update(AdminResourceRequest $request, string $id): RedirectResponse
    {
        $admin = Admin::query()->findOrFail($id);
        $data = $request->validated();

        if ($admin->role === 'super_admin' && $data['role'] !== 'super_admin' && Admin::query()->where('role', 'super_admin')->count() <= 1) {
            return back()->withInput()->with('error', 'Hệ thống phải luôn có ít nhất một Admin lớn.');
        }

        $admin->update($this->normalize($data));

        return redirect()->route('admin.admins.index')->with('success', 'Đã cập nhật quản trị viên.');
    }

    public function destroy(string $id): RedirectResponse
    {
        if ((string) auth('admin')->id() === $id) {
            return back()->with('error', 'Bạn không thể xóa tài khoản đang đăng nhập.');
        }

        $admin = Admin::query()->findOrFail($id);

        if ($admin->role === 'super_admin' && Admin::query()->where('role', 'super_admin')->count() <= 1) {
            return back()->with('error', 'Hệ thống phải còn ít nhất một Admin lớn.');
        }

        return parent::destroy($id);
    }
}
