<?php

namespace App\Services;

use App\Models\User;
use App\Models\UserApiToken;
use Illuminate\Support\Str;

class ApiTokenService
{
    public function issue(User $user, ?string $deviceName = null, ?bool $remember = null): array
    {
        $plainToken = Str::random(80);
        $ttlDays = match ($remember) {
            true => (int) config('auth.api_token_remember_ttl_days', 30),
            false => (int) config('auth.api_token_session_ttl_days', 1),
            default => (int) config('auth.api_token_ttl_days', 30),
        };
        $expiresAt = now()->addDays(max(1, $ttlDays));

        UserApiToken::create([
            'user_id' => (string) $user->getKey(),
            'name' => $deviceName ?: 'api-client',
            'token_hash' => hash('sha256', $plainToken),
            'last_used_at' => now(),
            'expires_at' => $expiresAt,
        ]);

        $response = [
            'token' => $plainToken,
            'token_type' => 'Bearer',
            'expires_at' => $expiresAt->toISOString(),
            'user' => $this->userPayload($user),
        ];

        if ($remember !== null) {
            $response['remembered'] = $remember;
        }

        return $response;
    }

    public function uniqueUsername(?string $nickname, string $seed): string
    {
        $base = Str::slug($nickname ?: $seed) ?: 'user';
        $username = $base;
        $suffix = 1;

        while (User::where('username', $username)->exists()) {
            $username = $base.'-'.$suffix++;
        }

        return $username;
    }

    public function userPayload(User $user): array
    {
        return [
            'id' => (string) $user->getKey(),
            'name' => $user->name,
            'username' => $user->username,
            'email' => $user->email,
            'phone' => $user->phone,
            'avatar_url' => $user->avatar_url,
            'is_premium' => (int) $user->is_premium,
            'status' => $user->status ?? 'active',
            'created_at' => optional($user->created_at)->toISOString(),
            'google_connected' => filled($user->google_id),
            'facebook_connected' => filled($user->facebook_id),
            'last_login_at' => optional($user->last_login_at)->toISOString(),
            'last_login_method' => $user->last_login_method,
        ];
    }
}
