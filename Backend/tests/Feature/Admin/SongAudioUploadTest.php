<?php

namespace Tests\Feature\Admin;

use App\Models\Admin;
use App\Models\Lyric;
use App\Models\Playlist;
use App\Models\PlaylistSong;
use App\Models\Song;
use App\Models\SongAudioFile;
use App\Services\CloudinaryService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Mockery\MockInterface;
use Tests\TestCase;

class SongAudioUploadTest extends TestCase
{
    private string $testPrefix;

    protected function setUp(): void
    {
        parent::setUp();
        $this->testPrefix = 'test_song_audio_'.bin2hex(random_bytes(8)).'_';
        config(['database.connections.mongodb.prefix' => $this->testPrefix]);
        DB::purge('mongodb');
    }

    protected function tearDown(): void
    {
        try {
            $connection = DB::connection('mongodb');
            if ($connection->getTablePrefix() === $this->testPrefix && preg_match('/^test_song_audio_[a-f0-9]{16}_$/', $this->testPrefix)) {
                foreach (['admins', 'logs', 'songs', 'song_audio_files', 'song_artists', 'artists', 'topics', 'topic_songs', 'genres', 'song_genres', 'playlists', 'playlist_songs', 'lyrics'] as $collection) {
                    $connection->getCollection($collection)->drop();
                }
            }
            DB::purge('mongodb');
        } finally {
            parent::tearDown();
        }
    }

