<?php

namespace Tests\Feature\Api;

use App\Mail\UserPasswordOtpMail;
use App\Models\User;
use App\Models\UserApiToken;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class PasswordLoginFlowTest extends TestCase
{
    private string $prefix;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prefix = 'test_login_'.bin2hex(random_bytes(8)).'_';
        config(['database.connections.mongodb.prefix' => $this->prefix]);
        DB::purge('mongodb');
        Http::preventStrayRequests();
    }

    protected function tearDown(): void
    {
        try {
            $connection = DB::connection('mongodb');
            if ($connection->getTablePrefix() === $this->prefix && preg_match('/^test_login_[a-f0-9]{16}_$/', $this->prefix)) {
                foreach (['users', 'user_api_tokens'] as $collection) {
                    $connection->getCollection($collection)->drop();
                }
            }
            DB::purge('mongodb');
        } finally {
            parent::tearDown();
        }
    }

    public function test_email_and_username_login_issue_tokens_and_logout_revokes_only_current_token(): void
    {
        $user = User::query()->create(['name' => 'Login Test', 'username' => 'login-test', 'email' => 'login@example.test', 'password' => 'BrowserTest!2026', 'status' => 'active']);
        $first = $this->postJson('/api/v1/auth/login', ['identifier' => 'login@example.test', 'password' => 'BrowserTest!2026'])
            ->assertOk()->assertJsonPath('user.id', (string) $user->getKey());
        $second = $this->postJson('/api/v1/auth/login', ['identifier' => 'login-test', 'password' => 'BrowserTest!2026', 'remember' => true])->assertOk();
        $token = $first->json('token');
        $otherToken = $second->json('token');
        $this->assertNotEmpty($token);
        $this->assertNotSame($token, $otherToken);
        $this->assertSame(2, UserApiToken::query()->count());
        $this->getJson('/api/v1/auth/me', ['Authorization' => 'Bearer '.$token])->assertOk();
        $this->postJson('/api/v1/auth/logout', [], ['Authorization' => 'Bearer '.$token])->assertOk();
        $this->getJson('/api/v1/auth/me', ['Authorization' => 'Bearer '.$token])->assertUnauthorized();
        $this->getJson('/api/v1/auth/me', ['Authorization' => 'Bearer '.$otherToken])->assertOk();
        $this->assertNotNull($user->fresh()->last_login_at);
    }

    public function test_wrong_password_and_locked_account_never_receive_tokens(): void
    {
        $user = User::query()->create(['name' => 'Locked Test', 'username' => 'locked-test', 'email' => 'locked@example.test', 'password' => 'BrowserTest!2026', 'status' => 'active']);
        $this->postJson('/api/v1/auth/login', ['identifier' => 'locked@example.test', 'password' => 'incorrect'])->assertUnauthorized()->assertJsonMissingPath('token');
        $user->update(['status' => 'blocked']);
        $this->postJson('/api/v1/auth/login', ['identifier' => 'locked@example.test', 'password' => 'BrowserTest!2026'])->assertForbidden()->assertJsonMissingPath('token');
        $this->assertSame(0, UserApiToken::query()->count());
    }

    public function test_password_reset_validates_otp_changes_password_and_revokes_old_sessions(): void
    {
        Mail::fake();
        $email = 'reset-'.bin2hex(random_bytes(4)).'@example.test';
        $user = User::query()->create(['name' => 'Reset Test', 'email' => $email, 'password' => 'BrowserTest!2026', 'status' => 'active']);
        $oldToken = $this->postJson('/api/v1/auth/login', ['identifier' => $email, 'password' => 'BrowserTest!2026'])->assertOk()->json('token');
        $this->postJson('/api/v1/auth/password/forgot', ['email' => $email])->assertOk();
        $otp = '';
        Mail::assertSent(UserPasswordOtpMail::class, function (UserPasswordOtpMail $mail) use (&$otp, $email): bool {
            $otp = $mail->code;

            return $mail->hasTo($email);
        });
        $wrongOtp = $otp === '000000' ? '111111' : '000000';
        $this->postJson('/api/v1/auth/password/verify-otp', ['email' => $email, 'code' => $wrongOtp])->assertUnprocessable();
        $reset = $this->postJson('/api/v1/auth/password/verify-otp', ['email' => $email, 'code' => $otp])->assertOk()->json('reset_token');
        $this->postJson('/api/v1/auth/password/reset', ['email' => $email, 'reset_token' => $reset, 'password' => 'ChangedTest!2026', 'password_confirmation' => 'mismatch'])->assertUnprocessable();
        $payload = ['email' => $email, 'reset_token' => $reset, 'password' => 'ChangedTest!2026', 'password_confirmation' => 'ChangedTest!2026'];
        $this->postJson('/api/v1/auth/password/reset', $payload)->assertOk();
        $this->getJson('/api/v1/auth/me', ['Authorization' => 'Bearer '.$oldToken])->assertUnauthorized();
        $this->postJson('/api/v1/auth/login', ['identifier' => $email, 'password' => 'BrowserTest!2026'])->assertUnauthorized();
        $this->postJson('/api/v1/auth/login', ['identifier' => $email, 'password' => 'ChangedTest!2026'])->assertOk();
        $this->postJson('/api/v1/auth/password/reset', $payload)->assertUnprocessable();
        $this->assertNotSame($user->password, $user->fresh()->password);
    }
}
