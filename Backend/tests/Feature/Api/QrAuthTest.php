<?php

namespace Tests\Feature\Api;

use App\Models\User;
use App\Models\UserApiToken;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class QrAuthTest extends TestCase
{
    private string $prefix;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prefix = 'test_qr_'.bin2hex(random_bytes(8)).'_';
        config(['database.connections.mongodb.prefix' => $this->prefix]);
        DB::purge('mongodb');
    }

    protected function tearDown(): void
    {
        try {
            $connection = DB::connection('mongodb');
            if ($connection->getTablePrefix() === $this->prefix && preg_match('/^test_qr_[a-f0-9]{16}_$/', $this->prefix)) {
                foreach (['users', 'user_api_tokens'] as $collection) {
                    $connection->getCollection($collection)->drop();
                }
            }
            DB::purge('mongodb');
        } finally {
            parent::tearDown();
        }
    }

    private function userWithToken(string $name): array
    {
        $user = User::query()->create(['name' => $name, 'username' => Str::slug($name), 'email' => Str::slug($name).'@example.test', 'password' => 'x', 'status' => 'active']);
        $plain = Str::random(64);
        UserApiToken::query()->create(['user_id' => (string) $user->getKey(), 'token_hash' => hash('sha256', $plain), 'expires_at' => now()->addHour()]);

        return [$user, ['Authorization' => 'Bearer '.$plain]];
    }

    public function test_scanning_a_qr_does_not_log_the_browser_in_until_the_phone_confirms(): void
    {
        [$user, $phone] = $this->userWithToken('Qr Owner');
        $start = $this->postJson('/api/v1/auth/qr/start', ['device_name' => 'Attacker laptop'])->assertOk();
        $sessionId = $start->json('session_id');
        $poll = ['poll_token' => $start->json('poll_token')];

        $this->withHeaders($phone)->postJson('/api/v1/auth/qr/scan', ['qr_payload' => $start->json('qr_payload')])
            ->assertOk()
            ->assertJsonPath('status', 'scanned')
            ->assertJsonPath('device_name', 'Attacker laptop');

        $this->getJson("/api/v1/auth/qr/{$sessionId}/status?".http_build_query($poll))
            ->assertOk()->assertJsonPath('status', 'scanned')->assertJsonMissingPath('token');

        $this->withHeaders($phone)->postJson('/api/v1/auth/qr/approve', ['session_id' => $sessionId])
            ->assertOk()->assertJsonPath('status', 'approved');

        $this->getJson("/api/v1/auth/qr/{$sessionId}/status?".http_build_query($poll))
            ->assertOk()->assertJsonPath('status', 'completed')->assertJsonPath('user.id', (string) $user->getKey());
    }

    public function test_only_the_user_who_scanned_can_approve_and_unscanned_sessions_cannot_be_approved(): void
    {
        [, $owner] = $this->userWithToken('Qr Scanner');
        [, $other] = $this->userWithToken('Qr Other');
        $start = $this->postJson('/api/v1/auth/qr/start')->assertOk();
        $sessionId = $start->json('session_id');

        $this->withHeaders($owner)->postJson('/api/v1/auth/qr/approve', ['session_id' => $sessionId])->assertStatus(422);

        $this->withHeaders($owner)->postJson('/api/v1/auth/qr/scan', ['qr_payload' => $start->json('qr_payload')])->assertOk();
        $this->withHeaders($other)->postJson('/api/v1/auth/qr/approve', ['session_id' => $sessionId])->assertStatus(422);
    }
}
