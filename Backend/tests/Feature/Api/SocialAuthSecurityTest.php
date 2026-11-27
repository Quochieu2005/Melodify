<?php

namespace Tests\Feature\Api;

use App\Models\User;
use App\Models\UserApiToken;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Laravel\Socialite\Contracts\User as SocialiteUser;
use Laravel\Socialite\Facades\Socialite;
use Mockery;
use Tests\TestCase;

class SocialAuthSecurityTest extends TestCase
{
    private string $prefix;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prefix = 'test_socsec_'.bin2hex(random_bytes(8)).'_';
        config(['database.connections.mongodb.prefix' => $this->prefix]);
        DB::purge('mongodb');
        Http::preventStrayRequests();
        config([
            'services.google.client_id' => 'our-web-client',
            'services.google.mobile_client_ids' => 'our-ios-client, our-android-client',
            'services.facebook.client_id' => 'our-fb-app',
            'services.facebook.client_secret' => 'fb-secret',
        ]);
    }

    protected function tearDown(): void
    {
        try {
            $connection = DB::connection('mongodb');
            if ($connection->getTablePrefix() === $this->prefix && preg_match('/^test_socsec_[a-f0-9]{16}_$/', $this->prefix)) {
                foreach (['users', 'user_api_tokens'] as $collection) {
                    $connection->getCollection($collection)->drop();
                }
            }
            DB::purge('mongodb');
        } finally {
            parent::tearDown();
        }
    }

    private function mockSocialUser(string $email, string $id): void
    {
        $socialUser = Mockery::mock(SocialiteUser::class);
        $socialUser->shouldReceive('getEmail')->andReturn($email);
        $socialUser->shouldReceive('getId')->andReturn($id);
        $socialUser->shouldReceive('getName')->andReturn('Social User');
        $socialUser->shouldReceive('getNickname')->andReturn('social-user');
        $socialUser->shouldReceive('getAvatar')->andReturn(null);
        $driver = Mockery::mock();
        $driver->shouldReceive('userFromToken')->andReturn($socialUser);
        Socialite::shouldReceive('driver')->andReturn($driver);
    }

    private function token(): string
    {
        return 'access-token-'.Str::random(30);
    }

    public function test_google_token_issued_to_another_app_is_rejected_without_calling_socialite(): void
    {
        Http::fake(['https://oauth2.googleapis.com/tokeninfo*' => Http::response(['aud' => 'someone-elses-app', 'azp' => 'someone-elses-app'])]);
        Socialite::shouldReceive('driver')->never();

        $this->postJson('/api/v1/auth/google', ['access_token' => $this->token()])
            ->assertStatus(422)->assertJsonPath('code', 'invalid_social_token');
        $this->assertSame(0, UserApiToken::query()->count());
    }

    public function test_google_token_issued_to_our_web_client_logs_in(): void
    {
        Http::fake(['https://oauth2.googleapis.com/tokeninfo*' => Http::response(['aud' => 'our-web-client'])]);
        $this->mockSocialUser('g-web@example.test', 'google-subject-web');

        $this->postJson('/api/v1/auth/google', ['access_token' => $this->token()])
            ->assertOk()->assertJsonPath('user.email', 'g-web@example.test');
    }

    public function test_google_token_issued_to_our_mobile_client_logs_in(): void
    {
        Http::fake(['https://oauth2.googleapis.com/tokeninfo*' => Http::response(['azp' => 'our-android-client', 'aud' => 'our-android-client'])]);
        $this->mockSocialUser('g-mobile@example.test', 'google-subject-mobile');

        $this->postJson('/api/v1/auth/google', ['access_token' => $this->token()])
            ->assertOk()->assertJsonPath('user.email', 'g-mobile@example.test');
    }

    public function test_facebook_token_from_another_app_is_rejected(): void
    {
        Http::fake(['https://graph.facebook.com/*/debug_token*' => Http::response(['data' => ['is_valid' => true, 'app_id' => 'another-app']])]);
        Socialite::shouldReceive('driver')->never();

        $this->postJson('/api/v1/auth/facebook', ['access_token' => $this->token()])->assertStatus(422);
    }

    public function test_facebook_token_from_our_app_is_accepted(): void
    {
        Http::fake(['https://graph.facebook.com/*/debug_token*' => Http::response(['data' => ['is_valid' => true, 'app_id' => 'our-fb-app']])]);
        $this->mockSocialUser('fb@example.test', 'fb-subject');

        $this->postJson('/api/v1/auth/facebook', ['access_token' => $this->token()])->assertOk();
    }

    public function test_login_is_refused_when_provider_credentials_are_not_configured(): void
    {
        config(['services.google.client_id' => '', 'services.google.mobile_client_ids' => '']);
        Socialite::shouldReceive('driver')->never();

        $this->postJson('/api/v1/auth/google', ['access_token' => $this->token()])->assertStatus(503);
    }

    public function test_expo_dev_redirects_are_refused_in_production_but_allowed_while_developing(): void
    {
        $uri = 'exp://203.0.113.9:8081/--/oauth/callback';

        $this->app['env'] = 'production';
        $this->get('/auth/mobile/google/redirect?redirect_uri='.urlencode($uri))->assertStatus(422);

        $this->app['env'] = 'testing';
        $this->get('/auth/mobile/google/redirect?redirect_uri='.urlencode($uri))->assertRedirect();
    }

    public function test_social_login_by_email_takes_over_a_password_account_so_a_pre_registrant_loses_access(): void
    {
        $victim = User::query()->create([
            'name' => 'Pre Registered', 'username' => 'pre-registered', 'email' => 'owner@example.test',
            'password' => Hash::make('attacker-knows-this'), 'status' => 'active',
        ]);
        $attackerToken = 'attacker-token-'.Str::random(40);
        UserApiToken::query()->create(['user_id' => (string) $victim->getKey(), 'token_hash' => hash('sha256', $attackerToken), 'expires_at' => now()->addDay()]);

        Http::fake(['https://oauth2.googleapis.com/tokeninfo*' => Http::response(['aud' => 'our-web-client'])]);
        $this->mockSocialUser('owner@example.test', 'google-owner-subject');
        $this->postJson('/api/v1/auth/google', ['access_token' => $this->token()])->assertOk();

        $this->assertFalse(Hash::check('attacker-knows-this', (string) $victim->fresh()->password));
        $this->assertSame(0, UserApiToken::query()->where('token_hash', hash('sha256', $attackerToken))->count());
        $this->assertSame('google-owner-subject', $victim->fresh()->google_id);
    }

    public function test_an_account_that_already_has_a_social_login_keeps_its_password_and_tokens(): void
    {
        $user = User::query()->create([
            'name' => 'Linked', 'username' => 'linked', 'email' => 'linked@example.test', 'google_id' => 'google-linked',
            'password' => Hash::make('still-valid-1'), 'status' => 'active',
        ]);
        $token = 'keep-token-'.Str::random(40);
        UserApiToken::query()->create(['user_id' => (string) $user->getKey(), 'token_hash' => hash('sha256', $token), 'expires_at' => now()->addDay()]);

        Http::fake(['https://oauth2.googleapis.com/tokeninfo*' => Http::response(['aud' => 'our-web-client'])]);
        $this->mockSocialUser('linked@example.test', 'google-linked');
        $this->postJson('/api/v1/auth/google', ['access_token' => $this->token()])->assertOk();

        $this->assertTrue(Hash::check('still-valid-1', (string) $user->fresh()->password));
        $this->assertSame(1, UserApiToken::query()->where('token_hash', hash('sha256', $token))->count());
    }
}
