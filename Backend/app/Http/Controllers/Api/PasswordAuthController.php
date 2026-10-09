<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\UserPasswordOtpMail;
use App\Models\User;
use App\Models\UserApiToken;
use App\Services\ApiTokenService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Throwable;

class PasswordAuthController extends Controller
{
    public function __construct(private readonly ApiTokenService $tokens) {}

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'identifier' => ['required', 'string', 'max:160'],
            'password' => ['required', 'string', 'max:72'],
            'remember' => ['sometimes', 'boolean'],
            'device_name' => ['nullable', 'string', 'max:100'],
        ]);

        $identifier = trim((string) $data['identifier']);
        $lookup = filter_var($identifier, FILTER_VALIDATE_EMAIL)
            ? Str::lower($identifier)
            : $identifier;
        $user = User::query()
            ->where(function ($query) use ($lookup): void {
                $query->where('email', $lookup)->orWhere('username', $lookup);
            })
            ->first();

        if (! $user || ! Hash::check((string) $data['password'], (string) $user->password)) {
            return response()->json(['message' => 'Thông tin đăng nhập không chính xác.'], 401);
        }

        if (($user->status ?? 'active') !== 'active') {
            return response()->json(['message' => 'Tài khoản đã bị khóa hoặc ngừng hoạt động.'], 403);
        }

        $remember = $request->boolean('remember');
        $user->forceFill([
            'last_login_at' => now(),
            'last_login_method' => 'password',
        ])->save();

        return response()->json([
            'message' => 'Đăng nhập thành công.',
        ] + $this->tokens->issue($user, $data['device_name'] ?? 'password-web', $remember));
    }

    public function requestPasswordReset(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:160'],
        ]);

        $email = Str::lower(trim($data['email']));
        $resendKey = $this->rateLimitKey('send', $email, $request);
        $resendSeconds = max(30, (int) config('auth.password_reset.resend_seconds', 60));

        if (RateLimiter::tooManyAttempts($resendKey, 1)) {
            return response()->json([
                'message' => 'Vui lòng chờ trước khi yêu cầu mã mới.',
                'retry_after_seconds' => RateLimiter::availableIn($resendKey),
            ], 429);
        }

        RateLimiter::hit($resendKey, $resendSeconds);
        $user = User::query()->where('email', $email)->first();

        // Do not reveal whether an email exists in the system.
        if (! $user || ($user->status ?? 'active') !== 'active') {
            return response()->json(['message' => 'Nếu email hợp lệ, mã OTP sẽ được gửi trong ít phút.']);
        }

        $code = (string) random_int(100000, 999999);
        $expiresAt = now()->addMinutes(max(2, (int) config('auth.password_reset.ttl_minutes', 5)));

        Cache::put($this->otpCacheKey($email), [
            'user_id' => (string) $user->getKey(),
            'email' => $email,
            'code_hash' => Hash::make($code),
            'attempts' => 0,
            'expires_at' => $expiresAt->toIso8601String(),
        ], $expiresAt);

        try {
            Mail::to($email)->send(new UserPasswordOtpMail($code));
        } catch (Throwable $exception) {
            Cache::forget($this->otpCacheKey($email));
            report($exception);

            return response()->json(['message' => 'Không thể gửi email lúc này.'], 503);
        }

        return response()->json([
            'message' => 'Mã OTP đã được gửi đến email của bạn.',
            'expires_at' => $expiresAt->toISOString(),
            'resend_after_seconds' => $resendSeconds,
        ]);
    }

    public function verifyPasswordResetOtp(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:160'],
            'code' => ['required', 'digits:6'],
        ]);

        $email = Str::lower(trim($data['email']));
        $cacheKey = $this->otpCacheKey($email);
        $challenge = Cache::get($cacheKey);

        if (! is_array($challenge)
            || ! isset($challenge['expires_at'])
            || now()->greaterThanOrEqualTo(Carbon::parse($challenge['expires_at']))
        ) {
            Cache::forget($cacheKey);

            return response()->json(['message' => 'Mã OTP không đúng hoặc đã hết hạn.'], 422);
        }

        $maxAttempts = max(3, (int) config('auth.password_reset.max_attempts', 5));
        if ((int) ($challenge['attempts'] ?? 0) >= $maxAttempts) {
            return response()->json(['message' => 'Bạn đã nhập sai OTP quá nhiều lần.'], 422);
        }

        if (! Hash::check($data['code'], (string) ($challenge['code_hash'] ?? ''))) {
            $challenge['attempts'] = (int) ($challenge['attempts'] ?? 0) + 1;
            Cache::put($cacheKey, $challenge, Carbon::parse($challenge['expires_at']));

            return response()->json(['message' => 'Mã OTP không đúng hoặc đã hết hạn.'], 422);
        }

        $resetToken = Str::random(80);
        $resetExpiresAt = now()->addMinutes(max(5, (int) config('auth.password_reset.token_ttl_minutes', 10)));
        $challenge['verified_at'] = now()->toIso8601String();
        $challenge['reset_token_hash'] = hash('sha256', $resetToken);
        $challenge['reset_token_expires_at'] = $resetExpiresAt->toIso8601String();
        Cache::put($cacheKey, $challenge, $resetExpiresAt);

        return response()->json([
            'message' => 'OTP chính xác.',
            'reset_token' => $resetToken,
            'expires_at' => $resetExpiresAt->toISOString(),
        ]);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:160'],
            'reset_token' => ['required', 'string', 'min:40', 'max:120'],
            'password' => ['required', 'string', 'confirmed', 'max:72', PasswordRule::min(8)],
        ]);

        $email = Str::lower(trim($data['email']));
        $cacheKey = $this->otpCacheKey($email);
        $challenge = Cache::get($cacheKey);

        if (! is_array($challenge)
            || ! hash_equals((string) ($challenge['reset_token_hash'] ?? ''), hash('sha256', $data['reset_token']))
            || ! isset($challenge['reset_token_expires_at'])
            || now()->greaterThanOrEqualTo(Carbon::parse($challenge['reset_token_expires_at']))
        ) {
            return response()->json(['message' => 'Phiên đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.'], 422);
        }

        $user = User::find($challenge['user_id'] ?? null);
        if (! $user || ($user->status ?? 'active') !== 'active') {
            return response()->json(['message' => 'Tài khoản không còn hoạt động.'], 403);
        }

        if (Hash::check($data['password'], (string) $user->password)) {
            return response()->json(['message' => 'Mật khẩu mới phải khác mật khẩu hiện tại.'], 422);
        }

        $user->forceFill([
            'password' => Hash::make($data['password']),
            'remember_token' => Str::random(60),
        ])->save();
        UserApiToken::where('user_id', (string) $user->getKey())->delete();
        Cache::forget($cacheKey);

        return response()->json(['message' => 'Đặt lại mật khẩu thành công.']);
    }

    private function rateLimitKey(string $action, string $email, Request $request): string
    {
        return 'api-password-reset:'.$action.':'.hash('sha256', $email.'|'.$request->ip());
    }

    private function otpCacheKey(string $email): string
    {
        return 'api-password-otp:'.hash('sha256', $email);
    }
}
