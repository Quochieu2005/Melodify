<?php

namespace Tests\Feature\Api;

use App\Models\Playlist;
use App\Models\PlaylistSong;
use App\Models\Report;
use App\Models\Song;
use App\Models\SongVideo;
use App\Models\User;
use App\Models\UserApiToken;
use App\Services\CloudinaryService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Mockery\MockInterface;
use Tests\TestCase;

class UserPlaylistAndReportHardeningTest extends TestCase
{
    private string $prefix;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prefix = 'test_playlist_hard_'.bin2hex(random_bytes(8)).'_';
        config(['database.connections.mongodb.prefix' => $this->prefix]);
        DB::purge('mongodb');
    }

    protected function tearDown(): void
    {
        try {
            $connection = DB::connection('mongodb');
            if ($connection->getTablePrefix() === $this->prefix && preg_match('/^test_playlist_hard_[a-f0-9]{16}_$/', $this->prefix)) {
                foreach (['playlists', 'playlist_songs', 'playlist_favorites', 'playlist_shares', 'songs', 'song_videos', 'reports', 'users', 'user_api_tokens'] as $collection) {
                    $connection->getCollection($collection)->drop();
                }
            }
            DB::purge('mongodb');
        } finally {
            parent::tearDown();
        }
    }

    /** @return array{0: User, 1: array<string, string>} */
    private function account(): array
    {
        $name = 'u'.Str::lower(Str::random(6));
        $user = User::query()->create(['name' => $name, 'username' => $name, 'slug' => $name, 'email' => $name.'@example.test', 'password' => 'x', 'status' => 'active', 'is_premium' => 0]);
        $plain = Str::random(64);
        UserApiToken::query()->create(['user_id' => (string) $user->getKey(), 'token_hash' => hash('sha256', $plain), 'expires_at' => now()->addDay()]);

        return [$user, ['Authorization' => 'Bearer '.$plain]];
    }

    private function personalPlaylist(User $user, array $extra = []): Playlist
    {
        return Playlist::query()->create($extra + [
            'user_id' => (string) $user->getKey(), 'name' => 'Mine '.Str::random(4), 'slug' => 'mine-'.Str::lower(Str::random(8)),
            'type' => 'personal', 'visibility' => 'private', 'is_system' => false, 'status' => 'active', 'sort_order' => 0,
        ]);
    }

    private function song(string $title): Song
    {
        return Song::query()->create(['title' => $title, 'slug' => Str::slug($title).'-'.Str::lower(Str::random(4)), 'status' => 'published']);
    }

    public function test_the_playlist_list_reports_the_right_song_count_for_each_playlist(): void
    {
        [$user, $headers] = $this->account();
        $this->personalPlaylist($user, ['name' => 'Empty']);
        $two = $this->personalPlaylist($user, ['name' => 'Two']);
        $three = $this->personalPlaylist($user, ['name' => 'Three']);
        foreach ([[$two, 2], [$three, 3]] as [$playlist, $count]) {
            for ($i = 0; $i < $count; $i++) {
                PlaylistSong::query()->create(['playlist_id' => (string) $playlist->getKey(), 'song_id' => 'song-'.$playlist->name.$i, 'position' => $i]);
            }
        }

        $counts = collect($this->getJson('/api/v1/me/playlists', $headers)->assertOk()->json('data'))->pluck('song_count', 'name')->all();

        // The list is ordered by last update, so compare by name.
        $this->assertEquals(['Empty' => 0, 'Two' => 2, 'Three' => 3], $counts);
    }

    public function test_adding_songs_inserts_them_in_one_go_after_the_existing_ones_and_skips_duplicates(): void
    {
        [$user, $headers] = $this->account();
        $playlist = $this->personalPlaylist($user);
        $playlistId = (string) $playlist->getKey();
        [$a, $b, $c, $d] = [$this->song('A'), $this->song('B'), $this->song('C'), $this->song('D')];
        PlaylistSong::query()->create(['playlist_id' => $playlistId, 'song_id' => (string) $a->getKey(), 'position' => 0]);

        $this->postJson("/api/v1/me/playlists/{$playlistId}/songs", ['song_ids' => [(string) $a->getKey(), (string) $b->getKey(), (string) $c->getKey(), (string) $d->getKey()]], $headers)
            ->assertOk()->assertJsonPath('added_count', 3);

        $links = PlaylistSong::query()->where('playlist_id', $playlistId)->orderBy('position')->get();
        $this->assertSame([(string) $a->getKey(), (string) $b->getKey(), (string) $c->getKey(), (string) $d->getKey()], $links->pluck('song_id')->map(fn ($id): string => (string) $id)->all());
        $this->assertSame([0, 1, 2, 3], $links->pluck('position')->map(fn ($p): int => (int) $p)->all());
        $this->assertSame((string) $user->getKey(), (string) $links[1]->added_by_user_id);

        $this->postJson("/api/v1/me/playlists/{$playlistId}/songs", ['song_ids' => [(string) $b->getKey()]], $headers)
            ->assertOk()->assertJsonPath('added_count', 0);
        $this->assertSame(4, PlaylistSong::query()->where('playlist_id', $playlistId)->count());
    }

    public function test_an_account_cannot_create_more_than_the_playlist_limit(): void
    {
        [$user, $headers] = $this->account();
        $now = now();
        Playlist::query()->insert(array_map(fn (int $i): array => [
            'user_id' => (string) $user->getKey(), 'name' => "P{$i}", 'slug' => "p-{$i}", 'type' => 'personal',
            'visibility' => 'private', 'is_system' => false, 'status' => 'active', 'created_at' => $now, 'updated_at' => $now,
        ], range(1, 200)));

        $this->postJson('/api/v1/me/playlists', ['name' => 'One too many'], $headers)
            ->assertUnprocessable()->assertJsonValidationErrors('name');
        $this->assertSame(200, Playlist::query()->where('user_id', (string) $user->getKey())->count());
    }

    public function test_replacing_a_cover_deletes_the_old_cloudinary_image(): void
    {
        [$user, $headers] = $this->account();
        $playlist = $this->personalPlaylist($user, ['cover_url' => 'https://res.cloudinary.com/demo/old.png', 'cover_public_id' => 'old-cover']);
        $this->mock(CloudinaryService::class, function (MockInterface $mock): void {
            $mock->shouldReceive('uploadImage')->once()->andReturn(['secure_url' => 'https://res.cloudinary.com/demo/new.png', 'public_id' => 'new-cover']);
            $mock->shouldReceive('deleteImage')->once()->with('old-cover');
        });

        $this->post('/api/v1/me/playlists/'.$playlist->getKey(), ['cover_image_file' => UploadedFile::fake()->image('c.png', 640, 640)], $headers + ['Accept' => 'application/json'])
            ->assertOk()->assertJsonPath('data.cover_url', 'https://res.cloudinary.com/demo/new.png');
        $this->assertSame('new-cover', $playlist->fresh()->cover_public_id);
    }

    public function test_deleting_a_playlist_deletes_its_uploaded_cover_but_a_playlist_without_one_calls_nothing(): void
    {
        [$user, $headers] = $this->account();
        $withCover = $this->personalPlaylist($user, ['cover_url' => 'https://res.cloudinary.com/demo/c.png', 'cover_public_id' => 'cover-to-delete']);
        $mock = $this->mock(CloudinaryService::class, function (MockInterface $mock): void {
            $mock->shouldReceive('deleteImage')->once()->with('cover-to-delete');
        });

        $this->deleteJson('/api/v1/me/playlists/'.$withCover->getKey(), [], $headers)->assertOk();
        $this->assertNull(Playlist::query()->find($withCover->getKey()));

        $plain = $this->personalPlaylist($user);
        $this->deleteJson('/api/v1/me/playlists/'.$plain->getKey(), [], $headers)->assertOk();
        $mock->shouldHaveReceived('deleteImage')->once();
    }

    public function test_the_same_person_reporting_the_same_song_twice_creates_one_report(): void
    {
        $song = $this->song('Reported');
        [, $headers] = $this->account();
        $payload = ['reason' => 'copyright', 'details' => 'Not theirs'];

        $first = $this->postJson("/api/v1/songs/{$song->slug}/report", $payload, $headers)->assertCreated();
        $second = $this->postJson("/api/v1/songs/{$song->slug}/report", $payload, $headers)->assertOk();

        $this->assertSame($first->json('report_id'), $second->json('report_id'));
        $this->assertSame(1, Report::query()->count());

        // A different reason is a different report.
        $this->postJson("/api/v1/songs/{$song->slug}/report", ['reason' => 'duplicate'], $headers)->assertCreated();
        $this->assertSame(2, Report::query()->count());
    }

    public function test_guests_are_deduplicated_by_address_and_other_accounts_are_not_affected(): void
    {
        $song = $this->song('Guest reported');
        [, $other] = $this->account();

        $this->postJson("/api/v1/songs/{$song->slug}/report", ['reason' => 'other', 'visitor_id' => 'visitor-1'])->assertCreated();
        // Changing the visitor id does not make it a new reporter.
        $this->postJson("/api/v1/songs/{$song->slug}/report", ['reason' => 'other', 'visitor_id' => 'visitor-2'])->assertOk();
        $this->assertSame(1, Report::query()->count());

        $this->postJson("/api/v1/songs/{$song->slug}/report", ['reason' => 'other'], $other)->assertCreated();
        $this->assertSame(2, Report::query()->count());
    }

    public function test_video_reports_are_deduplicated_the_same_way(): void
    {
        $video = SongVideo::query()->create(['title' => 'Video', 'slug' => 'reported-video', 'status' => 'active']);

        $this->postJson('/api/v1/videos/reported-video/report', ['reason' => 'inappropriate'])->assertCreated();
        $this->postJson('/api/v1/videos/reported-video/report', ['reason' => 'inappropriate'])->assertOk();

        $this->assertSame(1, Report::query()->where('target_id', (string) $video->getKey())->count());
    }
}
