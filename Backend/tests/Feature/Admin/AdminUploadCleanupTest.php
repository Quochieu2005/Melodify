<?php

namespace Tests\Feature\Admin;

use App\Models\Admin;
use App\Models\Song;
use App\Models\SongVideo;
use App\Services\CloudinaryService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Mockery\MockInterface;
use Tests\TestCase;

class AdminUploadCleanupTest extends TestCase
{
    private string $prefix;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prefix = 'test_upload_cleanup_'.bin2hex(random_bytes(8)).'_';
        config(['database.default' => 'mongodb', 'database.connections.mongodb.prefix' => $this->prefix]);
        DB::purge('mongodb');
        $this->actingAs(new Admin([
            'name' => 'Cleanup Admin', 'email' => 'cleanup-admin@example.test', 'role' => 'super_admin',
            'status' => 'active', 'is_active' => true,
        ]), 'admin');
    }

    protected function tearDown(): void
    {
        Song::flushEventListeners();
        SongVideo::flushEventListeners();

        try {
            $connection = DB::connection('mongodb');
            if ($connection->getTablePrefix() === $this->prefix && preg_match('/^test_upload_cleanup_[a-f0-9]{16}_$/', $this->prefix)) {
                foreach (['admins', 'admin_notifications', 'logs', 'songs', 'song_audio_files', 'song_videos', 'song_artists', 'song_genres', 'topic_songs', 'playlist_songs', 'lyrics', 'artists'] as $collection) {
                    $connection->getCollection($collection)->drop();
                }
            }
            DB::purge('mongodb');
        } finally {
            parent::tearDown();
        }
    }

    public function test_song_files_sent_to_cloudinary_are_deleted_when_saving_the_song_fails(): void
    {
        $this->mock(CloudinaryService::class, function (MockInterface $mock): void {
            $mock->shouldReceive('datedPublicId')->andReturn('test/dated');
            $mock->shouldReceive('uploadImage')->once()->andReturn(['secure_url' => 'https://res.cloudinary.com/demo/image/upload/c.jpg', 'public_id' => 'test/cover']);
            $mock->shouldReceive('uploadAudio')->once()->andReturn(['secure_url' => 'https://res.cloudinary.com/demo/video/upload/a.mp3', 'public_id' => 'test/audio', 'duration' => 120]);
            $mock->shouldReceive('deleteAudio')->once()->with('test/audio');
            $mock->shouldReceive('deleteImage')->once()->with('test/cover');
        });
        Song::creating(function (): void {
            throw new \LogicException('database is down');
        });

        $this->post(route('admin.songs.store'), [
            'title' => 'Orphan Check',
            'slug' => 'orphan-check-'.bin2hex(random_bytes(3)),
            'artist_name' => 'Test Artist',
            'status' => 'draft',
            'audio_file' => UploadedFile::fake()->create('a.mp3', 500, 'audio/mpeg'),
            'cover_image_file' => UploadedFile::fake()->image('c.jpg', 700, 700),
        ])->assertStatus(500);

        $this->assertSame(0, Song::query()->count());
    }

    public function test_a_video_uploaded_by_the_server_is_deleted_when_saving_fails(): void
    {
        $this->mock(CloudinaryService::class, function (MockInterface $mock): void {
            $mock->shouldReceive('uploadVideo')->once()->andReturn(['secure_url' => 'https://res.cloudinary.com/demo/video/upload/v.mp4', 'public_id' => 'melodify/videos/v1']);
            $mock->shouldReceive('deleteVideo')->once()->with('melodify/videos/v1');
        });
        SongVideo::saving(function (): void {
            throw new \LogicException('database is down');
        });

        $this->post(route('admin.videos.store'), [
            'title' => 'Orphan Video',
            'status' => 'active',
            'video_file' => UploadedFile::fake()->create('v.mp4', 500, 'video/mp4'),
        ])->assertSessionHasErrors('video_file');

        $this->assertSame(0, SongVideo::query()->count());
    }

    public function test_a_direct_browser_upload_is_kept_when_saving_fails_so_the_resubmit_can_reuse_it(): void
    {
        $this->mock(CloudinaryService::class, function (MockInterface $mock): void {
            $mock->shouldReceive('verifySignedVideoUpload')->once()->andReturn(['secure_url' => 'https://res.cloudinary.com/demo/video/upload/v2.mp4', 'public_id' => 'melodify/videos/v2']);
            $mock->shouldReceive('deleteVideo')->never();
        });
        SongVideo::saving(function (): void {
            throw new \LogicException('database is down');
        });

        $this->post(route('admin.videos.store'), [
            'title' => 'Direct Upload Video',
            'status' => 'active',
            'cloudinary_video_public_id' => 'melodify/videos/v2',
            'cloudinary_video_expected_public_id' => 'v2',
            'cloudinary_video_version' => 5,
            'cloudinary_video_signature' => str_repeat('a', 40),
            'cloudinary_video_format' => 'mp4',
        ])->assertSessionHasErrors('video_file');
    }
}
