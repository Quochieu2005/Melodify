<?php

namespace Tests\Feature\Admin;

use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    public function test_login_page_is_available_to_guests(): void
    {
        $this->get(route('admin.login'))
            ->assertOk()
            ->assertSee('Chào mừng trở lại')
            ->assertSee('Giao diện minh họa');
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
}
