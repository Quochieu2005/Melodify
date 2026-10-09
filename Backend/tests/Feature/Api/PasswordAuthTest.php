<?php

namespace Tests\Feature\Api;

use Tests\TestCase;

class PasswordAuthTest extends TestCase
{
    public function test_password_login_requires_identifier_and_password(): void
    {
        $this->postJson('/api/v1/auth/login', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['identifier', 'password']);
    }

    public function test_password_reset_request_requires_an_email(): void
    {
        $this->postJson('/api/v1/auth/password/forgot', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_password_reset_otp_requires_email_and_code(): void
    {
        $this->postJson('/api/v1/auth/password/verify-otp', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['email', 'code']);
    }

    public function test_password_reset_requires_a_reset_token_and_confirmation(): void
    {
        $this->postJson('/api/v1/auth/password/reset', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['email', 'reset_token', 'password']);
    }
}
