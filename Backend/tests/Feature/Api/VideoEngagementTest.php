<?php

namespace Tests\Feature\Api;

use App\Models\Report;
use App\Models\SongVideo;
use App\Models\User;
use App\Models\UserApiToken;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Tests\TestCase;

class VideoEngagementTest extends TestCase
{
    private string $testPrefix;

    protected function setUp(): void
    {
        parent::setUp();
        $this->testPrefix = 'test_video_'.bin2hex(random_bytes(8)).'_';
        config([
            'database.connections.mongodb.prefix' => $this->testPrefix,
            'cache.stores.file.path' => storage_path('framework/cache/testing/'.$this->testPrefix),
            'cache.stores.file.lock_path' => storage_path('framework/cache/testing/'.$this->testPrefix),
        ]);
        Cache::forgetDriver('file');
        DB::purge('mongodb');
    }

    protected function tearDown(): void
    {
        try {
            $connection = DB::connection('mongodb');
            if ($connection->getTablePrefix() === $this->testPrefix && preg_match('/^test_video_[a-f0-9]{16}_$/', $this->testPrefix)) {
                foreach (['song_videos', 'video_favorites', 'reports', 'users', 'user_api_tokens', 'admin_notifications', 'logs'] as $collection) {
                    $connection->getCollection($collection)->drop();
                }
            }
            DB::purge('mongodb');
        } finally {
            Cache::store('file')->flush();
            parent::tearDown();
        }
    }

    public function test_video_catalog_and_detail_return_source_and_engagement_metadata(): void
    {
        $visitorId = (string) Str::uuid();
        $video = $this->createVideo();
        $youtubeVideo = $this->createVideo([
            'title' => 'YouTube Video',
            'slug' => 'youtube-video',
            'source' => 'youtube',
            'external_id' => 'youtube123',
            'video_url' => null,
        ]);

        $this->getJson('/api/v1/videos?visitor_id='.$visitorId.'&per_page=10&q=Video%20One')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.slug', 'video-one')
            ->assertJsonPath('data.0.can_download', true)
            ->assertJsonPath('data.0.view_count', 0)
            ->assertJsonPath('data.0.favorite_count', 0)
            ->assertJsonPath('data.0.share_count', 0);

        $this->getJson('/api/v1/videos/video-one?visitor_id='.$visitorId)
            ->assertOk()
            ->assertJsonPath('data.id', (string) $video->getKey())
            ->assertJsonPath('data.artists.0.name', 'Artist One')
            ->assertJsonPath('data.is_favorite', false)
            ->assertHeader('Cache-Control', 'no-store, private');

        $this->getJson('/api/v1/videos/'.$youtubeVideo->slug)
            ->assertOk()
            ->assertJsonPath('data.player_type', 'youtube')
            ->assertJsonPath('data.embed_url', 'https://www.youtube.com/embed/youtube123')
            ->assertJsonPath('data.can_download', false);
    }

    public function test_video_favorite_view_share_and_report_endpoints_work(): void
    {
        $visitorId = (string) Str::uuid();
        $video = $this->createVideo();
        $user = User::query()->create([
            'name' => 'Video Favorite User',
            'username' => 'video-favorite-user',
            'email' => 'video-favorite@example.test',
            'status' => 'active',
        ]);
        $plainToken = Str::random(64);
        UserApiToken::query()->create([
            'user_id' => (string) $user->getKey(),
            'name' => 'video-engagement-test',
            'token_hash' => hash('sha256', $plainToken),
            'expires_at' => now()->addHour(),
        ]);
        $authHeaders = ['Authorization' => 'Bearer '.$plainToken];

        $this->postJson('/api/v1/videos/video-one/favorite', ['favorited' => true])
            ->assertUnauthorized();

        $this->postJson('/api/v1/videos/video-one/favorite', ['favorited' => true], $authHeaders)
            ->assertOk()
            ->assertJsonPath('favorited', true)
            ->assertJsonPath('favorites', 1);
        $this->postJson('/api/v1/videos/video-one/favorite', ['favorited' => true], $authHeaders)
            ->assertOk()
            ->assertJsonPath('favorites', 1);
        $this->getJson('/api/v1/videos/video-one?visitor_id='.$visitorId, $authHeaders)
            ->assertJsonPath('data.is_favorite', true)
            ->assertJsonPath('data.favorite_count', 1);
        $this->postJson('/api/v1/videos/video-one/favorite', ['favorited' => false], $authHeaders)
            ->assertOk()
            ->assertJsonPath('favorited', false)
            ->assertJsonPath('favorites', 0);
        $this->assertDatabaseCount('video_favorites', 0, 'mongodb');

        $this->postJson('/api/v1/videos/video-one/view', ['visitor_id' => $visitorId])
            ->assertOk()
            ->assertJsonPath('recorded', true)
            ->assertJsonPath('views', 1);
        $this->postJson('/api/v1/videos/video-one/view', ['visitor_id' => $visitorId])
            ->assertOk()
            ->assertJsonPath('recorded', false)
            ->assertJsonPath('views', 1);
        $this->assertSame(1, (int) $video->fresh()->view_count);

        $this->postJson('/api/v1/videos/video-one/share', ['visitor_id' => $visitorId, 'source' => 'facebook'])
            ->assertOk()
            ->assertJsonPath('recorded', true)
            ->assertJsonPath('shares', 1);

        $report = $this->postJson('/api/v1/videos/video-one/report', [
            'visitor_id' => $visitorId,
            'reason' => 'incorrect_information',
            'details' => 'Tên nghệ sĩ không đúng.',
        ])->assertCreated()->assertJsonPath('message', 'Đã gửi báo cáo video.');

        $storedReport = Report::query()->find($report->json('report_id'));
        $this->assertNotNull($storedReport);
        $this->assertSame('video', $storedReport->target_type);
        $this->assertSame((string) $video->getKey(), $storedReport->target_id);
        $this->assertSame('pending', $storedReport->status);
    }

