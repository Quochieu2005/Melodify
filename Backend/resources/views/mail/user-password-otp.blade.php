<x-mail::message>
# Mã OTP đặt lại mật khẩu

Bạn vừa yêu cầu đặt lại mật khẩu cho tài khoản Melodify.

<div style="margin: 24px 0; padding: 18px; border: 1px solid #d9e8e8; border-radius: 8px; color: #073b3d; font-size: 30px; font-weight: 700; letter-spacing: 10px; text-align: center;">
{{ $code }}
</div>

Mã có hiệu lực trong **{{ config('auth.password_reset.ttl_minutes', 5) }} phút** và chỉ sử dụng được một lần. Không chia sẻ mã này với bất kỳ ai.

Nếu bạn không yêu cầu thay đổi mật khẩu, hãy bỏ qua email này.

Trân trọng,<br>
{{ config('app.name') }}
</x-mail::message>
