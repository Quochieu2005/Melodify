<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\ApiTokenService;
use App\Services\PhoneOtpService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Throwable;

class PhoneAuthController extends Controller
{
    public function __construct(
        private readonly PhoneOtpService $otp,
        private readonly ApiTokenService $tokens,
    ) {}

    public function requestOtp(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone' => ['required', 'string', 'max:20'],
        ]);

        try {
            return response()->json([
                'message' => 'Mã xác thực đã được gửi.',
                'data' => $this->otp->send($data['phone']),
            ]);
        } catch (\InvalidArgumentException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        } catch (HttpExceptionInterface $exception) {
            return response()->json(['message' => $exception->getMessage()], $exception->getStatusCode());
        } catch (Throwable $exception) {
            report($exception);

            return response()->json(['message' => 'Không thể gửi mã xác thực lúc này.'], 503);
        }
    }

    public function verify(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone' => ['required', 'string', 'max:20'],
            'code' => ['required', 'digits_between:4,10'],
            'device_name' => ['nullable', 'string', 'max:100'],
            'remember' => ['sometimes', 'boolean'],
        ]);

        try {
            $phone = $this->otp->normalize($data['phone']);
        } catch (Throwable $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }

        if (! $this->otp->verify($phone, $data['code'])) {
            return response()->json(['message' => 'Mã xác thực không đúng hoặc đã hết hạn.'], 422);
        }

        $user = User::where('phone', $phone)->first();

        if ($user && ($user->status ?? 'active') !== 'active') {
            return response()->json(['message' => 'Tài khoản đã bị khóa hoặc ngừng hoạt động.'], 403);
        }

        if (! $user) {
            $user = User::create([
                'name' => 'Người dùng '.substr($phone, -4),
                'username' => $this->tokens->uniqueUsername(null, 'user-'.substr($phone, -6)),
                'phone' => $phone,
                'password' => Hash::make(Str::random(48)),
                'is_premium' => 0,
                'status' => 'active',
            ]);
        }

        $user->forceFill([
            'last_login_at' => now(),
            'last_login_method' => 'phone',
        ])->save();

        $remember = array_key_exists('remember', $data) ? $request->boolean('remember') : null;

        return response()->json([
            'message' => 'Đăng nhập bằng số điện thoại thành công.',
        ] + $this->tokens->issue($user, $data['device_name'] ?? 'phone-web', $remember));
    }
}
