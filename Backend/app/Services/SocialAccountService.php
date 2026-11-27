<?php

namespace App\Services;

use App\Models\User;
use App\Models\UserApiToken;
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

        $providerId = trim((string) $socialUser->getId());
        if ($providerId === '') {
            throw new SocialAuthException('Nhà cung cấp không trả về định danh tài khoản hợp lệ.', 422);
        }

        $email = Str::lower(trim((string) $socialUser->getEmail()));
        $providerColumn = $provider.'_id';
        $userByProvider = User::where($providerColumn, $providerId)->first();
        $userByEmail = $email !== '' ? User::where('email', $email)->first() : null;

        if ($userByProvider && $userByEmail && (string) $userByProvider->getKey() !== (string) $userByEmail->getKey()) {
            throw new SocialAuthException('Tài khoản mạng xã hội đang liên kết với người dùng khác.', 409);
        }

        $user = $userByProvider ?: $userByEmail;
        if ($user && filled($user->{$providerColumn}) && (string) $user->{$providerColumn} !== $providerId) {
            throw new SocialAuthException('Email này đã liên kết với một tài khoản khác của nhà cung cấp.', 409);
        }
        if ($user && ($user->status ?? 'active') !== 'active') {
            throw new SocialAuthException('Tài khoản đã bị khóa hoặc ngừng hoạt động.', 403);
        }

        if (! $user) {
            if ($email === '' || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
                throw new SocialAuthException('Cần cho phép Google/Facebook chia sẻ email để tạo tài khoản Melodify.', 422);
            }
            $user = User::create([
                'name' => $socialUser->getName() ?: Str::before($email, '@'),
                'username' => $this->tokens->uniqueUsername($socialUser->getNickname(), Str::before($email, '@')),
                'slug' => $this->tokens->uniqueSlug($socialUser->getName() ?: Str::before($email, '@')),
                'email' => $email,
                'password' => Hash::make(Str::random(48)),
                'is_premium' => 0,
                'status' => 'active',
            ]);
        }

        // Password sign-up does not verify the email. If someone registered this address first, they must not
        // keep access once the real owner proves the email through Google/Facebook: reset the password and
        // revoke tokens. Accounts that already have a social login, or were just created, are left alone.
        $takesOverPasswordAccount = $userByEmail
            && ! $userByProvider
            && blank($userByEmail->google_id)
            && blank($userByEmail->facebook_id);
        if ($takesOverPasswordAccount) {
            $user->forceFill(['password' => Hash::make(Str::random(48)), 'remember_token' => Str::random(60)]);
            UserApiToken::query()->where('user_id', (string) $user->getKey())->delete();
        }

        $user->forceFill([
            $providerColumn => $providerId,
            'avatar_url' => $socialUser->getAvatar() ?: ($user->avatar_url ?? null),
            'last_login_at' => now(),
            'last_login_method' => $provider,
        ])->save();

        return $user;
    }
}
