<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureSuperAdmin
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $admin = $request->user('admin');

        if (! $admin || $admin->role !== 'super_admin') {
            abort(403, 'Chỉ Admin lớn mới có quyền quản lý tài khoản quản trị viên.');
        }

        return $next($request);
    }
}
