<?php

namespace Tests\Feature\Api;

use App\Models\Artist;
use App\Models\Genre;
use App\Models\Song;
use App\Models\SongArtist;
use App\Models\SongAudioFile;
use App\Models\SongGenre;
use App\Models\User;
use App\Models\UserApiToken;
use App\Models\UserUploadStage;
use App\Services\CloudinaryService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Mockery;
use Mockery\MockInterface;
use Tests\TestCase;

class UserUploadControllerTest extends TestCase
{
    private string $testPrefix;

    protected function setUp(): void
    {
        parent::setUp();
        $this->testPrefix = 'test_user_upload_'.bin2hex(random_bytes(8)).'_';
        config(['database.connections.mongodb.prefix' => $this->testPrefix]);
        DB::purge('mongodb');
    }

    protected function tearDown(): void
    {
        try {
            $connection = DB::connection('mongodb');
            if ($connection->getTablePrefix() === $this->testPrefix && preg_match('/^test_user_upload_[a-f0-9]{16}_$/', $this->testPrefix)) {
                foreach (['users', 'user_api_tokens', 'songs', 'song_audio_files', 'artists', 'genres', 'song_artists', 'song_genres', 'user_upload_stages'] as $collection) {
                    $connection->getCollection($collection)->drop();
                }
            }
            DB::purge('mongodb');
        } finally {
            parent::tearDown();
        }
    }

    public function test_upload_and_list_require_authentication(): void
    {
        $this->getJson('/api/v1/me/uploads')->assertUnauthorized();
        $this->post('/api/v1/me/uploads', [
            'title' => 'Unauthenticated song',
            'audio_file' => UploadedFile::fake()->create('song.mp3', 20, 'audio/mpeg'),
        ], ['Accept' => 'application/json'])->assertUnauthorized();
        $this->post('/api/v1/me/uploads/stage', [
            'audio_file' => UploadedFile::fake()->create('song.mp3', 20, 'audio/mpeg'),
        ], ['Accept' => 'application/json'])->assertUnauthorized();
    }

    public function test_audio_stage_upload_reports_a_token_before_song_metadata_is_created(): void
    {
        [$user, $headers] = $this->account('Stage Upload Owner');
        $this->mock(CloudinaryService::class, function (MockInterface $mock): void {
            $mock->shouldReceive('datedPublicId')->once()->with('demo-song-staged-audio')->andReturn('demo-song-staged-audio-2026-10-23');
            $mock->shouldReceive('uploadAudio')->once()->with(
                Mockery::type(UploadedFile::class),
                'melodify/audio',
                Mockery::pattern('/^demo-song-staged-audio-2026-10-23-[a-z0-9]{12}$/'),
            )->andReturn([
                'secure_url' => 'https://res.cloudinary.com/example/video/upload/staged.m4a',
                'public_id' => 'melodify/audio/staged-m4a',
                'duration' => 184.2,
            ]);
        });

        $response = $this->post('/api/v1/me/uploads/stage', [
            'audio_file' => UploadedFile::fake()->create('demo-song.m4a', 120, 'audio/mp4'),
        ], ['Accept' => 'application/json', ...$headers]);

        $response->assertCreated()
            ->assertJsonPath('data.file_name', 'demo-song.m4a')
            ->assertJsonPath('data.duration_seconds', 184);
        $this->assertNotEmpty($response->json('data.upload_token'));
        $this->assertSame(0, Song::query()->where('uploaded_by_user_id', (string) $user->getKey())->count());
        $this->assertSame(1, UserUploadStage::query()->where('user_id', (string) $user->getKey())->count());
    }

