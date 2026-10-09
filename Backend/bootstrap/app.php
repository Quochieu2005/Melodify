<?php

use App\Http\Middleware\EnsureAdminIdleSession;
use App\Http\Middleware\EnsureAdminPermission;
use App\Http\Middleware\EnsureSuperAdmin;
use App\Http\Middleware\AuthenticateApiUser;
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
            'api.user' => AuthenticateApiUser::class,
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

            $view = view()->exists("errors.{$status}") ? "errors.{$status}" : 'errors.500';

            return response()->view($view, [], $status);
        });
    })->create();
