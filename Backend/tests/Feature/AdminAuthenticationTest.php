<?php

namespace Tests\Feature;

use Tests\TestCase;

class AdminAuthenticationTest extends TestCase
{
    public function test_guests_can_view_the_admin_login_page(): void
    {
        $response = $this->get('/admin/login');

        $response->assertSee('Đăng nhập quản trị');
    }

    public function test_guests_are_redirected_to_the_admin_login_page_when_viewing_users(): void
    {
        $response = $this->get('/admin/users');

        $response->assertRedirect(route('admin.login'));
    }

    public function test_admin_login_requires_an_email_and_password(): void
    {
        $response = $this->from('/admin/login')->post('/admin/login');

        $response->assertRedirect('/admin/login');
        $response->assertSessionHasErrors(['email', 'password']);
    }
}