    public function test_video_download_streams_a_file_and_youtube_download_is_rejected(): void
    {
        $this->createVideo([
            'title' => 'Video tải thử',
            'slug' => 'video-download',
            'video_url' => 'https://cdn.example.test/video-download.mp4',
        ]);
        $this->createVideo([
            'title' => 'YouTube Video',
            'slug' => 'youtube-video',
            'source' => 'youtube',
            'external_id' => 'youtube123',
            'video_url' => null,
        ]);

        Http::fake([
            'https://cdn.example.test/*' => Http::response('video-content', 200, ['Content-Type' => 'video/mp4']),
        ]);

        $download = $this->get('/api/v1/videos/video-download/download');
        $download->assertOk()
            ->assertStreamed()
            ->assertHeader('Content-Type', 'video/mp4');
        $this->assertStringContainsString('attachment;', (string) $download->headers->get('Content-Disposition'));
        $download->assertStreamedContent('video-content');

        $this->getJson('/api/v1/videos/youtube-video/download')->assertUnprocessable();
    }

    public function test_video_download_never_fetches_internal_addresses_for_admin_typed_urls(): void
    {
        Http::fake();
        foreach (['http://127.0.0.1:8080/secret', 'http://10.0.0.5/internal.mp4', 'http://169.254.169.254/latest/meta-data', 'http://localhost/x.mp4'] as $index => $url) {
            $this->createVideo(['slug' => "internal-{$index}", 'title' => "Internal {$index}", 'source' => 'admin_url', 'video_url' => $url]);

            $this->getJson("/api/v1/videos/internal-{$index}/download")->assertUnprocessable();
        }

        Http::assertNothingSent();
    }

    public function test_video_download_does_not_follow_a_public_url_that_redirects_to_an_internal_one(): void
    {
        $this->createVideo(['slug' => 'redirecting', 'title' => 'Redirecting', 'source' => 'admin_url', 'video_url' => 'https://cdn.example.test/redirect.mp4']);
        Http::fake(['https://cdn.example.test/*' => Http::response('', 302, ['Location' => 'http://169.254.169.254/latest/meta-data'])]);

        $this->getJson('/api/v1/videos/redirecting/download')->assertUnprocessable();

        Http::assertSentCount(1);
        Http::assertNotSent(fn ($request): bool => str_contains($request->url(), '169.254.169.254'));
    }

    public function test_video_download_hands_a_safe_redirect_to_the_browser_instead_of_following_it(): void
    {
        $this->createVideo(['slug' => 'moved', 'title' => 'Moved', 'source' => 'admin_url', 'video_url' => 'https://cdn.example.test/old.mp4']);
        Http::fake(['https://cdn.example.test/old.mp4' => Http::response('', 302, ['Location' => 'https://cdn.example.test/new.mp4'])]);

        $this->get('/api/v1/videos/moved/download')->assertRedirect('https://cdn.example.test/new.mp4');
        Http::assertSentCount(1);
    }

    /** @param array<string, mixed> $overrides */
    private function createVideo(array $overrides = []): SongVideo
    {
        return SongVideo::query()->create(array_merge([
            'title' => 'Video One',
            'slug' => 'video-one',
            'source' => 'cloudinary',
            'video_url' => 'https://cdn.example.test/video-one.mp4',
            'thumbnail_url' => 'https://cdn.example.test/video-one.jpg',
            'duration_seconds' => 210,
            'view_count' => 0,
            'favorite_count' => 0,
            'share_count' => 0,
            'artist_ids' => ['artist-one'],
            'artists' => [['id' => 'artist-one', 'name' => 'Artist One']],
            'status' => 'active',
            'sort_order' => 1,
        ], $overrides));
    }
}