    public function test_admin_can_upload_full_audio_on_create_and_replace_it_on_edit_for_all_catalog_apis(): void
    {
        $slug = 'upload-flow-'.bin2hex(random_bytes(4));
        $this->actingAs(new Admin([
            'name' => 'Audio Admin',
            'email' => 'audio-admin@example.test',
            'role' => 'super_admin',
            'status' => 'active',
            'is_active' => true,
        ]), 'admin');

        $this->get(route('admin.songs.create'))
            ->assertOk()
            ->assertSee('enctype="multipart/form-data"', false)
            ->assertSee('name="audio_file"', false)
            ->assertSee('name="cover_image_file"', false)
            ->assertSee('data-song-audio-metadata-status', false);

        $cloudinary = $this->mock(CloudinaryService::class, function (MockInterface $mock): void {
            $mock->shouldReceive('datedPublicId')->twice()->andReturn('test/first', 'test/second');
            $mock->shouldReceive('uploadAudio')->twice()->andReturn(
                ['secure_url' => 'https://res.cloudinary.com/demo/video/upload/first.mp3', 'public_id' => 'test/first', 'duration' => 201],
                ['secure_url' => 'https://res.cloudinary.com/demo/video/upload/second.m4a', 'public_id' => 'test/second', 'duration' => 245],
            );
            $mock->shouldReceive('deleteAudio')->once()->with('test/first');
        });

        $this->post(route('admin.songs.store'), [
            'title' => 'Upload Flow Song',
            'slug' => $slug,
            'artist_name' => 'Test Artist',
            'status' => 'published',
            'audio_file' => UploadedFile::fake()->create('first.m4a', 500, 'video/mp4'),
        ])->assertRedirect(route('admin.songs.index'));

        $song = Song::query()->where('slug', $slug)->firstOrFail();
        $this->assertSame(201, (int) $song->duration_seconds);
        $audio = SongAudioFile::query()->where('song_id', (string) $song->getKey())->firstOrFail();
        $this->assertSame('cloudinary', $audio->source);
        $this->assertSame('https://res.cloudinary.com/demo/video/upload/first.mp3', $audio->file_url);

        $this->get(route('admin.songs.edit', $song->getKey()))
            ->assertOk()
            ->assertSee('enctype="multipart/form-data"', false)
            ->assertSee('name="audio_file"', false)
            ->assertSee('https://res.cloudinary.com/demo/video/upload/first.mp3', false);

        $this->getJson('/api/v1/songs/'.$slug)
            ->assertOk()
            ->assertJsonPath('data.audio_url', 'https://res.cloudinary.com/demo/video/upload/first.mp3')
            ->assertJsonPath('data.duration_seconds', 201)
            ->assertJsonPath('data.audio_quality', null)
            ->assertJsonPath('data.audio_qualities', []);
        $this->getJson('/api/v1/search?q=Upload%20Flow&type=song')
            ->assertOk()
            ->assertJsonPath('data.song.0.audio_url', 'https://res.cloudinary.com/demo/video/upload/first.mp3');
        $playlist = Playlist::query()->create([
            'name' => 'Upload Flow Playlist',
            'slug' => $slug.'-playlist',
            'status' => 'active',
            'visibility' => 'public',
        ]);
        PlaylistSong::query()->create([
            'playlist_id' => (string) $playlist->getKey(),
            'song_id' => (string) $song->getKey(),
            'position' => 1,
        ]);
        $this->getJson('/api/v1/playlists/'.$playlist->slug)
            ->assertOk()
            ->assertJsonPath('data.songs.0.audio_url', 'https://res.cloudinary.com/demo/video/upload/first.mp3');

        $this->post(route('admin.songs.update', $song->getKey()), [
            '_method' => 'PUT',
            'title' => 'Upload Flow Song',
            'slug' => $slug,
            'artist_name' => 'Test Artist',
            'status' => 'published',
            'audio_file' => UploadedFile::fake()->create('second.m4a', 650, 'video/mp4'),
        ])->assertRedirect(route('admin.songs.index'));

        $audio->refresh();
        $this->assertSame('https://res.cloudinary.com/demo/video/upload/second.m4a', $audio->file_url);
        $this->assertSame(245, (int) $song->fresh()->duration_seconds);

        $this->getJson('/api/v1/songs/'.$slug)
            ->assertOk()
            ->assertJsonPath('data.audio_url', 'https://res.cloudinary.com/demo/video/upload/second.m4a')
            ->assertJsonPath('data.duration_seconds', 245)
            ->assertJsonPath('data.audio_quality', null)
            ->assertJsonPath('data.audio_qualities', []);
        $this->getJson('/api/v1/search?q=Upload%20Flow&type=song')
            ->assertOk()
            ->assertJsonPath('data.song.0.audio_url', 'https://res.cloudinary.com/demo/video/upload/second.m4a');
        $this->getJson('/api/v1/playlists/'.$playlist->slug)
            ->assertOk()
            ->assertJsonPath('data.songs.0.audio_url', 'https://res.cloudinary.com/demo/video/upload/second.m4a');
        $this->get('/api/v1/songs/'.$slug.'/audio')->assertRedirect('https://res.cloudinary.com/demo/video/upload/second.m4a');

        $this->post(route('admin.songs.update', $song->getKey()), [
            '_method' => 'PUT',
            'title' => 'Upload Flow Song',
            'slug' => $slug,
            'artist_name' => 'Test Artist',
            'status' => 'published',
        ])->assertRedirect(route('admin.songs.index'));
        $this->assertSame(
            'https://res.cloudinary.com/demo/video/upload/second.m4a',
            SongAudioFile::query()->where('song_id', (string) $song->getKey())->firstOrFail()->file_url,
        );

        $importedSong = Song::query()->create([
            'title' => 'Imported Audio Override',
            'slug' => $slug.'-nct',
            'external_id' => 'NCT123456',
            'external_source' => 'nhaccuatui',
            'status' => 'published',
        ]);
        SongAudioFile::query()->create([
            'song_id' => (string) $importedSong->getKey(),
            'file_type' => 'full',
            'file_url' => 'https://res.cloudinary.com/demo/video/upload/import-override.mp3',
            'source' => 'cloudinary',
            'stream_options' => [[
                'qualityId' => 'stale-vip', 'label' => 'Lossless', 'premiumOnly' => true,
                'streamUrl' => 'https://audio.example.test/stale-vip',
            ]],
            'status' => 'active',
        ]);
        $this->getJson('/api/v1/songs/'.$importedSong->slug)
            ->assertOk()
            ->assertJsonPath('data.audio_url', 'https://res.cloudinary.com/demo/video/upload/import-override.mp3')
            ->assertJsonPath('data.audio_quality', null)
            ->assertJsonPath('data.audio_qualities', []);
        $this->get('/api/v1/songs/'.$importedSong->slug.'/audio')
            ->assertRedirect('https://res.cloudinary.com/demo/video/upload/import-override.mp3');
    }

