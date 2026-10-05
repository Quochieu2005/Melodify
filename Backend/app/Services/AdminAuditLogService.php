<?php

namespace App\Services;

use App\Models\Admin;
use App\Models\Log as AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class AdminAuditLogService
{
    public function recordRequest(
        Request $request,
        ?Admin $admin,
        ?Response $response = null,
        ?Throwable $exception = null,
    ): void {
        if (! $admin) {
            return;
        }

        $routeName = (string) ($request->route()?->getName() ?? 'admin.unknown');
        $targetType = $this->targetType($routeName);
        $targetId = $this->targetId($request);
        $action = $this->actionFor($request->method());
        $statusCode = $response?->getStatusCode() ?? ($exception ? 500 : null);
        $success = $exception === null
            && ($statusCode === null || $statusCode < 400)
            && ! $request->session()->has('errors');

        $metadata = [
            'route_name' => $routeName,
            'http_method' => $request->method(),
            'url' => $request->fullUrl(),
            'status_code' => $statusCode,
            'success' => $success,
            'input' => $this->safeInput($request),
        ];

        if ($exception) {
            $metadata['error'] = Str::limit($exception->getMessage(), 240);
        }

        try {
            AuditLog::query()->create([
                'admin_id' => (string) $admin->getKey(),
                'admin_name' => (string) ($admin->name ?? $admin->email),
                'admin_email' => (string) $admin->email,
                'admin_role' => (string) ($admin->role ?? 'admin'),
                'action' => $routeName,
                'description' => "{$action} {$targetType}",
                'target_type' => $targetType,
                'target_id' => $targetId,
                'metadata' => $metadata,
                'ip_address' => $request->ip(),
                'user_agent' => Str::limit((string) $request->userAgent(), 1000),
                'method' => $request->method(),
                'route_name' => $routeName,
                'status_code' => $statusCode,
            ]);
        } catch (Throwable $auditException) {
            report($auditException);
        }
    }

    public function record(
        Request $request,
        ?Admin $admin,
        string $action,
        string $description,
        array $metadata = [],
    ): void {
        if (! $admin) {
            return;
        }

        try {
            AuditLog::query()->create([
                'admin_id' => (string) $admin->getKey(),
                'admin_name' => (string) ($admin->name ?? $admin->email),
                'admin_email' => (string) $admin->email,
                'admin_role' => (string) ($admin->role ?? 'admin'),
                'action' => $action,
                'description' => $description,
                'target_type' => $metadata['target_type'] ?? 'admin',
                'target_id' => isset($metadata['target_id']) ? (string) $metadata['target_id'] : null,
                'metadata' => array_merge([
                    'route_name' => $request->route()?->getName(),
                    'http_method' => $request->method(),
                    'url' => $request->fullUrl(),
                    'input' => $this->safeInput($request),
                ], $metadata),
                'ip_address' => $request->ip(),
                'user_agent' => Str::limit((string) $request->userAgent(), 1000),
                'method' => $request->method(),
                'route_name' => $request->route()?->getName(),
                'status_code' => 200,
            ]);
        } catch (Throwable $auditException) {
            report($auditException);
        }
    }

    private function safeInput(Request $request): array
    {
        $input = $request->except([
            '_token',
            '_method',
            'password',
            'password_confirmation',
            'current_password',
            'code',
            'avatar_file',
        ]);

        if ($request->has('password') || $request->has('current_password')) {
            $input['password'] = '[đã thay đổi]';
        }

        if ($request->hasFile('avatar_file')) {
            $input['avatar_file'] = '[đã tải lên]';
        }

        return $input;
    }

    private function actionFor(string $method): string
    {
        return match ($method) {
            'POST' => 'Tạo mới',
            'PUT', 'PATCH' => 'Cập nhật',
            'DELETE' => 'Xóa',
            default => 'Thực hiện',
        };
    }

    private function targetType(string $routeName): string
    {
        $resource = Str::after($routeName, 'admin.');
        $resource = Str::before($resource, '.');

        return match ($resource) {
            'admins' => 'quản trị viên',
            'songs' => 'bài hát',
            'albums' => 'album',
            'artists' => 'nghệ sĩ',
            'topics' => 'chủ đề',
            'genres' => 'thể loại',
            'playlists' => 'playlist',
            'banners' => 'banner',
            'users' => 'người dùng',
            'subscriptions' => 'gói đăng ký',
            'comments' => 'bình luận',
            'reports' => 'báo cáo',
            'profile' => 'hồ sơ quản trị',
            default => $resource !== $routeName ? $resource : 'hệ thống',
        };
    }

    private function targetId(Request $request): ?string
    {
        $parameters = $request->route()?->parameters() ?? [];

        foreach ($parameters as $parameter) {
            if (is_scalar($parameter) && filled($parameter)) {
                return (string) $parameter;
            }

            if (is_object($parameter) && method_exists($parameter, 'getKey')) {
                return (string) $parameter->getKey();
            }
        }

        return null;
    }
}
