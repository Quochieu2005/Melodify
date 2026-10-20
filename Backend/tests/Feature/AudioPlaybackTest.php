<?php

namespace Tests\Feature;

use App\Models\Song;
use App\Models\SongAudioFile;
use App\Services\Music\NhacCuaTuiClient;
use GuzzleHttp\Psr7\Response as PsrResponse;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
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
                foreach (['songs', 'song_audio_files'] as $collection) {
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

    public function test_uploaded_audio_override_never_fetches_imported_metadata(): void
    {
        $this->seedAudio(['source' => 'cloudinary', 'external_id' => null]);
        $client = $this->mock(NhacCuaTuiClient::class);
        $client->shouldNotReceive('getSong');
        $client->shouldNotReceive('stream');
        $this->get('/api/v1/songs/playback-test/audio')->assertRedirect('https://audio.example.test/old.mp3');
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
