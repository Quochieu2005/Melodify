<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\AdminNotification;
use App\Models\Log as AuditLog;
use App\Models\Song;
use App\Services\AdminAuditLogService;
use App\Services\AdminNotificationService;
use App\Services\CloudinaryService;
use App\Services\Music\AppleMusicArtistImageClient;
use App\Services\Music\NhacCuaTuiClient;
use App\Services\Music\SongImportService;
use App\Support\PublicUrl;
use GuzzleHttp\Psr7\Request as PsrRequest;
use GuzzleHttp\Psr7\Response as PsrResponse;
use GuzzleHttp\Psr7\Uri;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Mockery\MockInterface;
use Tests\TestCase;

class ProviderUrlGuardsTest extends TestCase
{
    private string $prefix;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prefix = 'test_url_guards_'.bin2hex(random_bytes(8)).'_';
        config(['database.connections.mongodb.prefix' => $this->prefix]);
        DB::purge('mongodb');
        Http::preventStrayRequests();
    }

    protected function tearDown(): void
    {
        try {
            $connection = DB::connection('mongodb');
            if ($connection->getTablePrefix() === $this->prefix && preg_match('/^test_url_guards_[a-f0-9]{16}_$/', $this->prefix)) {
                foreach (['admins', 'logs', 'admin_notifications', 'artists', 'songs'] as $collection) {
                    $connection->getCollection($collection)->drop();
                }
            }
            DB::purge('mongodb');
        } finally {
            parent::tearDown();
        }
    }

    public function test_redirect_guard_lets_public_redirects_through_and_blocks_private_ones(): void
    {
        $options = PublicUrl::redirectOptions();
        $callback = $options['on_redirect'];
        $request = new PsrRequest('GET', 'https://cdn.example.test/a');
        $response = new PsrResponse(302);

        $callback($request, $response, new Uri('https://cdn.example.test/b'));
        $this->expectException(\RuntimeException::class);
        $callback($request, $response, new Uri('http://169.254.169.254/latest/meta-data'));
    }

    public function test_artist_avatar_from_a_private_address_is_neither_fetched_nor_stored(): void
    {
        $artists = app(SongImportService::class)->syncExternalArtists([
            'artistName' => 'Private Image Artist',
            'artists' => [['id' => 'pia1', 'name' => 'Private Image Artist', 'image_url' => 'http://169.254.169.254/avatar.jpg']],
        ], null, ['Private Image Artist']);

        $this->assertEmpty($artists[0]->fresh()->avatar_url);
        Http::assertNothingSent();
    }

    public function test_artist_avatar_from_a_public_address_is_downloaded_and_uploaded(): void
    {
        Http::fake(['https://cdn.example.test/*' => Http::response('image-bytes', 200, ['Content-Type' => 'image/jpeg'])]);
        $this->mock(CloudinaryService::class, function (MockInterface $mock): void {
            $mock->shouldReceive('datedPublicId')->andReturn('test/avatar');
            $mock->shouldReceive('uploadImageContents')->once()->andReturn(['secure_url' => 'https://res.cloudinary.com/demo/image/upload/a.jpg', 'public_id' => 'test/avatar']);
        });

        $artists = app(SongImportService::class)->syncExternalArtists([
            'artistName' => 'Public Image Artist',
            'artists' => [['id' => 'pub1', 'name' => 'Public Image Artist', 'image_url' => 'https://cdn.example.test/avatar.jpg']],
        ], null, ['Public Image Artist']);

        $this->assertSame('https://res.cloudinary.com/demo/image/upload/a.jpg', $artists[0]->fresh()->avatar_url);
        Http::assertSent(fn (HttpRequest $request): bool => $request->url() === 'https://cdn.example.test/avatar.jpg');
    }

    public function test_apple_music_artist_page_on_a_private_address_is_not_requested(): void
    {
        $this->assertNull(app(AppleMusicArtistImageClient::class)->findArtistImage('Someone', 'http://127.0.0.1:8000/artist/1'));

        Http::assertNothingSent();
    }

    public function test_synced_lyrics_file_on_a_private_address_is_not_downloaded(): void
    {
        config(['services.nhaccuatui.graph_base_url' => 'https://nct.example.test']);
        Http::fake(['https://nct.example.test/*' => Http::response(['code' => '0', 'data' => ['content' => 'plain words', 'timedLyric' => 'http://10.0.0.5/lyrics.lrc']])]);

        $lyrics = app(NhacCuaTuiClient::class)->getLyrics('abc123', ['trackId' => 'abc123']);

        $this->assertSame('plain words', $lyrics['plainLyrics']);
        $this->assertNull($lyrics['syncedLyrics']);
        Http::assertNotSent(fn (HttpRequest $request): bool => str_contains($request->url(), '10.0.0.5'));
    }

    public function test_admin_audit_log_caps_long_input_values_but_keeps_short_ones(): void
    {
        $admin = Admin::query()->create(['name' => 'Log Admin', 'email' => 'log-admin@example.test', 'slug' => 'log-admin', 'password' => 'x', 'role' => 'admin', 'status' => 'active', 'is_active' => true]);
        $request = Request::create('/admin/songs/1/lyrics', 'PUT', [
            'title' => 'Short title',
            'plain_lyrics' => str_repeat('á', 5000),
            'nested' => ['long' => str_repeat('b', 900), 'ids' => ['a', 'b']],
        ]);

        app(AdminAuditLogService::class)->record($request, $admin, 'songs.lyrics.update', 'Cập nhật lời');

        $input = AuditLog::query()->firstOrFail()->metadata['input'];
        $this->assertSame('Short title', $input['title']);
        $this->assertLessThan(600, mb_strlen($input['plain_lyrics']));
        $this->assertStringContainsString('cắt bớt, tổng 5000 ký tự', $input['plain_lyrics']);
        $this->assertLessThan(600, mb_strlen($input['nested']['long']));
        $this->assertSame(['a', 'b'], $input['nested']['ids']);
    }

    public function test_admin_notifications_no_longer_claim_the_system_is_healthy_without_checking(): void
    {
        $admin = Admin::query()->create(['name' => 'Notify Admin', 'email' => 'notify-admin@example.test', 'slug' => 'notify-admin', 'password' => 'x', 'role' => 'admin', 'status' => 'active', 'is_active' => true]);
        Song::query()->create(['title' => 'Waiting', 'slug' => 'waiting', 'status' => 'draft']);

        app(AdminNotificationService::class)->syncFor($admin);

        $this->assertGreaterThanOrEqual(1, AdminNotification::query()->count(), 'real notifications are still created');
        $this->assertSame(0, AdminNotification::query()->where('type', 'system')->count());
        $this->assertSame(0, AdminNotification::query()->where('title', 'Hệ thống ổn định')->count());
    }
}
