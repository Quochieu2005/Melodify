<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Socialite\Contracts\User as SocialiteUser;

class SocialAccountService
{
    public function __construct(private readonly ApiTokenService $tokens) {}

    public function resolveUser(string $provider, SocialiteUser $socialUser): User
    {
        if (! in_array($provider, ['google', 'facebook'], true)) {
            throw new SocialAuthException('Nhà cung cấp đăng nhập không được hỗ trợ.', 422);
        }

        $email = Str::lower(trim((string) $socialUser->getEmail()));
        if ($email === '') {
            throw new SocialAuthException('Tài khoản mạng xã hội không cung cấp email để tạo tài khoản Melodify.', 422);
        }

        $providerColumn = $provider.'_id';
        $userByProvider = User::where($providerColumn, (string) $socialUser->getId())->first();
        $userByEmail = User::where('email', $email)->first();

        if ($userByProvider && $userByEmail && (string) $userByProvider->getKey() !== (string) $userByEmail->getKey()) {
            throw new SocialAuthException('Tài khoản mạng xã hội đang liên kết với người dùng khác.', 409);
        }

        $user = $userByProvider ?: $userByEmail;
        if ($user && ($user->status ?? 'active') !== 'active') {
            throw new SocialAuthException('Tài khoản đã bị khóa hoặc ngừng hoạt động.', 403);
        }

        if (! $user) {
            $user = User::create([
                'name' => $socialUser->getName() ?: Str::before($email, '@'),
                'username' => $this->tokens->uniqueUsername($socialUser->getNickname(), Str::before($email, '@')),
                'email' => $email,
                'password' => Hash::make(Str::random(48)),
                'is_premium' => 0,
                'status' => 'active',
            ]);
        }

        $user->forceFill([
            $providerColumn => (string) $socialUser->getId(),
            'avatar_url' => $socialUser->getAvatar() ?: ($user->avatar_url ?? null),
            'last_login_at' => now(),
            'last_login_method' => $provider,
        ])->save();

        return $user;
    }
}
