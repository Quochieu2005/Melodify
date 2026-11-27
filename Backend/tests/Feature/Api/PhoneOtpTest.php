<?php

namespace Tests\Feature\Api;

use App\Models\PhoneLoginChallenge;
use App\Services\PhoneOtpService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

class PhoneOtpTest extends TestCase
{
    private string $prefix;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prefix = 'test_otp_'.bin2hex(random_bytes(8)).'_';
        config(['database.connections.mongodb.prefix' => $this->prefix]);
        DB::purge('mongodb');
        config(['auth.phone_otp.driver' => 'log', 'auth.phone_otp.max_attempts' => 5]);
    }

    protected function tearDown(): void
    {
        try {
            $connection = DB::connection('mongodb');
            if ($connection->getTablePrefix() === $this->prefix && preg_match('/^test_otp_[a-f0-9]{16}_$/', $this->prefix)) {
                $connection->getCollection('phone_login_challenges')->drop();
            }
            DB::purge('mongodb');
        } finally {
            parent::tearDown();
        }
    }

    public function test_log_driver_is_refused_outside_local_and_testing_and_writes_no_challenge(): void
    {
        $this->app['env'] = 'production';

        $this->postJson('/api/v1/auth/phone/request-otp', ['phone' => '+84901234567'])->assertStatus(503);

        $this->assertSame(0, PhoneLoginChallenge::query()->count());
    }

    public function test_wrong_codes_stop_after_the_attempt_limit_even_when_the_right_code_follows(): void
    {
        PhoneLoginChallenge::query()->create([
            'phone' => '+84901234567',
            'provider' => 'log',
            'code_hash' => Hash::make('123456'),
            'attempts' => 0,
            'expires_at' => now()->addMinutes(5),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $otp = app(PhoneOtpService::class);

        for ($i = 0; $i < 5; $i++) {
            $this->assertFalse($otp->verify('+84901234567', '000000'));
        }

        $this->assertFalse($otp->verify('+84901234567', '123456'));
        $this->assertSame(5, (int) PhoneLoginChallenge::query()->first()->attempts);
    }

    public function test_correct_code_verifies_once(): void
    {
        PhoneLoginChallenge::query()->create([
            'phone' => '+84901234567',
            'provider' => 'log',
            'code_hash' => Hash::make('123456'),
            'attempts' => 0,
            'expires_at' => now()->addMinutes(5),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $otp = app(PhoneOtpService::class);

        $this->assertTrue($otp->verify('+84901234567', '123456'));
        $this->assertFalse($otp->verify('+84901234567', '123456'));
    }
}
