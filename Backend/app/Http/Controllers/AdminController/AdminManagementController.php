<?php

namespace App\Http\Controllers\AdminController;

use App\Http\Requests\Admin\AdminResourceRequest;
use App\Mail\AdminCredentialsMail;
use App\Models\Admin;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;

class AdminManagementController extends CrudResourceController
{
    protected string $model = Admin::class;

    protected string $resource = 'admins';

    protected string $title = 'quản trị viên';

    protected string $viewDirectory = 'Admin.admins';

    protected array $columns = [
        'name' => 'Họ tên',
        'email' => 'Email',
        'slug' => 'Slug',
        'role' => 'Vai trò',
        'status' => 'Trạng thái',
        'must_change_password' => 'Mật khẩu',
    ];

    protected array $fields = [
        'name' => ['label' => 'Họ tên', 'required' => true],
        'email' => ['label' => 'Email', 'type' => 'email', 'required' => true],
        'slug' => ['label' => 'Slug', 'help' => 'Để trống để tự tạo theo họ tên; nếu tự nhập thì slug không được trùng.'],
        'role' => ['label' => 'Phân quyền', 'type' => 'select', 'required' => true, 'default' => 'admin', 'help' => 'Admin lớn có toàn quyền; Admin nhỏ không thể quản lý tài khoản quản trị.', 'options' => ['super_admin' => 'Admin lớn', 'admin' => 'Admin nhỏ']],
        'permissions' => ['label' => 'Chức năng được phép', 'type' => 'checkbox_group', 'help' => 'Chỉ áp dụng cho Admin nhỏ. Admin lớn luôn có toàn quyền.', 'options' => [
            'content.manage' => ['label' => 'Nội dung âm nhạc', 'description' => 'Bài hát, album, thể loại, playlist và nghệ sĩ.'],
            'banners.manage' => ['label' => 'Banner', 'description' => 'Tạo, sắp xếp, cập nhật và xóa banner.'],
            'users.manage' => ['label' => 'Người dùng', 'description' => 'Xem, tạo, sửa và khóa tài khoản người dùng.'],
            'billing.manage' => ['label' => 'Gói và thanh toán', 'description' => 'Gói đăng ký và lịch sử giao dịch.'],
            'moderation.manage' => ['label' => 'Kiểm duyệt', 'description' => 'Bình luận và báo cáo vi phạm.'],
        ]],
        'status' => ['label' => 'Trạng thái', 'type' => 'select', 'required' => true, 'default' => 'active', 'options' => ['active' => 'Hoạt động', 'inactive' => 'Tạm khóa']],
    ];

    protected function normalize(array $data, mixed $ignoreId = null): array
    {
        return $this->normalizeAdminData($data, $ignoreId === null ? null : (string) $ignoreId);
    }

    public function store(AdminResourceRequest $request): RedirectResponse
    {
        $data = $this->normalizeAdminData($request->validated());
        $data['password'] = Hash::driver('bcrypt')->make(config('admin.initial_password'));
        $data['must_change_password'] = true;
        $data['credentials_sent_at'] = null;

        Admin::query()->create($data);

        return redirect()->route('admin.admins.index')
            ->with('success', 'Đã tạo quản trị viên. Mật khẩu khởi tạo là '.config('admin.initial_password').' và cần đổi ngay lần đăng nhập đầu tiên.');
    }

    public function update(AdminResourceRequest $request, string $id): RedirectResponse
    {
        $admin = Admin::query()->findOrFail($id);
        $currentAdmin = auth('admin')->user();

        if ($admin->role === 'super_admin' && (string) $currentAdmin?->getKey() !== (string) $admin->getKey()) {
            return back()->withInput()->with('error', 'Không thể chỉnh sửa hồ sơ của Admin lớn khác.');
        }

        $data = $this->normalizeAdminData($request->validated(), $id);

        if ($admin->role === 'super_admin') {
            $data['role'] = 'super_admin';
            $data['status'] = 'active';
            $data['is_active'] = true;
            $data['permissions'] = array_keys(config('admin-permissions.groups', []));
        }

        $admin->update($data);

        return redirect()->route('admin.admins.index')->with('success', 'Đã cập nhật quản trị viên.');
    }

