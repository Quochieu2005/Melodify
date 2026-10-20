<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Models\UserApiToken;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class OptionalAuthenticateApiUser
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->attributes->has('api_token')) {
            return $next($request);
        }
        $authorization = (string) $request->header('Authorization');
        $tokenValue = preg_match('/^Bearer\s+(.+)$/i', $authorization, $matches)
            ? trim($matches[1])
            : trim((string) $request->query('access_token'));

        if ($tokenValue === '') {
            return $next($request);
        }

        $token = UserApiToken::where('token_hash', hash('sha256', $tokenValue))->first();
        if (! $token || ($token->expires_at && $token->expires_at->isPast())) {
            return $next($request);
        }

        $user = User::find($token->user_id);
        if (! $user || ($user->status ?? 'active') !== 'active') {
            return $next($request);
        }

        if (! $token->last_used_at || $token->last_used_at->lt(now()->subMinutes(5))) {
            $token->forceFill(['last_used_at' => now()])->saveQuietly();
        }
        Auth::guard('web')->setUser($user);
        $request->setUserResolver(fn (?string $guard = null) => $user);
        $request->attributes->set('api_token', $token);

        return $next($request);
    }
}
