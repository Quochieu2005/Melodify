<?php

namespace Tests\Feature\Admin;

use App\Models\Admin;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class AdminUserVipTest extends TestCase
{
    private string $prefix;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prefix = 'test_admin_vip_'.bin2hex(random_bytes(8)).'_';
        // The form request's unique rules use the default connection, which is MongoDB in production.
        config(['database.default' => 'mongodb', 'database.connections.mongodb.prefix' => $this->prefix]);
        DB::purge('mongodb');
        $slug = 'vip-admin-'.Str::lower(Str::random(6));
        $this->actingAs(Admin::query()->create([
            'name' => 'VIP Admin', 'email' => $slug.'@example.test', 'slug' => $slug, 'password' => 'not-a-real-password',
            'role' => 'super_admin', 'permissions' => [], 'status' => 'active', 'is_active' => true,
        ]), 'admin');
    }

    protected function tearDown(): void
    {
        try {
            $connection = DB::connection('mongodb');
            if ($connection->getTablePrefix() === $this->prefix && preg_match('/^test_admin_vip_[a-f0-9]{16}_$/', $this->prefix)) {
                foreach (['admins', 'admin_notifications', 'logs', 'users'] as $collection) {
                    $connection->getCollection($collection)->drop();
                }
            }
            DB::purge('mongodb');
        } finally {
            parent::tearDown();
        }
    }

    private function user(array $attributes = []): User
    {
        return User::query()->create($attributes + [
            'name' => 'Member', 'username' => 'member-'.Str::lower(Str::random(5)), 'slug' => 'member-'.Str::lower(Str::random(5)),
            'email' => Str::lower(Str::random(8)).'@example.test', 'password' => 'x', 'status' => 'active', 'is_premium' => 0,
        ]);
    }

    private function payload(User $user, array $overrides = []): array
    {
        return array_replace([
            'name' => $user->name, 'email' => $user->email, 'username' => $user->username, 'slug' => $user->slug,
            'status' => 'active', 'is_premium' => 1,
        ], $overrides);
    }

    public function test_editing_a_paying_vip_does_not_turn_the_timed_subscription_into_a_permanent_one(): void
    {
        $expires = now()->addDays(10)->startOfSecond();
        $vip = $this->user(['is_premium' => 1, 'vip_expires_at' => $expires]);

        $this->put(route('admin.users.update', $vip->getKey()), $this->payload($vip, ['name' => 'Renamed Member']))
            ->assertRedirect();

        $fresh = $vip->fresh();
        $this->assertSame('Renamed Member', $fresh->name);
        $this->assertSame(1, (int) $fresh->is_premium);
        $this->assertNotNull($fresh->vip_expires_at, 'the expiry date must survive an unrelated edit');
        $this->assertSame($expires->timestamp, $fresh->vip_expires_at->timestamp);
    }

    public function test_granting_vip_to_a_regular_user_is_permanent(): void
    {
        $member = $this->user(['is_premium' => 0, 'vip_expires_at' => now()->subDay()]);

        $this->put(route('admin.users.update', $member->getKey()), $this->payload($member))->assertRedirect();

        $fresh = $member->fresh();
        $this->assertSame(1, (int) $fresh->is_premium);
        $this->assertNull($fresh->vip_expires_at);
    }
}
