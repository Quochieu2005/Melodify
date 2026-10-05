<?php

namespace App\Http\Controllers\AdminController;

use App\Http\Controllers\Controller;
use App\Mail\AdminPasswordOtpMail;
use App\Models\Admin;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\View\View;
use Throwable;

class PasswordResetController extends Controller
{
    private const OTP_EXPIRATION_MINUTES = 5;

    private const RESEND_COOLDOWN_SECONDS = 60;

    private const MAX_SENDS_PER_HOUR = 5;

    private const MAX_VERIFY_ATTEMPTS = 5;

    private const PASSWORD_RESET_WINDOW_SECONDS = 300;

    public function request(): View
    {
        return view('Admin.auth.forgot-password');
    }

    public function sendOtp(Request $request): RedirectResponse
    {
        $data = $request->validate(['email' => ['required', 'email', 'max:160']]);
        $email = Str::lower($data['email']);
        $request->session()->forget([
            'admin_password_reset_verified_email',
            'admin_password_reset_verified_at',
            'admin_password_otp_expires_at',
        ]);
        $resendKey = $this->rateLimitKey('resend', $email, $request);
        $hourlyKey = $this->rateLimitKey('hourly', $email, $request);

        if (RateLimiter::tooManyAttempts($resendKey, 1)) {
            $seconds = RateLimiter::availableIn($resendKey);

            return back()->withInput()->withErrors([
                'email' => "Vui lòng chờ {$seconds} giây trước khi yêu cầu mã mới.",
            ]);
        }

        if (RateLimiter::tooManyAttempts($hourlyKey, self::MAX_SENDS_PER_HOUR)) {
            return back()->withInput()->withErrors([
                'email' => 'Bạn đã yêu cầu quá nhiều mã. Vui lòng thử lại sau một giờ.',
            ]);
        }

        $admin = Admin::query()->where('email', $email)->first();

        RateLimiter::hit($resendKey, self::RESEND_COOLDOWN_SECONDS);
        RateLimiter::hit($hourlyKey, 3600);

        if (! $admin || $admin->is_active === false || $admin->status === 'inactive') {
            return back()->with('success', 'Nếu email thuộc một tài khoản quản trị hợp lệ, mã xác thực sẽ được gửi trong ít phút.');
        }

        $code = (string) random_int(100000, 999999);
        $expiresAt = now()->addMinutes(self::OTP_EXPIRATION_MINUTES);

        Cache::put($this->otpCacheKey($email), [
            'code_hash' => Hash::driver('bcrypt')->make($code),
            'expires_at' => $expiresAt->toIso8601String(),
            'attempts' => 0,
            'fingerprint' => $this->fingerprint($request),
        ], $expiresAt);

        try {
            Mail::to($admin->email)->send(new AdminPasswordOtpMail($code));
        } catch (Throwable $exception) {
            Cache::forget($this->otpCacheKey($email));
            report($exception);

            return back()->withInput()->withErrors([
                'email' => 'Không thể gửi email lúc này. Vui lòng kiểm tra cấu hình SMTP và thử lại.',
            ]);
        }

        $request->session()->put('admin_password_otp_email', $email);
        $request->session()->put('admin_password_otp_expires_at', $expiresAt->toIso8601String());

        return redirect()->route('admin.password.otp.form')
            ->with('success', 'Mã OTP đã được gửi. Mã có hiệu lực trong 5 phút.');
    }

    public function otpForm(Request $request): View|RedirectResponse
    {
        $email = $request->session()->get('admin_password_otp_email');

        if (! $email) {
            return redirect()->route('admin.password.request')
                ->withErrors(['email' => 'Hãy nhập email để nhận mã OTP trước.']);
        }

        $expiresAt = $request->session()->get('admin_password_otp_expires_at');

        if (! $expiresAt || now()->greaterThanOrEqualTo(Carbon::parse($expiresAt))) {
            return redirect()->route('admin.password.request')
                ->withErrors(['email' => 'Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.']);
        }

        return view('Admin.auth.verify-otp', [
            'email' => $email,
            'expiresAt' => Carbon::parse($expiresAt)->timestamp,
        ]);
    }

