<?php

namespace App\Http\Controllers\AdminController;

use App\Http\Controllers\Controller;
use App\Models\Admin;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\View\View;

class PasswordResetController extends Controller
{
    public function request(): View
    {
        return view('Admin.auth.forgot-password');
    }

    public function email(Request $request): RedirectResponse
    {
        $request->validate(['email' => ['required', 'email']]);
        $status = Password::broker('admins')->sendResetLink($request->only('email'));

        return $status === Password::ResetLinkSent
            ? back()->with('success', __($status))
            : back()->withErrors(['email' => __($status)]);
    }

    public function reset(Request $request, string $token): View
    {
        return view('Admin.auth.reset-password', ['token' => $token, 'email' => $request->string('email')]);
    }

    public function update(Request $request): RedirectResponse
    {
        $request->validate([
            'token' => ['required'],
            'email' => ['required', 'email'],
            'password' => ['required', 'confirmed', PasswordRule::min(8)],
        ]);

        $status = Password::broker('admins')->reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (Admin $admin, string $password): void {
                $admin->forceFill(['password' => Hash::make($password), 'remember_token' => Str::random(60)])->save();
                event(new PasswordReset($admin));
            }
        );

        return $status === Password::PasswordReset
            ? redirect()->route('admin.login')->with('success', __($status))
            : back()->withErrors(['email' => __($status)]);
    }
}
