<?php

namespace Tests\Feature\Api;

use Tests\TestCase;

class SocialAuthTest extends TestCase
{
    public function test_social_login_requires_a_provider_and_access_token(): void
    {
        $this->postJson('/api/v1/auth/social', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['provider', 'access_token']);
    }

    public function test_provider_login_requires_an_access_token(): void
    {
        $this->postJson('/api/v1/auth/google', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['access_token']);
    }

    public function test_me_requires_a_melodify_api_token(): void
    {
        $this->getJson('/api/v1/auth/me')
            ->assertUnauthorized();
    }

    public function test_phone_otp_request_requires_a_phone_number(): void
    {
        $this->postJson('/api/v1/auth/phone/request-otp', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['phone']);
    }

    public function test_phone_otp_verification_requires_phone_and_code(): void
    {
        $this->postJson('/api/v1/auth/phone/verify', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['phone', 'code']);
    }
}
