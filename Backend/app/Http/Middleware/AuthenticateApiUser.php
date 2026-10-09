<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Models\UserApiToken;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateApiUser
{
    public function handle(Request $request, Closure $next): Response
    {
        $authorization = (string) $request->header('Authorization');

        if (! preg_match('/^Bearer\s+(.+)$/i', $authorization, $matches)) {
            return response()->json(['message' => 'Thiếu Bearer token.'], 401);
        }

        $token = UserApiToken::where('token_hash', hash('sha256', trim($matches[1])))->first();

        if (! $token || ($token->expires_at && $token->expires_at->isPast())) {
            return response()->json(['message' => 'Token không hợp lệ hoặc đã hết hạn.'], 401);
        }

        $user = User::find($token->user_id);

        if (! $user) {
            return response()->json(['message' => 'Người dùng không tồn tại.'], 401);
        }

        if (($user->status ?? 'active') !== 'active') {
            return response()->json(['message' => 'Tài khoản đã bị khóa hoặc ngừng hoạt động.'], 403);
        }

        $token->forceFill(['last_used_at' => now()])->saveQuietly();

        // Make both request->user() and auth()->user() resolve to the API user.
        Auth::guard('web')->setUser($user);
        $request->setUserResolver(fn (?string $guard = null) => $user);
        $request->attributes->set('api_token', $token);

        return $next($request);
    }
}
