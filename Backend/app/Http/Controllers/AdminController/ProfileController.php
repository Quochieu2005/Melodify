<?php

namespace App\Http\Controllers\AdminController;

use App\Http\Controllers\Controller;
use App\Rules\PlainText;
use App\Services\CloudinaryService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\View\View;
use Throwable;

class ProfileController extends Controller
{
    public function edit(Request $request): View
    {
        $admin = $request->user('admin');

        return view('Admin.profile.edit', compact('admin'));
    }

    public function settings(Request $request): View
    {
        $admin = $request->user('admin');
        $notifications = array_merge([
            'content_reports' => true,
            'suspicious_payments' => true,
            'weekly_summary' => false,
        ], $admin->notification_preferences ?? []);
        $appearance = array_merge([
            'theme' => 'system',
            'density' => 'comfortable',
        ], $admin->appearance_preferences ?? []);

        return view('Admin.profile.settings', compact('admin', 'notifications', 'appearance'));
    }

    public function update(Request $request, CloudinaryService $cloudinary): RedirectResponse
    {
        $admin = $request->user('admin');
        $data = $request->validate([
            'name' => ['bail', 'required', 'string', 'min:1', 'max:120', new PlainText()],
            'email' => ['bail', 'required', 'string', 'email', 'max:160', new PlainText(), Rule::unique('admins', 'email')->ignore($admin->getKey())],
            'avatar_file' => ['nullable', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120', 'dimensions:max_width=4000,max_height=4000'],
            'remove_avatar' => ['nullable', 'boolean'],
        ]);

        $oldPublicId = $admin->avatar_public_id;
        $uploaded = null;

        try {
            if ($request->hasFile('avatar_file')) {
                $uploaded = $cloudinary->uploadImage(
                    $request->file('avatar_file'),
                    config('cloudinary.admin_folder', 'admin'),
                    $cloudinary->datedPublicId($admin->slug ?: $data['name']),
                );
            }

            $profile = [
                'name' => $data['name'],
                'email' => $data['email'],
            ];

            if ($uploaded) {
                $profile['avatar'] = $uploaded['secure_url'] ?? $uploaded['url'] ?? null;
                $profile['avatar_public_id'] = $uploaded['public_id'] ?? null;
            } elseif ($request->boolean('remove_avatar')) {
                $profile['avatar'] = null;
                $profile['avatar_public_id'] = null;
            }

            $admin->forceFill($profile)->save();

            if ($oldPublicId && (($profile['avatar_public_id'] ?? $oldPublicId) !== $oldPublicId)) {
                $this->deleteCloudinaryImage($cloudinary, $oldPublicId);
            }
        } catch (Throwable $exception) {
            if ($uploaded['public_id'] ?? null) {
                $this->deleteCloudinaryImage($cloudinary, $uploaded['public_id']);
            }

            report($exception);

            return back()->withInput()->withErrors(['avatar_file' => 'Không thể cập nhật ảnh đại diện. Vui lòng kiểm tra cấu hình Cloudinary.']);
        }

        return back()->with('success', 'Đã cập nhật hồ sơ quản trị viên.');
    }

    public function removeAvatar(Request $request, CloudinaryService $cloudinary): RedirectResponse
    {
        $admin = $request->user('admin');

        try {
            $this->deleteCloudinaryImage($cloudinary, $admin->avatar_public_id);
            $admin->forceFill(['avatar' => null, 'avatar_public_id' => null])->save();
        } catch (Throwable $exception) {
            report($exception);

            return back()->withErrors(['avatar_file' => 'Không thể xóa ảnh trên Cloudinary. Vui lòng thử lại.']);
        }

        return back()->with('success', 'Đã xóa ảnh đại diện.');
    }

    public function password(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'current_password' => ['required', 'current_password:admin'],
            'password' => ['required', 'confirmed', 'max:72', Password::min(8)],
        ]);
        $admin = $request->user('admin');

        if (Hash::check($data['password'], (string) $admin->password)) {
            return back()->withInput()->withErrors([
                'password' => 'Mật khẩu mới phải khác mật khẩu hiện tại.',
            ]);
        }

        $admin->forceFill([
            'password' => Hash::driver('bcrypt')->make($data['password']),
            'must_change_password' => false,
        ])->save();

        return back()->with('success', 'Đã đổi mật khẩu quản trị viên.');
    }

    public function notifications(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'content_reports' => ['nullable', 'boolean'],
            'suspicious_payments' => ['nullable', 'boolean'],
            'weekly_summary' => ['nullable', 'boolean'],
        ]);

        $request->user('admin')->forceFill([
            'notification_preferences' => [
                'content_reports' => $request->boolean('content_reports'),
                'suspicious_payments' => $request->boolean('suspicious_payments'),
                'weekly_summary' => $request->boolean('weekly_summary'),
            ],
        ])->save();

        return redirect()->to(route('admin.profile.settings').'#notifications')->with('success', 'Đã lưu tùy chọn thông báo.');
    }

    public function appearance(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'theme' => ['required', Rule::in(['light', 'dark', 'system'])],
            'density' => ['required', Rule::in(['comfortable', 'compact'])],
        ]);

        $request->user('admin')->forceFill(['appearance_preferences' => $data])->save();

        return redirect()->to(route('admin.profile.settings').'#appearance')->with('success', 'Đã lưu tùy chọn giao diện.');
    }

    private function deleteCloudinaryImage(CloudinaryService $cloudinary, ?string $publicId): void
    {
        if (blank($publicId)) {
            return;
        }

        try {
            $cloudinary->deleteImage($publicId);
        } catch (Throwable $exception) {
            Log::warning('Cloudinary avatar cleanup failed.', ['public_id' => $publicId, 'exception' => $exception]);
        }
    }
}