    public function test_staged_audio_is_reused_when_song_metadata_is_submitted(): void
    {
        [$user, $headers] = $this->account('Stage Finalize Owner');
        $genre = Genre::query()->create(['name' => 'Pop', 'slug' => 'pop', 'status' => 'active']);
        $stage = UserUploadStage::query()->create([
            'user_id' => (string) $user->getKey(),
            'file_name' => 'staged-track.m4a',
            'file_size' => 120,
            'file_url' => 'https://res.cloudinary.com/example/video/upload/staged-track.m4a',
            'public_id' => 'melodify/audio/staged-track',
            'duration_seconds' => 202,
            'expires_at' => now()->addHours(2),
        ]);
        $this->mock(CloudinaryService::class, function (MockInterface $mock): void {
            $mock->shouldReceive('datedPublicId')->once()->with(Mockery::pattern('/^staged-song-[a-z0-9]{8}-cover$/'))->andReturn('staged-song-cover-id');
            $mock->shouldNotReceive('uploadAudio');
            $mock->shouldNotReceive('deleteAudio');
            $mock->shouldReceive('uploadImage')->once()->with(
                Mockery::type(UploadedFile::class),
                'melodify/covers',
                Mockery::pattern('/^staged-song-cover-id-[a-z0-9]{8}$/'),
            )->andReturn([
                'secure_url' => 'https://res.cloudinary.com/example/image/upload/staged-cover.png',
                'public_id' => 'melodify/covers/staged-cover',
            ]);
        });

        $this->post('/api/v1/me/uploads', [
            'title' => 'Staged song',
            'artist_name' => 'Stage Artist',
            'genre_id' => (string) $genre->getKey(),
            'audio_upload_token' => (string) $stage->getKey(),
            'terms_accepted' => '1',
            'moderation_requested' => '1',
            'cover_image_file' => UploadedFile::fake()->image('cover.png', 640, 640),
        ], ['Accept' => 'application/json', ...$headers])->assertCreated()
            ->assertJsonPath('data.audio_url', 'https://res.cloudinary.com/example/video/upload/staged-track.m4a')
            ->assertJsonPath('data.duration_seconds', 202);

        $this->assertSame(0, UserUploadStage::query()->where('user_id', (string) $user->getKey())->count());
        $this->assertSame(1, SongAudioFile::query()->where('public_id', 'melodify/audio/staged-track')->count());
    }

    public function test_user_upload_is_saved_as_draft_with_audio_and_shown_in_their_list(): void
    {
        [$user, $headers] = $this->account('Upload Owner');
        $artist = Artist::query()->create(['name' => 'Upload Artist', 'slug' => 'upload-artist', 'status' => 'active']);
        $genre = Genre::query()->create(['name' => 'Remix Việt', 'slug' => 'remix-viet', 'status' => 'active']);
        $this->mock(CloudinaryService::class, function (MockInterface $mock): void {
            $mock->shouldReceive('datedPublicId')->twice()->andReturn('track-full-audio-2026-10-23', 'track-cover-2026-10-23');
            $mock->shouldReceive('uploadAudio')->once()->with(
                Mockery::type(UploadedFile::class),
                'melodify/audio',
                Mockery::type('string'),
            )->andReturn([
                'secure_url' => 'https://res.cloudinary.com/example/video/upload/track.m4a',
                'public_id' => 'melodify/audio/track',
                'duration' => 214.4,
            ]);
            $mock->shouldReceive('uploadImage')->once()->with(
                Mockery::type(UploadedFile::class),
                'melodify/covers',
                Mockery::type('string'),
            )->andReturn([
                'secure_url' => 'https://res.cloudinary.com/example/image/upload/cover.png',
                'public_id' => 'melodify/covers/track',
            ]);
        });

        $response = $this->post('/api/v1/me/uploads', [
            'title' => 'Bài hát người dùng tải lên',
            'artist_name' => 'Upload Artist',
            'artist_id' => (string) $artist->getKey(),
            'genre_id' => (string) $genre->getKey(),
            'terms_accepted' => '1',
            'moderation_requested' => '1',
            'audio_file' => UploadedFile::fake()->create('my-track.m4a', 120, 'audio/mp4'),
            'cover_image_file' => UploadedFile::fake()->image('cover.png', 640, 640),
        ], ['Accept' => 'application/json', ...$headers]);

        $response->assertCreated()
            ->assertJsonPath('data.title', 'Bài hát người dùng tải lên')
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.artist_name', 'Upload Artist')
            ->assertJsonPath('data.cover_url', 'https://res.cloudinary.com/example/image/upload/cover.png')
            ->assertJsonPath('data.audio_url', 'https://res.cloudinary.com/example/video/upload/track.m4a')
            ->assertJsonPath('data.duration_seconds', 214);

        $song = Song::query()->where('uploaded_by_user_id', (string) $user->getKey())->firstOrFail();
        $this->assertSame('draft', $song->status);
        $audio = SongAudioFile::query()->where('song_id', (string) $song->getKey())->firstOrFail();
        $this->assertSame('active', $audio->status);
        $this->assertSame('cloudinary', $audio->source);
        $this->assertSame(1, SongArtist::query()->where('song_id', (string) $song->getKey())->where('artist_id', (string) $artist->getKey())->count());
        $this->assertSame(1, SongGenre::query()->where('song_id', (string) $song->getKey())->where('genre_id', (string) $genre->getKey())->count());
    }

