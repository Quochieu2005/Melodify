<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Models\UserApiToken;
use App\Support\MediaToken;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class OptionalAuthenticateApiUser
{
    /** Routes a browser media element or a plain download link calls, so it cannot send an Authorization header. */
    private const MEDIA_ROUTES = [
        'api.v1.songs.audio',
        'api.v1.songs.external-audio',
        'api.v1.videos.stream',
        'api.v1.videos.download',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        if ($request->attributes->has('api_token')) {
            return $next($request);
        }
        $authorization = (string) $request->header('Authorization');
        $tokenValue = preg_match('/^Bearer\s+(.+)$/i', $authorization, $matches) ? trim($matches[1]) : '';

        if ($tokenValue === '' && $request->routeIs(...self::MEDIA_ROUTES)) {
            // A media ticket is short-lived and works on these routes only.
            $user = $this->userFromMediaToken((string) $request->query('media_token', ''));
            if ($user !== null) {
                $this->actAs($request, $user);

                return $next($request);
            }

            if (config('auth.allow_query_access_token', true)) {
                $tokenValue = trim((string) $request->query('access_token'));
            }
        }

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
        $this->actAs($request, $user);
        $request->attributes->set('api_token', $token);

        return $next($request);
    }

    private function userFromMediaToken(string $mediaToken): ?User
    {
        $userId = $mediaToken === '' ? null : MediaToken::userId($mediaToken);
        $user = $userId === null ? null : User::find($userId);

        return $user && ($user->status ?? 'active') === 'active' ? $user : null;
    }

    private function actAs(Request $request, User $user): void
    {
        Auth::guard('web')->setUser($user);
        $request->setUserResolver(fn (?string $guard = null) => $guard === null || $guard === 'web' ? $user : Auth::guard($guard)->user()
        );
    }
}
