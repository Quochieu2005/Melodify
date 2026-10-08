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
        $routeName = (string) $request->route()?->getName();
        $resource = explode('.', $routeName)[1] ?? null;
        $resourceGroup = $resource ? config("admin-permissions.resource_groups.{$resource}") : null;
        $action = $this->actionFor($request);

        $allowed = $admin && $resourceGroup === $permission
            ? $admin->hasAdminResourcePermission($resource, $action)
            : $admin?->hasAdminPermission($permission);

        if (! $allowed) {
            abort(403, 'Tài khoản quản trị không có quyền truy cập chức năng này.');
        }

        return $next($request);
    }

    private function actionFor(Request $request): string
    {
        return match ($request->route()?->getActionMethod()) {
            'create', 'store' => 'create',
            'edit', 'update', 'toggleStatus' => 'update',
            'destroy', 'destroyBulk', 'destroyAll' => 'delete',
            default => 'view',
        };
    }
}
