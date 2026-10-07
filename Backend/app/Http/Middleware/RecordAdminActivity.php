<?php

namespace App\Http\Middleware;

use App\Services\AdminAuditLogService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class RecordAdminActivity
{
    public function __construct(private readonly AdminAuditLogService $auditLogs) {}

    public function handle(Request $request, Closure $next): Response
    {
        $admin = auth('admin')->user();

        if (! $this->shouldRecord($request)) {
            return $next($request);
        }

        try {
            $response = $next($request);
        } catch (Throwable $exception) {
            $this->auditLogs->recordRequest($request, $admin, null, $exception);

            throw $exception;
        }

        $this->auditLogs->recordRequest($request, $admin, $response);

        return $response;
    }

    private function shouldRecord(Request $request): bool
    {
        if (! in_array($request->method(), ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
            return false;
        }

        return $request->route()?->getName() !== 'admin.logout';
    }
}
