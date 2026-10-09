<?php

namespace Tests\Feature\Admin;

use App\Models\Admin;
use Illuminate\Support\Facades\Config;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    public function test_login_page_is_available_to_guests(): void
    {
        $this->get(route('admin.login'))
            ->assertOk()
            ->assertSee('Chào mừng trở lại')
            ->assertSee('Đăng nhập')
            ->assertSee('Quên mật khẩu?');
    }

    public function test_admin_dashboard_requires_authentication(): void
    {
        $this->get(route('admin.dashboard'))
            ->assertRedirect(route('admin.login'));
    }

    public function test_login_requires_an_email_and_password(): void
    {
        $this->post(route('admin.login.store'), [])
            ->assertSessionHasErrors(['email', 'password']);
    }

    public function test_logging_out_revokes_api_docs_access(): void
    {
        Config::set('app.api_docs_enabled', true);

        $admin = new Admin([
            'name' => 'Test Admin',
            'email' => 'test-admin@example.com',
            'role' => 'admin',
            'status' => 'active',
            'is_active' => true,
        ]);

        $this->actingAs($admin, 'admin')
            ->get(route('api.docs'))
            ->assertOk();

        $this->post(route('admin.logout'))
            ->assertRedirect(route('admin.login'));

        $this->get(route('api.docs'))
            ->assertUnauthorized();
    }
}
