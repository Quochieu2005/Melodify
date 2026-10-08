<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdminIdleSession
{
    private const IDLE_SECONDS = 3600;

    public function handle(Request $request, Closure $next): Response
    {
        $admin = $request->user('admin');

        if ($admin) {
            $lastActivity = (int) $request->session()->get('admin_last_activity', now()->timestamp);

            if (now()->timestamp - $lastActivity >= self::IDLE_SECONDS) {
                Auth::guard('admin')->logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();

                return redirect()->route('admin.login')->with('warning', 'Phiên đăng nhập đã hết sau 1 giờ không hoạt động.');
            }

            $request->session()->put('admin_last_activity', now()->timestamp);
        }

        return $next($request);
    }
}
