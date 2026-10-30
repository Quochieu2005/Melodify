<?php

namespace Tests\Feature;

use App\Http\Middleware\AuthenticateApiUser;
use App\Http\Middleware\OptionalAuthenticateApiUser;
use App\Models\Song;
use App\Models\SongAudioFile;
use App\Models\User;
use App\Models\UserApiToken;
use App\Services\Music\NhacCuaTuiClient;
use GuzzleHttp\Psr7\Response as PsrResponse;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Tests\TestCase;

class AudioPlaybackTest extends TestCase
{
    private string $prefix;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prefix = 'test_playback_'.bin2hex(random_bytes(8)).'_';
        config(['database.connections.mongodb.prefix' => $this->prefix]);
        DB::purge('mongodb');
        Http::preventStrayRequests();
    }

    protected function tearDown(): void
    {
        try {
            $connection = DB::connection('mongodb');
            if ($connection->getTablePrefix() === $this->prefix && preg_match('/^test_playback_[a-f0-9]{16}_$/', $this->prefix)) {
                foreach (['songs', 'song_audio_files', 'users', 'user_api_tokens'] as $collection) {
                    $connection->getCollection($collection)->drop();
                }
            }
            DB::purge('mongodb');
        } finally {
            parent::tearDown();
        }
    }

    private function seedAudio(array $attributes = []): SongAudioFile
    {
        $song = Song::query()->create(['title' => 'Playback', 'slug' => 'playback-test', 'status' => 'published', 'external_source' => 'nhaccuatui', 'external_id' => 'Abcd1234']);

        return SongAudioFile::query()->create([
            'song_id' => (string) $song->getKey(), 'source' => 'nhaccuatui', 'external_id' => 'Abcd1234',
            'file_type' => 'full', 'status' => 'active', 'file_url' => 'https://audio.example.test/old.mp3', ...$attributes,
        ]);
    }

    private function chunk(int $status = 206): Response
    {
        return new Response(new PsrResponse($status, ['Content-Type' => 'audio/mpeg', 'Content-Range' => 'bytes 0-3/20', 'Accept-Ranges' => 'bytes'], 'test'));
    }

    public function test_fresh_stream_url_skips_metadata_lookup_and_preserves_range(): void
    {
        $this->seedAudio(['refreshed_at' => now()]);
        $client = $this->mock(NhacCuaTuiClient::class);
        $client->shouldNotReceive('getSong');
        $client->shouldReceive('stream')->once()->with('https://audio.example.test/old.mp3', 'bytes=0-3')->andReturn($this->chunk());

        $this->withHeader('Range', 'bytes=0-3')->get('/api/v1/songs/playback-test/audio')
            ->assertStatus(206)->assertHeader('Content-Range', 'bytes 0-3/20')->assertStreamedContent('test');
    }

    public function test_expired_url_refreshes_once_and_next_seek_reuses_it(): void
    {
        $audio = $this->seedAudio(['refreshed_at' => now()->subHour()]);
        $client = $this->mock(NhacCuaTuiClient::class);
        $client->shouldReceive('getSong')->once()->with('Abcd1234', false)->andReturn(['streamUrl' => 'https://audio.example.test/new.mp3', 'trackTimeMillis' => 12000]);
        $client->shouldReceive('stream')->twice()->with('https://audio.example.test/new.mp3', 'bytes=0-3')->andReturnUsing(fn () => $this->chunk());

        foreach ([1, 2] as $attempt) {
            $this->withHeader('Range', 'bytes=0-3')->get('/api/v1/songs/playback-test/audio')->assertStatus(206)->assertStreamedContent('test');
        }
        $this->assertSame('https://audio.example.test/new.mp3', $audio->fresh()->file_url);
    }

    public function test_signed_url_expiry_retries_once_without_losing_range(): void
    {
        $this->seedAudio(['refreshed_at' => now()]);
        $client = $this->mock(NhacCuaTuiClient::class);
        $client->shouldReceive('stream')->once()->with('https://audio.example.test/old.mp3', 'bytes=0-3')->andReturn($this->chunk(403));
        $client->shouldReceive('getSong')->once()->with('Abcd1234', false)->andReturn(['streamUrl' => 'https://audio.example.test/new.mp3']);
        $client->shouldReceive('stream')->once()->with('https://audio.example.test/new.mp3', 'bytes=0-3')->andReturn($this->chunk());

        $this->withHeader('Range', 'bytes=0-3')->get('/api/v1/songs/playback-test/audio')->assertStatus(206)->assertStreamedContent('test');
    }

    public function test_vip_denial_happens_before_any_upstream_lookup(): void
    {
        $this->seedAudio(['premium_only' => true]);
        $client = $this->mock(NhacCuaTuiClient::class);
        $client->shouldNotReceive('getSong');
        $client->shouldNotReceive('stream');
        $this->getJson('/api/v1/songs/playback-test/audio')->assertForbidden();
    }

    public function test_refreshing_an_expired_quality_url_rechecks_its_vip_permission(): void
    {
        $this->seedAudio([
            'refreshed_at' => now(),
            'stream_options' => [[
                'qualityId' => 'nct-changing-quality', 'label' => '320 kbps',
                'premiumOnly' => false, 'available' => true,
                'streamUrl' => 'https://audio.example.test/expired.mp3',
            ]],
        ]);
        $client = $this->mock(NhacCuaTuiClient::class);
        $client->shouldReceive('stream')->once()->with('https://audio.example.test/expired.mp3', null)
            ->andReturn($this->chunk(403));
        $client->shouldReceive('getSong')->once()->with('Abcd1234', false)->andReturn([
            'streamOptions' => [[
                'qualityId' => 'nct-changing-quality', 'label' => '320 kbps',
                'premiumOnly' => true, 'available' => true,
                'streamUrl' => 'https://audio.example.test/vip.mp3',
            ]],
        ]);

        $this->getJson('/api/v1/songs/playback-test/audio?quality_id=nct-changing-quality')
            ->assertForbidden()
            ->assertJsonPath('message', 'Chất lượng này dành cho tài khoản VIP.');
    }

    public function test_normal_quality_option_is_proxied_and_download_uses_its_download_url(): void
    {
        $audio = $this->seedAudio([
            'refreshed_at' => now(),
            'stream_options' => [[
                'qualityId' => 'nct-normal-320', 'label' => '320 kbps', 'bitrate' => 320,
                'premiumOnly' => false, 'streamUrl' => 'https://audio.example.test/320.mp3',
                'downloadUrl' => 'https://audio.example.test/320-download.mp3',
            ]],
        ]);
        $client = $this->mock(NhacCuaTuiClient::class);
        $client->shouldNotReceive('getSong');
        $client->shouldReceive('stream')->once()->with('https://audio.example.test/320.mp3', null)->andReturn($this->chunk());

        $this->get('/api/v1/songs/playback-test/audio?quality_id=nct-normal-320')
            ->assertStatus(206)->assertStreamedContent('test');

        $client->shouldReceive('stream')->once()->with('https://audio.example.test/320-download.mp3', null)->andReturn($this->chunk());
        $this->get('/api/v1/songs/playback-test/audio?quality_id=nct-normal-320&download=1')
            ->assertStatus(206)
            ->assertHeader('Content-Disposition', 'attachment; filename="Playback.mp3"; filename*=UTF-8\'\'Playback.mp3')
            ->assertStreamedContent('test');
        $this->assertSame('https://audio.example.test/320.mp3', $audio->fresh()->stream_options[0]['streamUrl']);
    }

    public function test_vip_quality_is_blocked_for_playback_and_download_before_upstream_access(): void
    {
        $this->seedAudio([
            'refreshed_at' => now(),
            'stream_options' => [[
                'qualityId' => 'nct-lossless', 'label' => 'Lossless', 'bitrate' => null,
                'premiumOnly' => true, 'streamUrl' => 'https://audio.example.test/lossless.flac',
                'downloadUrl' => 'https://audio.example.test/lossless-download.flac',
            ]],
        ]);
        $client = $this->mock(NhacCuaTuiClient::class);
        $client->shouldNotReceive('getSong');
        $client->shouldNotReceive('stream');

        $this->getJson('/api/v1/songs/playback-test/audio?quality_id=nct-lossless')->assertForbidden();
        $this->getJson('/api/v1/songs/playback-test/audio?quality_id=nct-lossless&download=1')->assertForbidden();

        $user = User::query()->create([
            'name' => 'Regular Listener', 'username' => 'regular-listener',
            'email' => 'regular-listener@example.test', 'password' => 'not-a-real-password',
            'status' => 'active', 'is_premium' => 0,
        ]);
        $token = Str::random(64);
        UserApiToken::query()->create([
            'user_id' => (string) $user->getKey(),
            'token_hash' => hash('sha256', $token),
            'expires_at' => now()->addHour(),
        ]);
        $this->getJson('/api/v1/songs/playback-test/audio?quality_id=nct-lossless&access_token='.$token)
            ->assertForbidden();
        $this->getJson('/api/v1/songs/playback-test/audio?quality_id=nct-lossless&download=1&access_token='.$token)
            ->assertForbidden();
    }

    public function test_song_api_exposes_proxy_quality_metadata_without_provider_signed_urls(): void
    {
        $this->seedAudio([
            'refreshed_at' => now(),
            'stream_options' => [
                [
                    'qualityId' => 'nct-normal-320', 'label' => '320 kbps', 'bitrate' => 320,
                    'premiumOnly' => false, 'streamUrl' => 'https://audio.example.test/320.mp3',
                    'downloadUrl' => 'https://audio.example.test/320-download.mp3',
                ],
                [
                    'qualityId' => 'nct-vip-lossless', 'label' => 'Lossless', 'bitrate' => null,
                    'premiumOnly' => true, 'available' => false, 'streamUrl' => null,
                    'downloadUrl' => null,
                ],
            ],
        ]);

        $response = $this->getJson('/api/v1/songs/playback-test')->assertOk()
            ->assertJsonPath('data.audio_quality', '320 kbps')
            ->assertJsonPath('data.audio_qualities.0.quality_id', 'nct-normal-320')
            ->assertJsonPath('data.audio_qualities.0.premium_only', false)
            ->assertJsonPath('data.audio_qualities.1.label', 'Lossless')
            ->assertJsonPath('data.audio_qualities.1.premium_only', true)
            ->assertJsonPath('data.audio_qualities.1.available', false)
            ->assertJsonPath('data.audio_qualities.1.audio_url', null)
            ->assertJsonPath('data.audio_qualities.1.download_url', null);

        $this->assertStringContainsString('quality_id=nct-normal-320', $response->getContent());
        $this->assertStringNotContainsString('audio.example.test', $response->getContent());
    }

    public function test_api_token_middleware_keeps_the_admin_guard_separate_from_the_listener(): void
    {
        $user = User::query()->create([
            'name' => 'Guard Isolation', 'username' => 'guard-isolation',
            'email' => 'guard-isolation@example.test', 'password' => 'not-a-real-password',
            'status' => 'active', 'is_premium' => 0,
        ]);
        $token = Str::random(64);
        UserApiToken::query()->create([
            'user_id' => (string) $user->getKey(),
            'token_hash' => hash('sha256', $token),
            'expires_at' => now()->addHour(),
        ]);

        foreach ([OptionalAuthenticateApiUser::class, AuthenticateApiUser::class] as $middleware) {
            $request = Request::create('/api/v1/songs/playback-test/audio', 'GET');
            $request->headers->set('Authorization', 'Bearer '.$token);

            app($middleware)->handle($request, function (Request $request) use ($user) {
                $this->assertTrue($user->is($request->user()));
                $this->assertTrue($user->is($request->user('web')));
                $this->assertNull($request->user('admin'));

                return response()->noContent();
            });
        }
    }

    public function test_unavailable_vip_quality_is_not_streamed_even_when_the_user_is_premium(): void
    {
        $this->seedAudio([
            'refreshed_at' => now(),
            'stream_options' => [[
                'qualityId' => 'nct-locked-lossless', 'label' => 'Lossless', 'bitrate' => null,
                'premiumOnly' => true, 'available' => false, 'streamUrl' => null,
            ]],
        ]);
        $client = $this->mock(NhacCuaTuiClient::class);
        $client->shouldNotReceive('getSong');
        $client->shouldNotReceive('stream');

        $this->getJson('/api/v1/songs/playback-test/audio?quality_id=nct-locked-lossless')
            ->assertNotFound()
            ->assertJsonPath('message', 'NhacCuaTui có thông tin chất lượng nhưng chưa trả luồng phát/tải cho yêu cầu này.');
    }

    public function test_external_unavailable_quality_is_rejected_even_if_cached_metadata_has_a_url(): void
    {
        $externalId = 'UnavailableExternal123';
        Cache::forget('external-audio:'.hash('sha256', $externalId));
        $client = $this->mock(NhacCuaTuiClient::class);
        $client->shouldReceive('getSong')->once()->with($externalId, false)->andReturn([
            'streamOptions' => [[
                'qualityId' => 'nct-locked', 'label' => 'Lossless', 'available' => false,
                'premiumOnly' => false, 'streamUrl' => 'https://audio.example.test/locked.flac',
            ]],
        ]);
        $client->shouldNotReceive('stream');

        $this->getJson('/api/v1/songs/external/'.$externalId.'/audio?quality_id=nct-locked')
            ->assertNotFound()
            ->assertJsonPath('message', 'NhacCuaTui có thông tin chất lượng nhưng chưa trả luồng phát/tải cho yêu cầu này.');
    }

    public function test_external_vip_quality_accepts_a_valid_vip_access_token(): void
    {
        $externalId = 'AvailableVipExternal123';
        Cache::forget('external-audio:'.hash('sha256', $externalId));
        $user = User::query()->create([
            'name' => 'VIP Stream Test', 'username' => 'vip-stream-test',
            'email' => 'vip-stream-test@example.test', 'password' => 'not-a-real-password',
            'status' => 'active', 'is_premium' => 1,
        ]);
        $token = Str::random(64);
        UserApiToken::query()->create([
            'user_id' => (string) $user->getKey(),
            'token_hash' => hash('sha256', $token),
            'expires_at' => now()->addHour(),
        ]);

        $client = $this->mock(NhacCuaTuiClient::class);
        $client->shouldReceive('getSong')->once()->with($externalId, false)->andReturn([
            'streamOptions' => [[
                'qualityId' => 'nct-vip-lossless', 'label' => 'Lossless', 'available' => true,
                'premiumOnly' => true, 'streamUrl' => 'https://audio.example.test/lossless.flac',
                'downloadUrl' => 'https://audio.example.test/lossless-download.flac',
            ]],
        ]);
        $client->shouldReceive('stream')->once()->with('https://audio.example.test/lossless.flac', null)->andReturn($this->chunk());
        $client->shouldReceive('stream')->once()->with('https://audio.example.test/lossless-download.flac', null)->andReturn($this->chunk());

        $this->get('/api/v1/songs/external/'.$externalId.'/audio?quality_id=nct-vip-lossless&access_token='.$token)
            ->assertStatus(206)
            ->assertStreamedContent('test');
        $this->get('/api/v1/songs/external/'.$externalId.'/audio?quality_id=nct-vip-lossless&download=1&access_token='.$token)
            ->assertStatus(206)
            ->assertHeader('Content-Disposition', 'attachment; filename="Bai_hat.flac"; filename*=UTF-8\'\'B%C3%A0i%20h%C3%A1t.flac')
            ->assertStreamedContent('test');
    }

    public function test_uploaded_audio_override_never_fetches_imported_metadata(): void
    {
        $this->seedAudio(['source' => 'cloudinary', 'external_id' => null]);
        $client = $this->mock(NhacCuaTuiClient::class);
        $client->shouldNotReceive('getSong');
        $client->shouldNotReceive('stream');
        $this->get('/api/v1/songs/playback-test/audio')->assertRedirect('https://audio.example.test/old.mp3');
    }

    public function test_uploaded_cloudinary_audio_download_uses_attachment_delivery(): void
    {
        $this->seedAudio([
            'source' => 'cloudinary',
            'external_id' => null,
            'file_url' => 'https://res.cloudinary.com/demo/video/upload/v123/melodify/audio/test.m4a',
        ]);
        $client = $this->mock(NhacCuaTuiClient::class);
        $client->shouldNotReceive('getSong');
        $client->shouldNotReceive('stream');

        $this->get('/api/v1/songs/playback-test/audio?download=1')
            ->assertRedirect('https://res.cloudinary.com/demo/video/upload/fl_attachment:Playback.m4a/v123/melodify/audio/test.m4a');
    }

    public function test_upstream_connection_failure_returns_gateway_error_not_internal_server_error(): void
    {
        $this->seedAudio(['refreshed_at' => now()]);
        $client = $this->mock(NhacCuaTuiClient::class);
        $client->shouldNotReceive('getSong');
        $client->shouldReceive('stream')->once()->andThrow(new ConnectionException('timeout'));
        $this->getJson('/api/v1/songs/playback-test/audio')->assertStatus(502)
            ->assertJsonPath('message', 'Nguồn âm thanh chưa phản hồi. Vui lòng thử lại.');
    }
}
