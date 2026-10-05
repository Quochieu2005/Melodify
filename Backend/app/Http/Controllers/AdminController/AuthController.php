<?php

namespace App\Http\Controllers\AdminController;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AdminLoginRequest;
use App\Services\AdminAuditLogService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\View\View;

class AuthController extends Controller
{
    public function create(): View
    {
        return view('Admin.auth.login');
    }

    public function store(AdminLoginRequest $request, AdminAuditLogService $auditLogs): RedirectResponse
    {
        $credentials = $request->safe()->only(['email', 'password']);

        if (! Auth::guard('admin')->attempt($credentials, $request->boolean('remember'))) {
            return back()->withErrors(['email' => 'Email hoặc mật khẩu không chính xác.'])->onlyInput('email');
        }

        $admin = Auth::guard('admin')->user();

        if ($admin?->is_active === false || $admin?->status === 'inactive') {
            $auditLogs->record($request, $admin, 'auth.login.blocked', 'Đăng nhập bị từ chối vì tài khoản đang bị khóa.');
            Auth::guard('admin')->logout();

            return back()->withErrors(['email' => 'Tài khoản quản trị đã bị khóa.'])->onlyInput('email');
        }

        $request->session()->regenerate();
        $auditLogs->record($request, $admin, 'auth.login', 'Đăng nhập vào hệ thống quản trị.');

        return redirect()->intended(route('admin.dashboard'))->with('success', 'Đăng nhập thành công.');
    }

    public function destroy(Request $request, AdminAuditLogService $auditLogs): RedirectResponse
    {
        $admin = Auth::guard('admin')->user();
        $auditLogs->record($request, $admin, 'auth.logout', 'Đăng xuất khỏi hệ thống quản trị.');
        Auth::guard('admin')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('admin.login')->with('success', 'Bạn đã đăng xuất.');
    }
}
