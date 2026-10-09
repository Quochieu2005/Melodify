<?php

namespace App\Services;

use App\Models\PhoneLoginChallenge;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;

class PhoneOtpService
{
    public function normalize(string $phone): string
    {
        $phone = preg_replace('/[\s().-]+/', '', trim($phone)) ?? '';

        if (str_starts_with($phone, '0')) {
            $phone = '+84'.substr($phone, 1);
        } elseif (str_starts_with($phone, '84')) {
            $phone = '+'.$phone;
        }

        if (! preg_match('/^\+[1-9]\d{7,14}$/', $phone)) {
            throw new \InvalidArgumentException('Số điện thoại phải ở định dạng quốc tế, ví dụ +84901234567.');
        }

        return $phone;
    }

    public function send(string $phone): array
    {
        $phone = $this->normalize($phone);
        $now = now();
        $resendSeconds = max(30, (int) config('auth.phone_otp.resend_seconds', 60));

        if (PhoneLoginChallenge::where('phone', $phone)
            ->where('created_at', '>=', $now->copy()->subSeconds($resendSeconds))
            ->exists()) {
            throw new TooManyRequestsHttpException($resendSeconds, 'Vui lòng chờ trước khi yêu cầu mã mới.');
        }

        $expiresAt = $now->copy()->addMinutes(max(2, (int) config('auth.phone_otp.ttl_minutes', 5)));
        $driver = (string) config('auth.phone_otp.driver', 'log');
        $code = (string) random_int(100000, 999999);

        if (! in_array($driver, ['log', 'twilio'], true)) {
            throw new \RuntimeException('PHONE_OTP_DRIVER không được hỗ trợ.');
        }

        if ($driver === 'twilio'
            && ((string) config('services.twilio.account_sid') === ''
                || (string) config('services.twilio.auth_token') === ''
                || (string) config('services.twilio.verify_service_sid') === '')) {
            throw new \RuntimeException('Thiếu cấu hình Twilio Verify.');
        }

        PhoneLoginChallenge::where('phone', $phone)->delete();

        PhoneLoginChallenge::create([
            'phone' => $phone,
            'provider' => $driver,
            'code_hash' => $driver === 'log' ? Hash::make($code) : null,
            'attempts' => 0,
            'expires_at' => $expiresAt,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        if ($driver === 'log') {
            Log::warning('Phone OTP generated for local testing.', [
                'phone' => $phone,
                'code' => $code,
                'expires_at' => $expiresAt->toISOString(),
            ]);
        } elseif ($driver === 'twilio') {
            $this->sendWithTwilio($phone);
        }

        return [
            'phone' => $phone,
            'expires_at' => $expiresAt->toISOString(),
            'resend_after_seconds' => $resendSeconds,
        ];
    }

    public function verify(string $phone, string $code): bool
    {
        $phone = $this->normalize($phone);
        $challenge = PhoneLoginChallenge::where('phone', $phone)->latest('created_at')->first();

        if (! $challenge || ! $challenge->expires_at || $challenge->expires_at->isPast()) {
            return false;
        }

        $maxAttempts = max(3, (int) config('auth.phone_otp.max_attempts', 5));

        if ((int) ($challenge->attempts ?? 0) >= $maxAttempts) {
            return false;
        }

        $valid = $challenge->provider === 'twilio'
            ? $this->checkWithTwilio($phone, $code)
            : Hash::check($code, (string) $challenge->code_hash);

        $challenge->increment('attempts');

        if (! $valid) {
            return false;
        }

        $challenge->forceFill(['verified_at' => now()])->save();
        $challenge->delete();

        return true;
    }

    private function sendWithTwilio(string $phone): void
    {
        $accountSid = (string) config('services.twilio.account_sid');
        $authToken = (string) config('services.twilio.auth_token');
        $serviceSid = (string) config('services.twilio.verify_service_sid');

        if ($accountSid === '' || $authToken === '' || $serviceSid === '') {
            throw new \RuntimeException('Thiếu cấu hình Twilio Verify.');
        }

        Http::asForm()
            ->withBasicAuth($accountSid, $authToken)
            ->timeout(15)
            ->post("https://verify.twilio.com/v2/Services/{$serviceSid}/Verifications", [
                'To' => $phone,
                'Channel' => 'sms',
            ])
            ->throw();
    }

    private function checkWithTwilio(string $phone, string $code): bool
    {
        $accountSid = (string) config('services.twilio.account_sid');
        $authToken = (string) config('services.twilio.auth_token');
        $serviceSid = (string) config('services.twilio.verify_service_sid');

        if ($accountSid === '' || $authToken === '' || $serviceSid === '') {
            return false;
        }

        $response = Http::asForm()
            ->withBasicAuth($accountSid, $authToken)
            ->timeout(15)
            ->post("https://verify.twilio.com/v2/Services/{$serviceSid}/VerificationCheck", [
                'To' => $phone,
                'Code' => $code,
            ]);

        return $response->successful() && $response->json('status') === 'approved';
    }
}
