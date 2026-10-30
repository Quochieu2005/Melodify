<?php

namespace Tests\Feature\Api;

use App\Models\User;
use App\Models\UserApiToken;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Laravel\Socialite\Contracts\User as SocialiteUser;
use Laravel\Socialite\Facades\Socialite;
use Mockery;
use Tests\TestCase;

class SocialAuthExchangeTest extends TestCase
{
    private string $prefix;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prefix = 'test_social_'.bin2hex(random_bytes(8)).'_';
        config(['database.connections.mongodb.prefix' => $this->prefix]);
        DB::purge('mongodb');
        Http::preventStrayRequests();
    }

    protected function tearDown(): void
    {
        try {
            $connection = DB::connection('mongodb');
            if ($connection->getTablePrefix() === $this->prefix && preg_match('/^test_social_[a-f0-9]{16}_$/', $this->prefix)) {
                foreach (['users', 'user_api_tokens'] as $collection) {
                    $connection->getCollection($collection)->drop();
                }
            }
            DB::purge('mongodb');
        } finally {
            parent::tearDown();
        }
    }

    public function test_google_code_is_exchanged_on_backend_and_creates_melodify_session(): void
    {
        config([
            'services.google.client_id' => '',
            'services.google.client_secret' => '',
            'services.google.mobile_client_ids' => 'ios-client-id, android-client-id',
            'services.google.mobile_redirect' => 'mobile://oauth/callback',
        ]);
        Http::fake([
            'https://oauth2.googleapis.com/token' => Http::response(['access_token' => 'google-access-token'], 200),
        ]);

        $socialUser = Mockery::mock(SocialiteUser::class);
        $socialUser->shouldReceive('getEmail')->andReturn('oauth-user@example.test');
        $socialUser->shouldReceive('getId')->andReturn('google-subject-123');
        $socialUser->shouldReceive('getName')->andReturn('OAuth User');
        $socialUser->shouldReceive('getNickname')->andReturn('oauth-user');
        $socialUser->shouldReceive('getAvatar')->andReturn(null);

        $driver = Mockery::mock();
        $driver->shouldReceive('userFromToken')->once()->with('google-access-token')->andReturn($socialUser);
        Socialite::shouldReceive('driver')->once()->with('google')->andReturn($driver);

        $response = $this->postJson('/api/v1/auth/social/exchange', [
            'provider' => 'google',
            'code' => 'authorization-code-from-google',
            'client_id' => 'ios-client-id',
            'redirect_uri' => 'mobile://oauth/callback',
            'code_verifier' => str_repeat('v', 48),
            'device_name' => 'melodify-mobile',
        ]);

        $response->assertOk()
            ->assertJsonPath('user.email', 'oauth-user@example.test')
            ->assertJsonPath('user.name', 'OAuth User');
        $this->assertNotEmpty($response->json('token'));
        $this->assertSame(1, UserApiToken::query()->count());
        Http::assertSent(fn (HttpRequest $request): bool => $request->url() === 'https://oauth2.googleapis.com/token'
            && $request['client_id'] === 'ios-client-id'
            && $request['code_verifier'] === str_repeat('v', 48)
            && $request['redirect_uri'] === 'mobile://oauth/callback');
    }

    public function test_mobile_social_ticket_creates_a_session_once_and_then_expires(): void
    {
        $user = User::query()->create([
            'name' => 'Mobile OAuth User',
            'username' => 'mobile-oauth-user',
            'email' => 'mobile-oauth@example.test',
            'password' => 'not-a-real-password',
            'status' => 'active',
        ]);
        $ticket = 't'.str_repeat('k', 63);
        Cache::put('mobile-social-auth:'.hash('sha256', $ticket), [
            'user_id' => (string) $user->getKey(),
            'provider' => 'google',
        ], now()->addMinutes(2));

        $this->postJson('/api/v1/auth/social/exchange-ticket', ['ticket' => $ticket])
            ->assertOk()
            ->assertJsonPath('user.email', 'mobile-oauth@example.test');

        $this->postJson('/api/v1/auth/social/exchange-ticket', ['ticket' => $ticket])
            ->assertStatus(410);

        $this->assertSame(1, UserApiToken::query()->count());
    }

    public function test_mobile_google_callback_returns_one_time_ticket_then_api_session(): void
    {
        $socialUser = Mockery::mock(SocialiteUser::class);
        $socialUser->shouldReceive('getEmail')->andReturn('callback-user@example.test');
        $socialUser->shouldReceive('getId')->andReturn('google-callback-subject');
        $socialUser->shouldReceive('getName')->andReturn('Callback User');
        $socialUser->shouldReceive('getNickname')->andReturn('callback-user');
        $socialUser->shouldReceive('getAvatar')->andReturn(null);

        $driver = Mockery::mock();
        $driver->shouldReceive('user')->once()->andReturn($socialUser);
        Socialite::shouldReceive('driver')->once()->with('google')->andReturn($driver);

        $response = $this->withSession([
            'mobile_social_auth_flow' => [
                'provider' => 'google',
                'redirect' => 'mobile://oauth/callback',
                'started_at' => now()->timestamp,
            ],
        ])->get('/auth/google/callback');

        $response->assertRedirect();
        $query = [];
        parse_str((string) parse_url((string) $response->headers->get('Location'), PHP_URL_QUERY), $query);
        $this->assertArrayHasKey('ticket', $query);

        $this->postJson('/api/v1/auth/social/exchange-ticket', ['ticket' => $query['ticket']])
            ->assertOk()
            ->assertJsonPath('user.email', 'callback-user@example.test');

        $this->assertSame(1, UserApiToken::query()->count());
    }

    public function test_expo_go_rejects_localhost_callback_with_actionable_configuration_error(): void
    {
        config(['services.google.redirect' => 'http://localhost:8000/auth/google/callback']);
        $this->postJson('/api/v1/auth/social/browser/start', ['provider' => 'google'])
            ->assertStatus(503)->assertJsonPath('code', 'oauth_callback_not_public');
    }

    public function test_expo_go_requires_private_poll_proof_and_pairing_code_and_supports_cancellation(): void
    {
        config(['services.google.redirect' => 'https://login.example.test/auth/google/callback']);
        $session = $this->postJson('/api/v1/auth/social/browser/start', ['provider' => 'google'])->assertOk()->json();
        $payload = ['session_id' => $session['session_id'], 'poll_token' => $session['poll_token']];
        $path = '/auth/mobile/browser/'.$session['session_id'];
        $this->get($path)->assertOk()->assertDontSee($session['poll_token'])->assertDontSee($session['pairing_code']);
        $this->postJson('/api/v1/auth/social/browser/poll', array_replace($payload, ['poll_token' => str_repeat('x', 64)]))->assertNotFound();
        $this->post($path, ['code' => '00000000'])->assertOk()->assertSee('Mã chưa đúng');
        $this->postJson('/api/v1/auth/social/browser/poll', $payload)->assertOk()->assertJsonPath('status', 'pending');
        $this->postJson('/api/v1/auth/social/browser/poll', $payload + ['cancel' => true])->assertOk()->assertJsonPath('status', 'cancelled');
        $this->postJson('/api/v1/auth/social/browser/poll', $payload)->assertStatus(410);
        $this->get($path)->assertStatus(410);
    }

    public function test_expo_go_google_and_facebook_complete_through_api_without_deep_link_and_retry_does_not_issue_another_token(): void
    {
        foreach (['google', 'facebook'] as $provider) {
            config(["services.{$provider}.redirect" => "https://login.example.test/auth/{$provider}/callback"]);
            $socialUser = Mockery::mock(SocialiteUser::class);
            $socialUser->shouldReceive('getEmail')->andReturn("browser-{$provider}@example.test");
            $socialUser->shouldReceive('getId')->andReturn("browser-{$provider}-subject");
            $socialUser->shouldReceive('getName')->andReturn('Browser User');
            $socialUser->shouldReceive('getNickname')->andReturn("browser-{$provider}");
            $socialUser->shouldReceive('getAvatar')->andReturn(null);
            $driver = Mockery::mock();
            $driver->shouldReceive('redirect')->once()->andReturn(redirect('https://provider.example.test/authorize'));
            $driver->shouldReceive('user')->once()->andReturn($socialUser);
            Socialite::shouldReceive('driver')->twice()->with($provider)->andReturn($driver);
            $session = $this->postJson('/api/v1/auth/social/browser/start', ['provider' => $provider])->assertOk()->json();
            $payload = ['session_id' => $session['session_id'], 'poll_token' => $session['poll_token']];
            $this->post('/auth/mobile/browser/'.$session['session_id'], ['code' => $session['pairing_code']])->assertRedirect('https://provider.example.test/authorize');
            $this->postJson('/api/v1/auth/social/browser/poll', $payload)->assertOk()->assertJsonPath('status', 'authorizing');
            $this->get("/auth/{$provider}/callback")->assertOk()->assertSee('quay lại Expo Go');
            $first = $this->postJson('/api/v1/auth/social/browser/poll', $payload)->assertOk()
                ->assertJsonPath('status', 'completed')->assertJsonPath('auth.user.email', "browser-{$provider}@example.test");
            $this->postJson('/api/v1/auth/social/browser/poll', $payload)->assertOk()->assertJsonPath('auth.token', $first->json('auth.token'));
        }
        $this->assertSame(2, UserApiToken::query()->count());
    }

    public function test_expo_go_session_expires_and_wrong_codes_are_bounded(): void
    {
        config(['services.google.redirect' => 'https://login.example.test/auth/google/callback']);
        $session = $this->postJson('/api/v1/auth/social/browser/start', ['provider' => 'google'])->assertOk()->json();
        $path = '/auth/mobile/browser/'.$session['session_id'];
        for ($i = 0; $i < 5; $i++) {
            $this->post($path, ['code' => '00000000'])->assertOk()->assertSee('Mã chưa đúng');
        }
        $this->post($path, ['code' => $session['pairing_code']])->assertStatus(410);
        $this->travel(11)->minutes();
        $this->postJson('/api/v1/auth/social/browser/poll', ['session_id' => $session['session_id'], 'poll_token' => $session['poll_token']])->assertStatus(410);
    }
}
