<?php

namespace App\Http\Controllers\AdminController;

use App\Http\Requests\Admin\AdminResourceRequest;
use App\Mail\AdminCredentialsMail;
use App\Models\Admin;
use App\Services\CloudinaryService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\UploadedFile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Illuminate\View\View;
use Throwable;

class AdminManagementController extends CrudResourceController
{
    protected string $model = Admin::class;

    protected string $resource = 'admins';

    protected string $title = 'quản trị viên';

    protected string $viewDirectory = 'Admin.admins';

    protected array $columns = [
        'avatar' => 'Ảnh',
        'name' => 'Họ tên',
        'email' => 'Email',
        'role' => 'Vai trò',
        'status' => 'Trạng thái',
        'must_change_password' => 'Mật khẩu',
    ];

    protected array $searchable = ['name', 'email', 'slug', 'role', 'status'];

    protected array $fields = [
        'name' => ['label' => 'Họ tên', 'required' => true],
        'email' => ['label' => 'Email', 'type' => 'email', 'required' => true],
        'slug' => ['label' => 'Slug', 'help' => 'Để trống để tự tạo theo họ tên; nếu tự nhập thì slug không được trùng.'],
        'role' => ['label' => 'Phân quyền', 'type' => 'select', 'required' => true, 'default' => 'admin', 'help' => 'Admin lớn có toàn quyền; Admin nhỏ không thể quản lý tài khoản quản trị.', 'options' => ['super_admin' => 'Admin lớn', 'admin' => 'Admin nhỏ']],
        'permissions' => ['label' => 'Chức năng được phép', 'type' => 'permission_matrix', 'help' => 'Chỉ áp dụng cho Admin nhỏ. Admin lớn luôn có toàn quyền.'],
        'status' => ['label' => 'Trạng thái', 'type' => 'select', 'required' => true, 'default' => 'active', 'options' => ['active' => 'Hoạt động', 'inactive' => 'Tạm khóa']],
    ];

    protected function normalize(array $data, mixed $ignoreId = null): array
    {
        return $this->normalizeAdminData($data, $ignoreId === null ? null : (string) $ignoreId);
    }

    public function store(AdminResourceRequest $request, ?CloudinaryService $cloudinary = null): RedirectResponse
    {
        $cloudinary ??= app(CloudinaryService::class);
        $validated = $request->validated();
        $avatarFile = $request->file('avatar_file');
        unset($validated['avatar_file'], $validated['remove_avatar']);

        $data = $this->normalizeAdminData($validated);
        $data['password'] = Hash::driver('bcrypt')->make(config('admin.initial_password'));
        $data['must_change_password'] = true;
        $data['credentials_sent_at'] = null;
        $uploaded = null;

        try {
            if ($avatarFile instanceof UploadedFile) {
                $uploaded = $this->uploadAvatar($cloudinary, $avatarFile, (string) $data['slug']);
                $data = array_merge($data, $uploaded);
            }

            Admin::query()->create($data);
        } catch (Throwable $exception) {
            if ($uploaded['avatar_public_id'] ?? null) {
                $this->deleteCloudinaryImage($cloudinary, $uploaded['avatar_public_id']);
            }

            report($exception);

            return back()->withInput()->withErrors([
                'avatar_file' => 'Không thể lưu ảnh đại diện. Vui lòng kiểm tra cấu hình Cloudinary.',
            ]);
        }

        return redirect()->route('admin.admins.index')
            ->with('success', 'Đã tạo quản trị viên. Hãy chọn tài khoản trong danh sách và bấm "Gửi thông tin đăng nhập" để cấp tài khoản qua email.');
    }

    public function update(AdminResourceRequest $request, string $id, ?CloudinaryService $cloudinary = null): RedirectResponse
    {
        $cloudinary ??= app(CloudinaryService::class);
        $admin = Admin::query()->findOrFail($id);
        $currentAdmin = auth('admin')->user();

        if ((string) $currentAdmin?->getKey() !== (string) $admin->getKey()) {
            return back()->withInput()->with('error', 'Bạn chỉ được chỉnh sửa hồ sơ của chính mình.');
        }

        $validated = $request->validated();
        $avatarFile = $request->file('avatar_file');
        $removeAvatar = $request->boolean('remove_avatar');
        unset($validated['avatar_file'], $validated['remove_avatar']);

        $data = $this->normalizeAdminData($validated, $id);

        if ($admin->role === 'super_admin') {
            $data['role'] = 'super_admin';
            $data['status'] = 'active';
            $data['is_active'] = true;
            $data['permissions'] = config('admin-permissions.permission_keys', array_keys(config('admin-permissions.groups', [])));
        } else {
            // Self-edit is limited to profile data; never allow role or access escalation.
            $data['role'] = 'admin';
            $data['status'] = $admin->status;
            $data['is_active'] = (bool) $admin->is_active;
            $data['permissions'] = $admin->permissions ?? [];
        }

        $oldPublicId = $admin->avatar_public_id;
        $uploaded = null;

        try {
            if ($avatarFile instanceof UploadedFile) {
                $uploaded = $this->uploadAvatar($cloudinary, $avatarFile, (string) $data['slug']);
                $data = array_merge($data, $uploaded);
            } elseif ($removeAvatar) {
                $data['avatar'] = null;
                $data['avatar_public_id'] = null;
            }

            $admin->update($data);

            if ($oldPublicId && (($data['avatar_public_id'] ?? $oldPublicId) !== $oldPublicId)) {
                $this->deleteCloudinaryImage($cloudinary, $oldPublicId);
            }
        } catch (Throwable $exception) {
            if ($uploaded['avatar_public_id'] ?? null) {
                $this->deleteCloudinaryImage($cloudinary, $uploaded['avatar_public_id']);
            }

            report($exception);

            return back()->withInput()->withErrors([
                'avatar_file' => 'Không thể cập nhật ảnh đại diện. Vui lòng kiểm tra cấu hình Cloudinary.',
            ]);
        }

        return redirect()->route('admin.admins.index')->with('success', 'Đã cập nhật quản trị viên.');
    }

