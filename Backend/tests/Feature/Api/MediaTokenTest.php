<?php

namespace Tests\Feature\Api;

use App\Models\Playlist;
use App\Models\Song;
use App\Models\SongAudioFile;
use App\Models\User;
use App\Models\UserApiToken;
use App\Services\Music\NhacCuaTuiClient;
use App\Support\MediaToken;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Tests\TestCase;

class MediaTokenTest extends TestCase
{
    private string $prefix;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prefix = 'test_media_token_'.bin2hex(random_bytes(8)).'_';
        config(['database.connections.mongodb.prefix' => $this->prefix]);
        DB::purge('mongodb');
        Http::preventStrayRequests();
    }

    protected function tearDown(): void
    {
        try {
            $connection = DB::connection('mongodb');
            if ($connection->getTablePrefix() === $this->prefix && preg_match('/^test_media_token_[a-f0-9]{16}_$/', $this->prefix)) {
                foreach (['songs', 'song_audio_files', 'users', 'user_api_tokens', 'playlists'] as $collection) {
                    $connection->getCollection($collection)->drop();
                }
            }
            DB::purge('mongodb');
        } finally {
            parent::tearDown();
        }
    }

    /** @return array{0: User, 1: array<string, string>, 2: string} user, bearer headers, plain login token */
    private function userWithToken(bool $premium = true): array
    {
        $name = 'u'.Str::lower(Str::random(6));
        $user = User::query()->create(['name' => $name, 'username' => $name, 'slug' => $name, 'email' => $name.'@example.test', 'password' => 'x', 'status' => 'active', 'is_premium' => $premium ? 1 : 0]);
        $plain = Str::random(64);
        UserApiToken::query()->create(['user_id' => (string) $user->getKey(), 'token_hash' => hash('sha256', $plain), 'expires_at' => now()->addDay()]);

        return [$user, ['Authorization' => 'Bearer '.$plain], $plain];
    }

    /** In production every request starts without a user; the test app reuses its auth guards between requests. */
    private function fresh(): static
    {
        $this->app['auth']->forgetGuards();

        return $this;
    }

    private function seedVipSong(): void
    {
        $song = Song::query()->create(['title' => 'VIP Song', 'slug' => 'vip-song', 'status' => 'published']);
        SongAudioFile::query()->create([
            'song_id' => (string) $song->getKey(), 'source' => 'cloudinary', 'file_type' => 'full', 'status' => 'active',
            'premium_only' => true, 'file_url' => 'https://res.cloudinary.com/demo/video/upload/v1/vip.mp3',
        ]);
        $client = $this->mock(NhacCuaTuiClient::class);
        $client->shouldNotReceive('getSong');
        $client->shouldNotReceive('stream');
    }

    public function test_a_ticket_belongs_to_one_user_and_rejects_tampering_garbage_and_expiry(): void
    {
        [$user] = $this->userWithToken();
        $ticket = MediaToken::issue($user);

        $this->assertSame(3600, $ticket['ttl_seconds']);
        $this->assertSame((string) $user->getKey(), MediaToken::userId($ticket['token']));

        [$payload, $signature] = explode('.', $ticket['token']);
        $this->assertNull(MediaToken::userId($payload.'.'.strrev($signature)), 'forged signature');
        $this->assertNull(MediaToken::userId('x'.$payload.'.'.$signature), 'altered payload');
        foreach (['', 'garbage', 'a.b.c', '.', $payload, '.'.$signature] as $bad) {
            $this->assertNull(MediaToken::userId($bad), "rejects [{$bad}]");
        }

        $this->travel(61)->minutes();
        $this->assertNull(MediaToken::userId($ticket['token']), 'expired');
    }

    public function test_the_endpoint_needs_a_login_and_returns_a_ticket_that_is_not_cached(): void
    {
        $this->postJson('/api/v1/auth/media-token')->assertUnauthorized();

        [$user, $headers] = $this->userWithToken();
        $response = $this->postJson('/api/v1/auth/media-token', [], $headers)->assertOk();

        $this->assertStringContainsString('no-store', (string) $response->headers->get('Cache-Control'));
        $this->assertSame(3600, $response->json('ttl_seconds'));
        $this->assertSame((string) $user->getKey(), MediaToken::userId($response->json('token')));
    }

    public function test_vip_audio_plays_with_a_ticket_in_the_url_and_is_denied_without_or_with_a_free_users_ticket(): void
    {
        $this->seedVipSong();
        [$vip, $vipHeaders] = $this->userWithToken(true);
        [$free] = $this->userWithToken(false);
        $vipTicket = $this->postJson('/api/v1/auth/media-token', [], $vipHeaders)->json('token');

        $this->fresh()->get('/api/v1/songs/vip-song/audio?media_token='.$vipTicket)->assertRedirect('https://res.cloudinary.com/demo/video/upload/v1/vip.mp3');
        $this->fresh()->get('/api/v1/songs/vip-song/audio')->assertForbidden();
        $this->fresh()->get('/api/v1/songs/vip-song/audio?media_token='.MediaToken::issue($free)['token'])->assertForbidden();
        $this->fresh()->get('/api/v1/songs/vip-song/audio?media_token=not-a-ticket')->assertForbidden();

        $this->travel(61)->minutes();
        $this->fresh()->get('/api/v1/songs/vip-song/audio?media_token='.$vipTicket)->assertForbidden();
    }

    public function test_a_ticket_cannot_be_used_as_a_login_anywhere_else(): void
    {
        [$user, $headers] = $this->userWithToken();
        Playlist::query()->create(['name' => 'Mine', 'slug' => 'mine', 'user_id' => (string) $user->getKey(), 'status' => 'active', 'visibility' => 'private']);
        $ticket = MediaToken::issue($user)['token'];

        $this->getJson('/api/v1/me/library', $headers)->assertOk()->assertJsonCount(1, 'data.created_playlists');
        $this->fresh()->getJson('/api/v1/me/library?media_token='.$ticket)->assertOk()->assertJsonCount(0, 'data.created_playlists');
        $this->fresh()->getJson('/api/v1/auth/me?media_token='.$ticket)->assertUnauthorized();
        $this->fresh()->postJson('/api/v1/auth/media-token?media_token='.$ticket)->assertUnauthorized();
    }

    public function test_the_login_token_in_the_url_is_accepted_only_on_media_routes_and_only_while_allowed(): void
    {
        $this->seedVipSong();
        [$user, , $plain] = $this->userWithToken(true);
        Playlist::query()->create(['name' => 'Mine', 'slug' => 'mine', 'user_id' => (string) $user->getKey(), 'status' => 'active', 'visibility' => 'private']);

        // Transition: old clients still send ?access_token= on the media routes.
        $this->fresh()->get('/api/v1/songs/vip-song/audio?access_token='.$plain)->assertRedirect();
        // ...but never on other routes, where it used to log the caller in.
        $this->fresh()->getJson('/api/v1/me/library?access_token='.$plain)->assertOk()->assertJsonCount(0, 'data.created_playlists');

        config(['auth.allow_query_access_token' => false]);
        $this->fresh()->get('/api/v1/songs/vip-song/audio?access_token='.$plain)->assertForbidden();
        $this->fresh()->get('/api/v1/songs/vip-song/audio', ['Authorization' => 'Bearer '.$plain])->assertRedirect();
    }

    public function test_a_blocked_user_cannot_play_vip_audio_with_a_ticket(): void
    {
        $this->seedVipSong();
        [$user] = $this->userWithToken(true);
        $ticket = MediaToken::issue($user)['token'];
        $user->forceFill(['status' => 'blocked'])->save();

        $this->get('/api/v1/songs/vip-song/audio?media_token='.$ticket)->assertForbidden();
    }
}
