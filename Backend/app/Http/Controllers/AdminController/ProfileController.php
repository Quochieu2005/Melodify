<?php

namespace App\Http\Controllers\AdminController;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\View\View;

class ProfileController extends Controller
{
    public function edit(Request $request): View
    {
        $admin = $request->user('admin') ?? (object) [
            'name' => 'Melodify Admin',
            'email' => 'admin@melodify.local',
            'avatar' => null,
        ];

        return view('Admin.profile.edit', compact('admin'));
    }

    public function settings(Request $request): View
    {
        return view('Admin.profile.settings', ['admin' => $request->user('admin')]);
    }

    public function update(Request $request): RedirectResponse
    {
        $admin = $request->user('admin');
        if (! $admin && app()->environment('local')) {
            return back()->with('success', 'Đã lưu giao diện hồ sơ ở chế độ demo.');
        }
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:160'],
            'avatar' => ['nullable', 'url', 'max:500'],
        ]);
        $admin->update($data);

        return back()->with('success', 'Đã cập nhật hồ sơ quản trị viên.');
    }

    public function password(Request $request): RedirectResponse
    {
        if (! $request->user('admin') && app()->environment('local')) {
            return back()->with('success', 'Đã mô phỏng đổi mật khẩu ở chế độ demo.');
        }

        $data = $request->validate([
            'current_password' => ['required', 'current_password:admin'],
            'password' => ['required', 'confirmed', Password::min(8)],
        ]);
        $request->user('admin')->update(['password' => Hash::make($data['password'])]);

        return back()->with('success', 'Đã đổi mật khẩu quản trị viên.');
    }
}
