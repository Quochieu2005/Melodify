<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\Playlist;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class ConsoleAndMediaRoutesTest extends TestCase
{
    private string $prefix;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prefix = 'test_console_'.bin2hex(random_bytes(8)).'_';
        config(['database.connections.mongodb.prefix' => $this->prefix]);
        DB::purge('mongodb');
        Http::preventStrayRequests();
    }

    protected function tearDown(): void
    {
        try {
            $connection = DB::connection('mongodb');
            if ($connection->getTablePrefix() === $this->prefix && preg_match('/^test_console_[a-f0-9]{16}_$/', $this->prefix)) {
                foreach (['admins', 'playlists', 'topics'] as $collection) {
                    $connection->getCollection($collection)->drop();
                }
            }
            DB::purge('mongodb');
        } finally {
            parent::tearDown();
        }
    }

    private function createAdmin(string $name, string $email, string $password = 'Passw0rd!x'): void
    {
        $this->artisan('admin:create', ['--name' => $name, '--email' => $email])
            ->expectsQuestion('Mật khẩu (tối thiểu 8 ký tự)', $password)
            ->assertSuccessful();
    }

    public function test_every_admin_created_from_the_command_line_gets_its_own_slug(): void
    {
        $this->createAdmin('First Admin', 'first@example.test');
        $this->createAdmin('Second Admin', 'second@example.test');
        $this->createAdmin('First Admin', 'third@example.test');

        $slugs = Admin::query()->orderBy('email')->pluck('slug', 'email')->all();
        $this->assertSame('first-admin', $slugs['first@example.test']);
        $this->assertSame('second-admin', $slugs['second@example.test']);
        $this->assertSame('first-admin-2', $slugs['third@example.test']);
    }

    public function test_running_admin_create_again_for_the_same_email_updates_the_account_and_keeps_its_slug(): void
    {
        $this->createAdmin('Keeper', 'keeper@example.test', 'Passw0rd!one');
        $slug = Admin::query()->where('email', 'keeper@example.test')->value('slug');

        $this->createAdmin('Keeper Renamed', 'KEEPER@example.test', 'Passw0rd!two');

        $this->assertSame(1, Admin::query()->count());
        $admin = Admin::query()->firstOrFail();
        $this->assertSame('Keeper Renamed', $admin->name);
        $this->assertSame($slug, $admin->slug);
        $this->assertTrue(Hash::check('Passw0rd!two', (string) $admin->password));
    }

    public function test_sort_order_normalizer_ignores_users_personal_playlists(): void
    {
        $make = fn (string $name, string $type, int $order, array $extra = []) => Playlist::query()->create($extra + ['name' => $name, 'slug' => $name, 'type' => $type, 'sort_order' => $order, 'status' => 'active']);
        $first = $make('first', 'popular', 5);
        $second = $make('second', 'popular', 9);
        $mine = $make('mine', 'personal', 0, ['user_id' => 'u1']);
        $yours = $make('yours', 'personal', 0, ['user_id' => 'u2']);

        $this->artisan('catalog:normalize-sort-orders')->assertSuccessful();

        $this->assertSame(1, (int) $first->fresh()->sort_order);
        $this->assertSame(2, (int) $second->fresh()->sort_order);
        $this->assertSame(0, (int) $mine->fresh()->sort_order);
        $this->assertSame(0, (int) $yours->fresh()->sort_order);
    }

    public function test_media_proxy_routes_are_rate_limited_per_visitor(): void
    {
        foreach (['songs.audio', 'songs.external-audio', 'videos.stream', 'videos.download'] as $name) {
            $route = Route::getRoutes()->getByName('api.v1.'.$name);
            $this->assertNotNull($route, $name);
            $this->assertContains('throttle:300,1,media-stream', $route->gatherMiddleware(), $name);
        }
    }

    public function test_external_audio_ids_that_cannot_be_provider_ids_are_rejected_before_any_upstream_call(): void
    {
        $this->get('/api/v1/songs/external/ab/audio')->assertNotFound();
        $this->get('/api/v1/songs/external/abcd%3Fx%3D1/audio')->assertNotFound();
        $this->get('/api/v1/songs/external/'.str_repeat('a', 81).'/audio')->assertNotFound();

        Http::assertNothingSent();
    }
}