    public function test_admin_can_create_multiple_manual_songs_and_open_the_song_index(): void
    {
        $this->actingAs(new Admin([
            'name' => 'Song Admin',
            'email' => 'song-admin@example.test',
            'role' => 'super_admin',
            'status' => 'active',
            'is_active' => true,
        ]), 'admin');

        foreach (['Manual Song One', 'Manual Song Two'] as $index => $title) {
            $this->post(route('admin.songs.store'), [
                'title' => $title,
                'slug' => 'manual-song-'.($index + 1).'-'.bin2hex(random_bytes(4)),
                'status' => 'published',
            ])->assertRedirect(route('admin.songs.index'));
        }

        $this->get(route('admin.songs.index'))
            ->assertOk()
            ->assertSee('Danh sách bài hát')
            ->assertSee('Manual Song One')
            ->assertSee('Manual Song Two');
    }

    public function test_admin_can_choose_and_stream_vip_quality_from_the_lyrics_preview(): void
    {
        Http::preventStrayRequests();
        $this->actingAs(new Admin([
            'name' => 'Lyrics Audio Admin',
            'email' => 'lyrics-audio-admin@example.test',
            'role' => 'super_admin',
            'status' => 'active',
            'is_active' => true,
        ]), 'admin');

        $slug = 'lyrics-quality-'.bin2hex(random_bytes(4));
        $song = Song::query()->create([
            'title' => 'Lyrics Quality Preview',
            'slug' => $slug,
            'artist_name' => 'Test Artist',
            'external_source' => 'nhaccuatui',
            'external_id' => 'NctLyricsPreview123',
            'status' => 'published',
        ]);
        SongAudioFile::query()->create([
            'song_id' => (string) $song->getKey(),
            'file_type' => 'full',
            'file_url' => 'https://audio.example.test/default.mp3',
            'source' => 'nhaccuatui',
            'external_id' => 'NctLyricsPreview123',
            'premium_only' => true,
            'status' => 'active',
        ]);
        Lyric::query()->create([
            'song_id' => (string) $song->getKey(),
            'plain_lyrics' => 'Test lyric',
            'synced_lyrics' => '[00:00.00]Test lyric',
            'content' => 'Test lyric',
            'is_synced' => true,
        ]);

        Http::fake([
            '*song/detail/NctLyricsPreview123' => Http::response([
                'code' => 0,
                'data' => [
                    'key' => 'NctLyricsPreview123',
                    'name' => 'Lyrics Quality Preview',
                    'qualityDownload' => [
                        ['key' => '320', 'name' => '320 kbps', 'value' => 320, 'onlyVIP' => false],
                        ['key' => 'lossless', 'name' => 'Lossless', 'value' => 512, 'onlyVIP' => true],
                        ['key' => 'unavailable', 'name' => 'Lossless 2', 'onlyVIP' => true],
                    ],
                    'streamURL' => [
                        ['type' => '320', 'stream' => 'https://audio.example.test/320.mp3', 'status' => 1],
                        ['type' => 'lossless', 'stream' => 'https://audio.example.test/lossless.flac', 'download' => 'https://audio.example.test/download-lossless.flac', 'onlyVIP' => true, 'status' => 0],
                    ],
                ],
            ]),
            'https://audio.example.test/lossless.flac' => Http::response('fLaC', 206, [
                'Content-Type' => 'audio/flac', 'Content-Range' => 'bytes 0-3/20', 'Accept-Ranges' => 'bytes',
            ]),
            'https://audio.example.test/download-lossless.flac' => Http::response('fLaC', 200, ['Content-Type' => 'audio/flac']),
        ]);

        $this->get(route('admin.songs.lyrics', $song->getKey()))
            ->assertOk()
            ->assertSee('Chất lượng nghe thử')
            ->assertSee('320 kbps')
            ->assertSee('Lossless · VIP')
            ->assertSee('NCT chưa cấp luồng phát');

        $audio = SongAudioFile::query()->where('song_id', (string) $song->getKey())->firstOrFail();
        $this->assertTrue($audio->premium_only);
        $lossless = collect($audio->stream_options)->firstWhere('label', 'Lossless');
        $this->assertTrue($lossless['available']);
        $this->assertTrue($lossless['premiumOnly']);
        $qualityId = $lossless['qualityId'];

        $catalog = $this->getJson('/api/v1/songs/'.$slug)->assertOk();
        $publicLossless = collect($catalog->json('data.audio_qualities'))->firstWhere('label', 'Lossless');
        $this->assertTrue($publicLossless['available']);
        $this->assertTrue($publicLossless['premium_only']);
        $this->assertStringContainsString('quality_id='.$qualityId, $publicLossless['audio_url']);
        $this->assertStringContainsString('download=1', $publicLossless['download_url']);
        $this->assertStringNotContainsString('audio.example.test', $catalog->getContent());

        $this->withHeader('Range', 'bytes=0-3')
            ->get(route('admin.songs.audio', ['song' => $song->getKey(), 'quality_id' => $qualityId]))
            ->assertStatus(206)
            ->assertHeader('Content-Type', 'audio/flac')
            ->assertHeader('Content-Range', 'bytes 0-3/20')
            ->assertStreamedContent('fLaC');

        $this->get(route('admin.songs.audio', ['song' => $song->getKey(), 'quality_id' => $qualityId, 'download' => 1]))
            ->assertOk()
            ->assertHeader('Content-Disposition', 'attachment; filename="melodify-audio"')
            ->assertStreamedContent('fLaC');
        Http::assertSentCount(3);
    }

