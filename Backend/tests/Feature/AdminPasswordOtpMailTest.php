<?php

namespace Tests\Feature;

use App\Mail\AdminPasswordOtpMail;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AdminPasswordOtpMailTest extends TestCase
{
    public function test_otp_mail_contains_the_code_and_expiration_notice(): void
    {
        $mailable = new AdminPasswordOtpMail('123456');

        $mailable->assertHasSubject('Mã xác thực đặt lại mật khẩu Melodify Admin')
            ->assertSeeInHtml('123456')
            ->assertSeeInHtml('5 phút');
    }

    public function test_forgot_password_page_is_available_to_guests(): void
    {
        $this->get(route('admin.password.request'))
            ->assertOk()
            ->assertSee('Quên mật khẩu?')
            ->assertSee('Gửi mã OTP');
    }

    public function test_password_hashing_uses_bcrypt(): void
    {
        $this->assertSame('bcrypt', Hash::getDefaultDriver());
    }

    public function test_password_form_requires_a_verified_otp(): void
    {
        $this->get(route('admin.password.reset.form'))
            ->assertRedirect(route('admin.password.request'));
    }

    public function test_otp_step_only_shows_the_code_field_before_verification(): void
    {
        $this->withSession([
            'admin_password_otp_email' => 'admin@example.com',
            'admin_password_otp_expires_at' => Carbon::now()->addMinutes(5)->toIso8601String(),
        ])->get(route('admin.password.otp.form'))
            ->assertOk()
            ->assertSee('data-otp-countdown', false)
            ->assertSee('Xác minh mã OTP')
            ->assertDontSee('name="password"', false);
    }
}
