<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\AdminLoginRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Illuminate\View\View;

class AdminLoginController extends Controller
{
    public function create(): View
    {
        return view('admin.login');
    }

    public function store(AdminLoginRequest $request): RedirectResponse
    {
        $credentials = $request->safe()->only(['email', 'password']);

        if (! Auth::guard('admin')->attempt([...$credentials, 'status' => 'active'], $request->boolean('remember'))) {
            throw ValidationException::withMessages([
                'email' => 'Email hoặc mật khẩu không chính xác.',
            ]);
        }

        $request->session()->regenerate();

        return redirect()->intended(route('admin.users.index'));
    }

    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('admin')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('admin.login');
    }
}
