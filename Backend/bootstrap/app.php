<?php

use App\Http\Middleware\EnsureAdminIdleSession;
use App\Http\Middleware\EnsureAdminPermission;
use App\Http\Middleware\EnsureSuperAdmin;
use App\Http\Middleware\RecordAdminActivity;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Illuminate\Validation\ValidationException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'admin.idle' => EnsureAdminIdleSession::class,
            'admin.permission' => EnsureAdminPermission::class,
            'admin.super' => EnsureSuperAdmin::class,
            'admin.audit' => RecordAdminActivity::class,
        ]);
        $middleware->redirectGuestsTo(fn (Request $request) => route('admin.login'));
        $middleware->redirectUsersTo(fn (Request $request) => route('admin.dashboard'));
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        $exceptions->render(function (Throwable $exception, Request $request) {
            if (! ($request->is('admin') || $request->is('admin/*'))
                || $request->expectsJson()
                || $exception instanceof AuthenticationException
                || $exception instanceof ValidationException
            ) {
                return null;
            }

            $status = match (true) {
                $exception instanceof HttpExceptionInterface => $exception->getStatusCode(),
                $exception instanceof ModelNotFoundException => 404,
                $exception instanceof AuthorizationException => 403,
                $exception instanceof AuthenticationException => 401,
                default => 500,
            };

            $messages = [
                400 => ['title' => 'Yêu cầu không hợp lệ', 'message' => 'Thông tin gửi lên chưa đúng định dạng. Hãy kiểm tra lại và thử lại.'],
                401 => ['title' => 'Cần đăng nhập', 'message' => 'Phiên quản trị của bạn không còn hợp lệ. Vui lòng đăng nhập lại.'],
                403 => ['title' => 'Không có quyền truy cập', 'message' => 'Tài khoản của bạn không được phép thực hiện thao tác hoặc mở trang này.'],
                404 => ['title' => 'Không tìm thấy trang', 'message' => 'Đường dẫn này không tồn tại hoặc nội dung đã được di chuyển.'],
                419 => ['title' => 'Phiên đã hết hạn', 'message' => 'Biểu mẫu đã hết thời gian bảo vệ. Hãy tải lại trang và thực hiện lại thao tác.'],
                429 => ['title' => 'Quá nhiều yêu cầu', 'message' => 'Hệ thống đang giới hạn tạm thời. Vui lòng đợi một chút rồi thử lại.'],
                500 => ['title' => 'Hệ thống gặp sự cố', 'message' => 'Melodify Admin chưa thể hoàn tất yêu cầu này. Vui lòng thử lại sau.'],
                503 => ['title' => 'Hệ thống đang bận', 'message' => 'Dịch vụ tạm thời không sẵn sàng. Vui lòng quay lại sau ít phút.'],
            ];

            $copy = $messages[$status] ?? ['title' => 'Có lỗi xảy ra', 'message' => 'Đã xảy ra lỗi ngoài dự kiến. Vui lòng thử lại.'];

            return response()->view('errors.admin', [
                'status' => $status,
                'title' => $copy['title'],
                'message' => $copy['message'],
            ], $status);
        });
    })->create();
