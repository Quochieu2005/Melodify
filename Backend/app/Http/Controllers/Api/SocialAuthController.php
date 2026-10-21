<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\ApiTokenService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Socialite\Socialite;
use Throwable;

class SocialAuthController extends Controller
{
    private const PROVIDERS = ['google', 'facebook'];

    public function __construct(private readonly ApiTokenService $tokens) {}

    public function login(Request $request, ?string $provider = null): JsonResponse
    {
        $rules = [
            'access_token' => ['required', 'string', 'min:20', 'max:4096'],
            'device_name' => ['nullable', 'string', 'max:100'],
            'remember' => ['sometimes', 'boolean'],
        ];

        if ($provider === null) {
            $rules['provider'] = ['required', 'in:google,facebook'];
        }

        $data = $request->validate($rules);

        $provider = $provider ?: $data['provider'];

        if (! in_array($provider, self::PROVIDERS, true)) {
            return response()->json(['message' => 'Nhà cung cấp đăng nhập không được hỗ trợ.'], 422);
        }

        try {
            $socialUser = Socialite::driver($provider)->userFromToken($data['access_token']);
        } catch (Throwable $exception) {
            report($exception);

            return response()->json([
                'message' => 'Access token Google/Facebook không hợp lệ hoặc đã hết hạn.',
            ], 422);
        }

        $email = Str::lower(trim((string) $socialUser->getEmail()));

        if ($email === '') {
            return response()->json([
                'message' => 'Tài khoản mạng xã hội không cung cấp email để tạo tài khoản Melodify.',
            ], 422);
        }

        $providerColumn = $provider.'_id';
        $userByProvider = User::where($providerColumn, (string) $socialUser->getId())->first();
        $userByEmail = User::where('email', $email)->first();

        if ($userByProvider && $userByEmail && (string) $userByProvider->getKey() !== (string) $userByEmail->getKey()) {
            return response()->json([
                'message' => 'Tài khoản mạng xã hội đang liên kết với người dùng khác.',
            ], 409);
        }

        $user = $userByProvider ?: $userByEmail;

        if ($user && ($user->status ?? 'active') !== 'active') {
            return response()->json(['message' => 'Tài khoản đã bị khóa hoặc ngừng hoạt động.'], 403);
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

        $remember = array_key_exists('remember', $data) ? $request->boolean('remember') : null;

        return response()->json([
            'message' => 'Đăng nhập thành công.',
        ] + $this->tokens->issue($user, $data['device_name'] ?? null, $remember));
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['user' => $this->tokens->userPayload($request->user())]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->attributes->get('api_token')?->delete();

        return response()->json(['message' => 'Đăng xuất thành công.']);
    }

}
