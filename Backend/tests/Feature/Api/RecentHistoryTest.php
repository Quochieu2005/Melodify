<?php

namespace Tests\Feature\Api;

use App\Models\Album;
use App\Models\Artist;
use App\Models\Playlist;
use App\Models\PlaylistSong;
use App\Models\RecentItem;
use App\Models\Song;
use App\Models\SongVideo;
use App\Models\User;
use App\Models\UserApiToken;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class RecentHistoryTest extends TestCase
{
    private string $prefix;

    private string $visitor;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prefix = 'test_recent_'.bin2hex(random_bytes(8)).'_';
        config(['database.connections.mongodb.prefix' => $this->prefix]);
        DB::purge('mongodb');
        $this->visitor = (string) Str::uuid();
    }

    protected function tearDown(): void
    {
        try {
            $connection = DB::connection('mongodb');
            if ($connection->getTablePrefix() === $this->prefix && preg_match('/^test_recent_[a-f0-9]{16}_$/', $this->prefix)) {
                foreach (['recent_items', 'songs', 'albums', 'artists', 'playlists', 'playlist_songs', 'song_videos', 'users', 'user_api_tokens', 'favorites', 'playlist_favorites', 'album_favorites'] as $collection) {
                    $connection->getCollection($collection)->drop();
                }
            }
            DB::purge('mongodb');
        } finally {
            parent::tearDown();
        }
    }

    /** @return array<string, string> */
    private function login(): array
    {
        $name = 'u'.Str::lower(Str::random(6));
        $user = User::query()->create(['name' => $name, 'username' => $name, 'slug' => $name, 'email' => $name.'@example.test', 'password' => 'x', 'status' => 'active', 'is_premium' => 0]);
        $plain = Str::random(64);
        UserApiToken::query()->create(['user_id' => (string) $user->getKey(), 'token_hash' => hash('sha256', $plain), 'expires_at' => now()->addDay()]);
        $this->userId = (string) $user->getKey();

        return ['Authorization' => 'Bearer '.$plain];
    }

    private string $userId = '';

    private function song(string $title, array $extra = []): Song
    {
        return Song::query()->create($extra + ['title' => $title, 'slug' => Str::slug($title).'-'.Str::lower(Str::random(4)), 'status' => 'published', 'artist_name' => 'Ca si']);
    }

    private function record(string $category, string $id, array $headers = []): TestResponse
    {
        $this->app['auth']->forgetGuards();

        return $this->postJson('/api/v1/me/recent', ['category' => $category, 'id' => $id, 'visitor_id' => $this->visitor], $headers);
    }

    private function list(array $headers = [], string $query = ''): array
    {
        $this->app['auth']->forgetGuards();

        return $this->getJson('/api/v1/me/recent?visitor_id='.$this->visitor.$query, $headers)->assertOk()->json('data');
    }

    public function test_every_kind_of_page_is_remembered_and_listed_newest_first_with_catalog_data(): void
    {
        $artist = Artist::query()->create(['name' => 'Ca si A', 'slug' => 'ca-si-a', 'status' => 'active', 'avatar_url' => 'https://example.test/a.jpg']);
        $album = Album::query()->create(['title' => 'Album Moi', 'slug' => 'album-moi', 'status' => 'published', 'artist_id' => (string) $artist->getKey(), 'cover_url' => 'https://example.test/al.jpg']);
        $playlist = Playlist::query()->create(['name' => 'List Chung', 'slug' => 'list-chung', 'status' => 'active', 'visibility' => 'public']);
        PlaylistSong::query()->create(['playlist_id' => (string) $playlist->getKey(), 'song_id' => 'x1', 'position' => 1]);
        $video = SongVideo::query()->create(['title' => 'Video Hay', 'slug' => 'video-hay', 'status' => 'active', 'thumbnail_url' => 'https://example.test/v.jpg', 'artists' => [['name' => 'Ca si A']]]);
        $song = $this->song('Bai Hat');

        foreach ([['song', $song], ['playlist', $playlist], ['album', $album], ['artist', $artist], ['video', $video]] as [$category, $model]) {
            $this->record($category, (string) $model->getKey())->assertOk()->assertJsonPath('recorded', true);
        }

        $items = $this->list();

        $this->assertSame(['video', 'artist', 'album', 'playlist', 'song'], array_column($items, 'category'));
        $byCategory = array_column($items, null, 'category');
        $this->assertSame('Bai Hat', $byCategory['song']['title']);
        $this->assertSame('Ca si', $byCategory['song']['subtitle']);
        $this->assertSame('Ca si A', $byCategory['album']['subtitle']);
        $this->assertSame('1 bài hát', $byCategory['playlist']['subtitle']);
        $this->assertSame('video-hay', $byCategory['video']['slug']);
        $this->assertSame('Ca si A', $byCategory['video']['subtitle']);
        $this->assertSame(['song'], array_column($this->list([], '&category=song'), 'category'));
    }

    public function test_opening_something_again_moves_it_to_the_top_without_a_duplicate(): void
    {
        $first = $this->song('Dau tien');
        $second = $this->song('Thu hai');
        $this->record('song', (string) $first->getKey())->assertOk();
        $this->record('song', (string) $second->getKey())->assertOk();
        $this->record('song', (string) $first->getKey())->assertOk();

        $titles = array_column($this->list(), 'title');

        $this->assertSame(['Dau tien', 'Thu hai'], $titles);
        $this->assertSame(2, RecentItem::query()->where('actor_id', $this->visitor)->count());
    }

    public function test_only_something_that_exists_and_anyone_can_open_is_remembered(): void
    {
        $blocked = $this->song('Bi chan', ['status' => 'blocked']);
        $private = Playlist::query()->create(['name' => 'Rieng', 'slug' => 'rieng', 'status' => 'active', 'visibility' => 'private']);

        $this->record('song', (string) $blocked->getKey())->assertNotFound();
        $this->record('playlist', (string) $private->getKey())->assertNotFound();
        $this->record('song', 'not-a-real-id')->assertNotFound();
        $this->postJson('/api/v1/me/recent', ['category' => 'radio', 'id' => 'x', 'visitor_id' => $this->visitor])->assertStatus(422);

        $this->assertSame([], $this->list());
    }

    public function test_an_item_the_catalog_no_longer_shows_drops_out_of_the_list(): void
    {
        $kept = $this->song('Con lai');
        $gone = $this->song('Se bi chan');
        $this->record('song', (string) $kept->getKey())->assertOk();
        $this->record('song', (string) $gone->getKey())->assertOk();
        $gone->update(['status' => 'blocked']);

        $this->assertSame(['Con lai'], array_column($this->list(), 'title'));
    }

    public function test_only_the_newest_hundred_are_kept(): void
    {
        $now = now();
        $rows = [];
        for ($i = 0; $i < 105; $i++) {
            $rows[] = ['actor_id' => $this->visitor, 'category' => 'song', 'item_id' => 'old-'.$i, 'played_at' => $now->copy()->subMinutes(200 - $i)];
        }
        RecentItem::query()->insert($rows);
        $song = $this->song('Moi nhat');

        $this->record('song', (string) $song->getKey())->assertOk();

        $this->assertSame(100, RecentItem::query()->where('actor_id', $this->visitor)->count());
        $this->assertSame(1, RecentItem::query()->where('actor_id', $this->visitor)->where('item_id', (string) $song->getKey())->count());
        $this->assertSame(0, RecentItem::query()->where('actor_id', $this->visitor)->where('item_id', 'old-0')->count());
    }

    public function test_selected_items_are_deleted_only_from_the_callers_own_history_and_category(): void
    {
        $song = $this->song('Bai');
        $album = Album::query()->create(['title' => 'Alb', 'slug' => 'alb', 'status' => 'published']);
        $this->record('song', (string) $song->getKey())->assertOk();
        $this->record('album', (string) $album->getKey())->assertOk();
        $otherVisitor = (string) Str::uuid();
        RecentItem::query()->create(['actor_id' => $otherVisitor, 'category' => 'song', 'item_id' => (string) $song->getKey(), 'played_at' => now()]);

        $this->deleteJson('/api/v1/me/recent', ['category' => 'song', 'ids' => [(string) $song->getKey()], 'visitor_id' => $this->visitor])
            ->assertOk()->assertJsonPath('deleted', 1);

        $this->assertSame(['album'], array_column($this->list(), 'category'));
        $this->assertSame(1, RecentItem::query()->where('actor_id', $otherVisitor)->count(), "someone else's history is untouched");
    }

    public function test_an_account_and_a_visitor_have_separate_histories_and_login_merges_the_visitors(): void
    {
        $headers = $this->login();
        $accountSong = $this->song('Cua tai khoan');
        $visitorSong = $this->song('Cua khach');
        $both = $this->song('Ca hai');
        $this->postJson('/api/v1/me/recent', ['category' => 'song', 'id' => (string) $accountSong->getKey()], $headers)->assertOk();
        $this->postJson('/api/v1/me/recent', ['category' => 'song', 'id' => (string) $both->getKey()], $headers)->assertOk();
        $this->record('song', (string) $visitorSong->getKey())->assertOk();
        $this->record('song', (string) $both->getKey())->assertOk();

        $this->assertSame(['Ca hai', 'Cua khach'], array_column($this->list(), 'title'), 'the visitor sees only the visitor history');
        $this->assertSame(['Ca hai', 'Cua tai khoan'], array_column($this->list($headers), 'title'));

        $this->postJson('/api/v1/me/library/import', ['visitor_id' => $this->visitor], $headers)->assertOk();
        $this->app['auth']->forgetGuards();

        $this->assertSame(['Ca hai', 'Cua khach', 'Cua tai khoan'], array_column($this->list($headers), 'title'));
        $this->assertSame(0, RecentItem::query()->where('actor_id', $this->visitor)->count());
    }

    public function test_without_a_visitor_id_or_an_account_nothing_is_stored_or_listed(): void
    {
        $song = $this->song('Bai');

        $this->postJson('/api/v1/me/recent', ['category' => 'song', 'id' => (string) $song->getKey()])->assertStatus(422);
        $this->getJson('/api/v1/me/recent')->assertOk()->assertJsonPath('data', []);
    }
}
