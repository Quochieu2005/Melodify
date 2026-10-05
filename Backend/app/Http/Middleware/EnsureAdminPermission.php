<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdminPermission
{
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        $admin = $request->user('admin');

        if (! $admin || ! $admin->hasAdminPermission($permission)) {
            abort(403, 'Tài khoản quản trị không có quyền truy cập chức năng này.');
        }

        return $next($request);
    }
}