    public function edit(string $id): View|RedirectResponse
    {
        $admin = Admin::query()->findOrFail($id);
        $currentAdmin = auth('admin')->user();

        if ((string) $currentAdmin?->getKey() !== (string) $admin->getKey()) {
            return redirect()->route('admin.admins.index')
                ->with('error', 'Bạn chỉ được chỉnh sửa hồ sơ của chính mình.');
        }

        return view("{$this->viewDirectory}.edit", $this->viewData([
            'item' => $admin,
            'fields' => $this->resolvedFields(),
        ]));
    }

    public function sendCredentials(string $id): RedirectResponse
    {
        $admin = Admin::query()->findOrFail($id);

        if ($admin->role === 'super_admin') {
            return back()->with('error', 'Không gửi lại mật khẩu khởi tạo cho Admin lớn bằng chức năng này.');
        }

        if (filled($admin->credentials_sent_at)) {
            return back()->with('error', 'Tài khoản này đã được gửi thông tin đăng nhập trước đó.');
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

    public function sendCredentialsBulk(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'admin_ids' => ['required', 'array', 'min:1', 'max:50'],
            'admin_ids.*' => ['required', 'string', 'max:64', 'distinct'],
        ], [
            'admin_ids.required' => 'Hãy chọn ít nhất một quản trị viên.',
            'admin_ids.min' => 'Hãy chọn ít nhất một quản trị viên.',
        ]);

        $sent = 0;
        $skipped = 0;
        $failed = 0;
        $password = (string) config('admin.initial_password');

        foreach (array_unique($data['admin_ids']) as $adminId) {
            $admin = Admin::query()->find($adminId);

            if (! $admin || $admin->role !== 'admin' || filled($admin->credentials_sent_at)) {
                $skipped++;
                continue;
            }

            try {
                Mail::to($admin->email)->send(new AdminCredentialsMail($admin->name, $admin->email, $password));
                $admin->forceFill([
                    'password' => Hash::driver('bcrypt')->make($password),
                    'must_change_password' => true,
                    'credentials_sent_at' => now(),
                ])->save();
                $sent++;
            } catch (Throwable $exception) {
                report($exception);
                $failed++;
            }
        }

        if ($sent === 0) {
            return back()->with('error', 'Không có tài khoản Admin nhỏ nào được gửi. Vui lòng kiểm tra lại lựa chọn và cấu hình SMTP.');
        }

        $message = "Đã gửi thông tin đăng nhập cho {$sent} tài khoản.";
        if ($skipped > 0) {
            $message .= " Bỏ qua {$skipped} tài khoản không hợp lệ hoặc Admin lớn.";
        }
        if ($failed > 0) {
            $message .= " {$failed} tài khoản gửi thất bại.";
        }

        return back()->with('success', $message);
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
        $availablePermissions = config('admin-permissions.permission_keys', array_keys(config('admin-permissions.groups', [])));

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

    /**
     * @return array{avatar: string, avatar_public_id: string|null}
     */
    private function uploadAvatar(CloudinaryService $cloudinary, UploadedFile $file, string $slug): array
    {
        $uploaded = $cloudinary->uploadImage(
            $file,
            config('cloudinary.admin_folder', 'admin'),
            $cloudinary->datedPublicId($slug),
        );
        $url = $uploaded['secure_url'] ?? $uploaded['url'] ?? null;

        if (blank($url)) {
            throw new \RuntimeException('Cloudinary không trả về URL ảnh đại diện.');
        }

        return [
            'avatar' => $url,
            'avatar_public_id' => $uploaded['public_id'] ?? null,
        ];
    }

    private function deleteCloudinaryImage(CloudinaryService $cloudinary, ?string $publicId): void
    {
        if (blank($publicId)) {
            return;
        }

        try {
            $cloudinary->deleteImage($publicId);
        } catch (Throwable $exception) {
            Log::warning('Cloudinary admin avatar cleanup failed.', [
                'public_id' => $publicId,
                'exception' => $exception,
            ]);
        }
    }

    public function destroy(string $id): RedirectResponse
    {
        if ((string) auth('admin')->id() === $id) {
            return back()->with('error', 'Bạn không thể xóa tài khoản đang đăng nhập.');
        }

        $admin = Admin::query()->findOrFail($id);

        if ($admin->role === 'super_admin') {
            return back()->with('error', 'Không thể xóa tài khoản Admin lớn.');
        }

        return parent::destroy($id);
    }
}