    public function test_song_cover_image_upload_is_saved_on_create_and_edit_and_returned_by_catalog_api(): void
    {
        $slug = 'cover-upload-'.bin2hex(random_bytes(4));
        $this->actingAs(new Admin([
            'name' => 'Cover Admin',
            'email' => 'cover-admin@example.test',
            'role' => 'super_admin',
            'status' => 'active',
            'is_active' => true,
        ]), 'admin');

        $this->mock(CloudinaryService::class, function (MockInterface $mock): void {
            $mock->shouldReceive('datedPublicId')->twice()->andReturn('test/cover-first', 'test/cover-second');
            $mock->shouldReceive('uploadImage')->twice()->andReturn(
                ['secure_url' => 'https://res.cloudinary.com/demo/image/upload/cover-first.jpg', 'public_id' => 'test/cover-first'],
                ['secure_url' => 'https://res.cloudinary.com/demo/image/upload/cover-second.jpg', 'public_id' => 'test/cover-second'],
            );
            $mock->shouldReceive('deleteImage')->once()->with('test/cover-first');
        });

        $this->post(route('admin.songs.store'), [
            'title' => 'Cover Upload Song',
            'slug' => $slug,
            'artist_name' => 'Test Artist',
            'status' => 'published',
            'cover_image_file' => UploadedFile::fake()->image('embedded-cover.jpg'),
        ])->assertRedirect(route('admin.songs.index'));

        $song = Song::query()->where('slug', $slug)->firstOrFail();
        $this->assertSame('https://res.cloudinary.com/demo/image/upload/cover-first.jpg', $song->cover_url);
        $this->assertSame('test/cover-first', $song->cover_public_id);
        $this->getJson('/api/v1/songs/'.$slug)
            ->assertOk()
            ->assertJsonPath('data.cover_url', 'https://res.cloudinary.com/demo/image/upload/cover-first.jpg');

        $this->post(route('admin.songs.update', $song->getKey()), [
            '_method' => 'PUT',
            'title' => 'Cover Upload Song',
            'slug' => $slug,
            'artist_name' => 'Test Artist',
            'status' => 'published',
            'cover_url' => $song->cover_url,
            'cover_image_file' => UploadedFile::fake()->image('replacement-cover.jpg'),
        ])->assertRedirect(route('admin.songs.index'));

        $this->assertSame('https://res.cloudinary.com/demo/image/upload/cover-second.jpg', $song->fresh()->cover_url);
        $this->getJson('/api/v1/songs/'.$slug)
            ->assertOk()
            ->assertJsonPath('data.cover_url', 'https://res.cloudinary.com/demo/image/upload/cover-second.jpg');
    }
}