    public function sendCredentials(string $id): RedirectResponse
    {
        $admin = Admin::query()->findOrFail($id);

        if ($admin->role === 'super_admin') {
            return back()->with('error', 'Không gửi lại mật khẩu khởi tạo cho Admin lớn bằng chức năng này.');
        }

        $password = (string) config('admin.initial_password');

        try {
            Mail::to($admin->email)->send(new AdminCredentialsMail($admin->name, $admin->email, $password));
            $admin->forceFill([
                'password' => Hash::driver('bcrypt')->make($password),
                'must_change_password' => true,
                'credentials_sent_at' => now(),
            ])->save();
        } catch (Throwable $exception) {
            report($exception);

            return back()->with('error', 'Không thể gửi thông tin tài khoản. Vui lòng kiểm tra cấu hình SMTP.');
        }

        return back()->with('success', "Đã gửi thông tin tài khoản tới {$admin->email}.");
    }

    public function toggleStatus(Request $request, string $id): RedirectResponse
    {
        $currentAdmin = $request->user('admin');
        $admin = Admin::query()->findOrFail($id);

        if ((string) $currentAdmin?->getKey() === (string) $admin->getKey()) {
            return back()->with('error', 'Bạn không thể tự tắt tài khoản đang đăng nhập.');
        }

        if ($currentAdmin?->role !== 'super_admin' && $admin->role === 'super_admin') {
            return back()->with('error', 'Admin nhỏ không được thay đổi trạng thái của Admin lớn.');
        }

        if ($admin->role === 'super_admin'
            && $admin->is_active
            && Admin::query()->where('role', 'super_admin')->where('is_active', true)->count() <= 1
        ) {
            return back()->with('error', 'Hệ thống phải còn ít nhất một Admin lớn đang hoạt động.');
        }

        $isActive = ! (bool) $admin->is_active;
        $admin->forceFill([
            'status' => $isActive ? 'active' : 'inactive',
            'is_active' => $isActive,
        ])->save();

        return back()->with('success', $isActive
            ? "Đã bật tài khoản {$admin->name}."
            : "Đã tắt tài khoản {$admin->name}.");
    }

    protected function normalizeAdminData(array $data, ?string $ignoreId = null): array
    {
        $data = parent::normalize($data);
        $data['email'] = Str::lower(trim((string) ($data['email'] ?? '')));
        $providedSlug = trim((string) ($data['slug'] ?? ''));
        $baseSlug = Str::slug($providedSlug !== '' ? $providedSlug : ($data['name'] ?? 'admin'));
        $slug = blank($baseSlug) ? 'admin' : $baseSlug;

        if ($providedSlug !== '' && $this->slugExists($slug, $ignoreId)) {
            throw ValidationException::withMessages([
                'slug' => 'Slug quản trị viên đã tồn tại.',
            ]);
        }

        $data['slug'] = $providedSlug === ''
            ? $this->uniqueSlug($slug, $ignoreId)
            : $slug;

        $data['is_active'] = ($data['status'] ?? 'inactive') === 'active';
        $availablePermissions = array_keys(config('admin-permissions.groups', []));

        $data['permissions'] = $data['role'] === 'super_admin'
            ? $availablePermissions
            : array_values(array_intersect($data['permissions'] ?? [], $availablePermissions));

        return $data;
    }

    private function slugExists(string $slug, ?string $ignoreId = null): bool
    {
        return Admin::query()
            ->where('slug', $slug)
            ->when($ignoreId, fn ($query) => $query->where('_id', '!=', $ignoreId))
            ->exists();
    }

    private function uniqueSlug(string $baseSlug, ?string $ignoreId = null): string
    {
        $slug = $baseSlug;
        $suffix = 2;

        while ($this->slugExists($slug, $ignoreId)) {
            $slug = "{$baseSlug}-{$suffix}";
            $suffix++;
        }

        return $slug;
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
