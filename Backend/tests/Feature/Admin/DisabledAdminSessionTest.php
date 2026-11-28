<?php

namespace Tests\Feature\Admin;

use App\Models\Admin;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class DisabledAdminSessionTest extends TestCase
{
    private string $prefix;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prefix = 'test_disabled_admin_'.bin2hex(random_bytes(8)).'_';
        config(['database.connections.mongodb.prefix' => $this->prefix]);
        DB::purge('mongodb');
    }

    protected function tearDown(): void
    {
        try {
            $connection = DB::connection('mongodb');
            if ($connection->getTablePrefix() === $this->prefix && preg_match('/^test_disabled_admin_[a-f0-9]{16}_$/', $this->prefix)) {
                foreach (['admins', 'admin_notifications', 'logs'] as $collection) {
                    $connection->getCollection($collection)->drop();
                }
            }
            DB::purge('mongodb');
        } finally {
            parent::tearDown();
        }
    }

    private function admin(): Admin
    {
        return Admin::query()->create([
            'name' => 'Session Admin', 'email' => 'session-admin@example.test', 'slug' => 'session-admin', 'password' => 'x',
            'role' => 'admin', 'permissions' => [], 'status' => 'active', 'is_active' => true,
        ]);
    }

    public function test_an_active_admin_keeps_working(): void
    {
        $this->actingAs($this->admin(), 'admin');

        $this->get(route('admin.profile.edit'))->assertOk();
        $this->assertAuthenticated('admin');
    }

    public function test_disabling_an_admin_ends_the_session_on_the_next_request(): void
    {
        $admin = $this->admin();
        $this->actingAs($admin, 'admin');
        $this->get(route('admin.profile.edit'))->assertOk();

        // What "Tắt tài khoản" does; a real request reloads the admin from the database.
        $admin->forceFill(['status' => 'inactive', 'is_active' => false])->save();

        $this->get(route('admin.profile.edit'))
            ->assertRedirect(route('admin.login'))
            ->assertSessionHas('warning', 'Tài khoản quản trị đã bị khóa.');
        $this->assertGuest('admin');
    }

    public function test_a_disabled_admin_cannot_post_either(): void
    {
        $admin = $this->admin();
        $this->actingAs($admin, 'admin');
        $admin->forceFill(['status' => 'inactive', 'is_active' => false])->save();

        $this->put(route('admin.profile.password'), ['current_password' => 'x', 'password' => 'NewPassw0rd!', 'password_confirmation' => 'NewPassw0rd!'])
            ->assertRedirect(route('admin.login'));
        $this->assertGuest('admin');
    }
}