    public function test_upload_rejects_unsupported_files_without_calling_cloudinary(): void
    {
        [, $headers] = $this->account('Invalid Upload');
        $cloudinary = $this->mock(CloudinaryService::class);
        $cloudinary->shouldNotReceive('uploadAudio');
        $cloudinary->shouldNotReceive('uploadImage');

        $this->post('/api/v1/me/uploads', [
            'title' => 'Not audio',
            'artist_name' => 'Test Artist',
            'genre_id' => 'missing-genre',
            'terms_accepted' => '1',
            'moderation_requested' => '1',
            'audio_file' => UploadedFile::fake()->create('document.pdf', 20, 'application/pdf'),
            'cover_image_file' => UploadedFile::fake()->image('cover.png', 640, 640),
        ], ['Accept' => 'application/json', ...$headers])->assertUnprocessable()->assertJsonValidationErrors('audio_file');

        $this->assertSame(0, Song::query()->count());
    }

    public function test_upload_list_is_private_and_reports_total_count(): void
    {
        [$owner, $ownerHeaders] = $this->account('Owner Account');
        [, $strangerHeaders] = $this->account('Other Account');
        Song::query()->create([
            'title' => 'My private upload',
            'slug' => 'my-private-upload',
            'status' => 'draft',
            'uploaded_by_user_id' => (string) $owner->getKey(),
        ]);
        SongAudioFile::query()->create([
            'song_id' => (string) Song::query()->where('slug', 'my-private-upload')->value('_id'),
            'file_type' => 'full',
            'file_url' => 'https://res.cloudinary.com/example/video/upload/private-track.mp3',
            'status' => 'active',
        ]);
        Song::query()->create([
            'title' => 'Someone else upload',
            'slug' => 'someone-else-upload',
            'status' => 'draft',
            'uploaded_by_user_id' => 'another-user-id',
        ]);

        $this->getJson('/api/v1/me/uploads', $ownerHeaders)->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('meta.limit', 200)
            ->assertJsonPath('data.0.title', 'My private upload')
            ->assertJsonPath('data.0.audio_url', 'https://res.cloudinary.com/example/video/upload/private-track.mp3')
            ->assertJsonMissing(['title' => 'Someone else upload']);
        $this->getJson('/api/v1/me/uploads', $strangerHeaders)->assertOk()
            ->assertJsonPath('meta.total', 0)
            ->assertJsonCount(0, 'data');
    }

    public function test_user_cannot_upload_more_than_two_hundred_songs(): void
    {
        [$user, $headers] = $this->account('Full Upload Account');
        $genre = Genre::query()->create(['name' => 'Pop', 'slug' => 'pop', 'status' => 'active']);
        for ($index = 1; $index <= 200; $index++) {
            Song::query()->create([
                'title' => "Uploaded song {$index}",
                'slug' => "uploaded-song-{$index}",
                'status' => 'draft',
                'uploaded_by_user_id' => (string) $user->getKey(),
            ]);
        }

        $cloudinary = $this->mock(CloudinaryService::class);
        $cloudinary->shouldNotReceive('datedPublicId');
        $cloudinary->shouldNotReceive('uploadAudio');
        $cloudinary->shouldNotReceive('uploadImage');

        $this->post('/api/v1/me/uploads', [
            'title' => 'The 201st upload',
            'artist_name' => 'Test Artist',
            'genre_id' => (string) $genre->getKey(),
            'terms_accepted' => '1',
            'moderation_requested' => '1',
            'audio_file' => UploadedFile::fake()->create('too-many.mp3', 20, 'audio/mpeg'),
            'cover_image_file' => UploadedFile::fake()->image('cover.png', 640, 640),
        ], ['Accept' => 'application/json', ...$headers])->assertUnprocessable()->assertJsonValidationErrors('audio_file');
    }

    /** @return array{User, array{Authorization: string}} */
    private function account(string $name): array
    {
        $user = User::query()->create([
            'name' => $name,
            'username' => Str::slug($name),
            'status' => 'active',
            'email' => Str::slug($name).'@example.test',
            'password' => 'not-a-real-password',
        ]);
        $token = Str::random(64);
        UserApiToken::query()->create([
            'user_id' => (string) $user->getKey(),
            'token_hash' => hash('sha256', $token),
            'expires_at' => now()->addHour(),
        ]);

        return [$user, ['Authorization' => 'Bearer '.$token]];
    }
}