    public function verifyOtp(Request $request): RedirectResponse
    {
        $data = $request->validate(['code' => ['required', 'digits:6']]);
        $email = $request->session()->get('admin_password_otp_email');

        if (! $email) {
            return redirect()->route('admin.password.request')
                ->withErrors(['email' => 'Phiên xác thực đã hết. Vui lòng yêu cầu mã mới.']);
        }

        $verifyKey = $this->rateLimitKey('verify', $email, $request);
        if (RateLimiter::tooManyAttempts($verifyKey, self::MAX_VERIFY_ATTEMPTS)) {
            return back()->withErrors(['code' => 'Bạn đã nhập sai quá nhiều lần. Vui lòng yêu cầu mã mới.']);
        }

        $cacheKey = $this->otpCacheKey($email);
        $otp = Cache::get($cacheKey);

        if (! is_array($otp) || now()->greaterThanOrEqualTo($otp['expires_at'] ?? now())) {
            Cache::forget($cacheKey);

            return redirect()->route('admin.password.request')
                ->withErrors(['email' => 'Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.']);
        }

        if (($otp['fingerprint'] ?? null) !== $this->fingerprint($request) || ! Hash::check($data['code'], $otp['code_hash'])) {
            $attempts = (int) ($otp['attempts'] ?? 0) + 1;
            RateLimiter::hit($verifyKey, self::OTP_EXPIRATION_MINUTES * 60);

            if ($attempts >= self::MAX_VERIFY_ATTEMPTS) {
                Cache::forget($cacheKey);

                return redirect()->route('admin.password.request')
                    ->withErrors(['email' => 'Bạn đã nhập sai OTP quá nhiều lần. Vui lòng yêu cầu mã mới.']);
            }

            $otp['attempts'] = $attempts;
            Cache::put($cacheKey, $otp, Carbon::parse($otp['expires_at']));

            return back()->withErrors(['code' => 'Mã OTP không chính xác.']);
        }

        $admin = Admin::query()->where('email', $email)->first();

        if (! $admin) {
            Cache::forget($cacheKey);
            $request->session()->forget('admin_password_otp_email');

            return redirect()->route('admin.password.request')
                ->withErrors(['email' => 'Không tìm thấy tài khoản quản trị.']);
        }

        Cache::forget($cacheKey);
        RateLimiter::clear($verifyKey);
        $request->session()->forget([
            'admin_password_otp_email',
            'admin_password_otp_expires_at',
        ]);
        $request->session()->put('admin_password_reset_verified_email', $email);
        $request->session()->put('admin_password_reset_verified_at', now()->toIso8601String());

        return redirect()->route('admin.password.reset.form')
            ->with('success', 'OTP chính xác. Hãy tạo mật khẩu mới của bạn.');
    }

    public function resetForm(Request $request): View|RedirectResponse
    {
        if (! $this->hasVerifiedResetSession($request)) {
            return redirect()->route('admin.password.request')
                ->withErrors(['email' => 'Hãy xác minh OTP trước khi tạo mật khẩu mới.']);
        }

        return view('Admin.auth.reset-password');
    }

    public function resetPassword(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'password' => ['required', 'confirmed', PasswordRule::min(8)],
        ]);

        if (! $this->hasVerifiedResetSession($request)) {
            return redirect()->route('admin.password.request')
                ->withErrors(['email' => 'Phiên đặt lại mật khẩu đã hết. Vui lòng yêu cầu mã OTP mới.']);
        }

        $email = $request->session()->get('admin_password_reset_verified_email');
        $admin = Admin::query()->where('email', $email)->first();

        if (! $admin) {
            $this->forgetResetSession($request);

            return redirect()->route('admin.password.request')
                ->withErrors(['email' => 'Không tìm thấy tài khoản quản trị.']);
        }

        $admin->forceFill([
            'password' => Hash::driver('bcrypt')->make($data['password']),
            'remember_token' => Str::random(60),
        ])->save();

        $this->forgetResetSession($request);

        return redirect()->route('admin.login')->with('success', 'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập ngay.');
    }

    private function hasVerifiedResetSession(Request $request): bool
    {
        $verifiedAt = $request->session()->get('admin_password_reset_verified_at');
        $email = $request->session()->get('admin_password_reset_verified_email');

        if (! $verifiedAt || ! $email) {
            return false;
        }

        if (now()->greaterThanOrEqualTo(Carbon::parse($verifiedAt)->addSeconds(self::PASSWORD_RESET_WINDOW_SECONDS))) {
            $this->forgetResetSession($request);

            return false;
        }

        return true;
    }

    private function forgetResetSession(Request $request): void
    {
        $request->session()->forget([
            'admin_password_reset_verified_email',
            'admin_password_reset_verified_at',
            'admin_password_otp_email',
            'admin_password_otp_expires_at',
        ]);
    }

    private function otpCacheKey(string $email): string
    {
        return 'admin-password-otp:'.hash('sha256', $email);
    }

    private function rateLimitKey(string $action, string $email, Request $request): string
    {
        return "admin-password-otp:{$action}:".hash('sha256', $email.'|'.$request->ip());
    }

    private function fingerprint(Request $request): string
    {
        return hash('sha256', $request->ip().'|'.(string) $request->userAgent());
    }
}
