<?php

namespace Tests\Feature\Api;

use App\Models\Album;
use App\Models\Favorite;
use App\Models\Genre;
use App\Models\Playlist;
use App\Models\Song;
use App\Models\SongGenre;
use App\Models\SongPlayEvent;
use App\Models\SongShare;
use App\Models\SongVideo;
use App\Models\User;
use App\Models\UserApiToken;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;
use Tests\TestCase;

class CatalogHardeningTest extends TestCase
{
    private string $prefix;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prefix = 'test_catalog_hard_'.bin2hex(random_bytes(8)).'_';
        config(['database.connections.mongodb.prefix' => $this->prefix]);
        DB::purge('mongodb');
        Cache::store('file')->put('api:catalog-content-revision:v1', 'test-'.bin2hex(random_bytes(4)));
    }

    protected function tearDown(): void
    {
        try {
            $connection = DB::connection('mongodb');
            if ($connection->getTablePrefix() === $this->prefix && preg_match('/^test_catalog_hard_[a-f0-9]{16}_$/', $this->prefix)) {
                foreach (['songs', 'albums', 'genres', 'song_genres', 'playlists', 'favorites', 'song_play_events', 'song_shares', 'album_shares', 'playlist_shares', 'song_videos', 'users', 'user_api_tokens', 'artists'] as $collection) {
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

    private function song(string $title): Song
    {
        return Song::query()->create(['title' => $title, 'slug' => Str::slug($title).'-'.Str::lower(Str::random(4)), 'status' => 'published']);
    }

    private function cacheFileCount(): int
    {
        return count(glob(Cache::store('file')->getStore()->getDirectory().'/*/*/*') ?: []);
    }

    public function test_public_catalog_lists_ignore_made_up_query_parameters_so_they_cannot_fill_the_cache(): void
    {
        Genre::query()->create(['name' => 'Pop', 'slug' => 'pop', 'status' => 'active', 'sort_order' => 1]);
        $before = $this->cacheFileCount();

        $first = $this->getJson('/api/v1/genres')->assertOk()->json();
        $afterFirst = $this->cacheFileCount();
        foreach (range(1, 15) as $i) {
            $this->getJson('/api/v1/genres?junk='.$i.'&x'.$i.'=1')->assertOk()->assertJson($first);
        }
        $afterJunk = $this->cacheFileCount();

        $this->assertGreaterThan($before, $afterFirst, 'the first request was cached');
        $this->assertSame($afterFirst, $afterJunk, 'fifteen requests with made-up parameters reused that cache entry');
    }

    public function test_real_parameters_still_change_the_cached_answer(): void
    {
        foreach (['Alpha Genre', 'Beta Genre'] as $i => $name) {
            Genre::query()->create(['name' => $name, 'slug' => Str::slug($name), 'status' => 'active', 'sort_order' => $i + 1]);
        }

        $this->getJson('/api/v1/genres')->assertOk()->assertJsonCount(2, 'data');
        $this->getJson('/api/v1/genres?q=Alpha')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.name', 'Alpha Genre');
        $this->getJson('/api/v1/genres?per_page=1')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('meta.last_page', 2);
    }

    public function test_topic_genre_and_album_song_counts_are_correct_when_counted_in_mongodb(): void
    {
        $pop = Genre::query()->create(['name' => 'Pop', 'slug' => 'pop', 'status' => 'active', 'sort_order' => 1]);
        $rock = Genre::query()->create(['name' => 'Rock', 'slug' => 'rock', 'status' => 'active', 'sort_order' => 2]);
        $album = Album::query()->create(['title' => 'Counted Album', 'slug' => 'counted-album', 'status' => 'published', 'sort_order' => 1]);
        foreach (['One', 'Two', 'Three'] as $title) {
            $song = Song::query()->create(['title' => $title, 'slug' => Str::lower($title), 'status' => 'published', 'album_id' => (string) $album->getKey()]);
            SongGenre::query()->create(['song_id' => (string) $song->getKey(), 'genre_id' => (string) $pop->getKey()]);
        }

        $genres = collect($this->getJson('/api/v1/genres')->assertOk()->json('data'))->keyBy('slug');
        $this->assertSame(3, (int) ($genres['pop']['song_count'] ?? $genres['pop']['songs_count'] ?? -1));
        $this->assertSame(0, (int) ($genres['rock']['song_count'] ?? $genres['rock']['songs_count'] ?? -1));
        $this->assertSame((string) $rock->getKey(), (string) $genres['rock']['id']);

        $albumRow = collect($this->getJson('/api/v1/albums')->assertOk()->json('data'))->firstWhere('slug', 'counted-album');
        $this->assertSame(3, (int) ($albumRow['song_count'] ?? $albumRow['songs_count'] ?? -1));
    }

    public function test_the_favorites_list_counts_how_many_accounts_favorited_each_song(): void
    {
        [$me, $headers] = $this->account();
        [$other] = $this->account();
        [$third] = $this->account();
        $popular = $this->song('Popular');
        $quiet = $this->song('Quiet');
        foreach ([$me, $other, $third] as $user) {
            Favorite::query()->create(['user_id' => (string) $user->getKey(), 'song_id' => (string) $popular->getKey()]);
        }
        Favorite::query()->create(['user_id' => (string) $me->getKey(), 'song_id' => (string) $quiet->getKey()]);

        $rows = collect($this->getJson('/api/v1/favorites/songs', $headers)->assertOk()->json('data'))->keyBy('title');

        $this->assertSame(3, $rows['Popular']['favorite_count']);
        $this->assertSame(1, $rows['Quiet']['favorite_count']);
        $this->assertTrue($rows['Popular']['is_favorite']);
    }

    public function test_reordering_favorites_saves_the_new_order_with_one_bulk_write(): void
    {
        [$user, $headers] = $this->account();
        $songs = array_map(fn (string $t): Song => $this->song($t), ['A', 'B', 'C']);
        foreach ($songs as $song) {
            Favorite::query()->create(['user_id' => (string) $user->getKey(), 'song_id' => (string) $song->getKey()]);
        }
        $order = [(string) $songs[2]->getKey(), (string) $songs[0]->getKey(), (string) $songs[1]->getKey()];

        $this->postJson('/api/v1/favorites/songs/reorder', ['song_ids' => $order], $headers)->assertOk()->assertJsonPath('ordered', true);

        $saved = Favorite::query()->where('user_id', (string) $user->getKey())->orderBy('sort_order')->pluck('song_id')->map(fn ($id): string => (string) $id)->all();
        $this->assertSame($order, $saved);
        $this->postJson('/api/v1/favorites/songs/reorder', ['song_ids' => array_slice($order, 0, 2)], $headers)->assertStatus(422);
    }

    public function test_the_same_visitor_replaying_a_song_within_seconds_counts_once(): void
    {
        $song = $this->song('Replayed');
        $visitor = (string) Str::uuid();

        $this->postJson("/api/v1/songs/{$song->slug}/view", ['visitor_id' => $visitor])->assertOk()->assertJsonPath('recorded', true);
        $this->postJson("/api/v1/songs/{$song->slug}/view", ['visitor_id' => $visitor])->assertOk()->assertJsonPath('recorded', false);

        $this->assertSame(1, SongPlayEvent::query()->where('song_id', (string) $song->getKey())->count());
    }

    public function test_a_script_that_sends_a_new_visitor_id_every_time_is_capped_per_address(): void
    {
        $song = $this->song('Inflate me');

        foreach (range(1, 30) as $ignored) {
            $this->postJson("/api/v1/songs/{$song->slug}/view", ['visitor_id' => (string) Str::uuid()])->assertOk();
        }

        // Real visitors on a shared address are still counted (up to the cap), but a script cannot go beyond it.
        $this->assertSame(20, SongPlayEvent::query()->where('song_id', (string) $song->getKey())->count());
    }

    public function test_the_same_visitor_sharing_the_same_thing_twice_counts_once_per_channel(): void
    {
        $song = $this->song('Shared');
        Album::query()->create(['title' => 'Shared Album', 'slug' => 'shared-album', 'status' => 'published']);
        Playlist::query()->create(['name' => 'Shared Playlist', 'slug' => 'shared-playlist', 'status' => 'active', 'visibility' => 'public']);
        $video = SongVideo::query()->create(['title' => 'Shared Video', 'slug' => 'shared-video', 'status' => 'active', 'share_count' => 0]);
        $visitor = (string) Str::uuid();

        foreach ([
            "/api/v1/songs/{$song->slug}/share",
            '/api/v1/albums/shared-album/share',
            '/api/v1/playlists/shared-playlist/share',
            '/api/v1/videos/shared-video/share',
        ] as $url) {
            $this->postJson($url, ['source' => 'facebook', 'visitor_id' => $visitor])->assertOk()->assertJsonPath('recorded', true)->assertJsonPath('shares', 1);
            $this->postJson($url, ['source' => 'facebook', 'visitor_id' => $visitor])->assertOk()->assertJsonPath('recorded', false)->assertJsonPath('shares', 1);
        }
        // Another channel is another share.
        $this->postJson("/api/v1/songs/{$song->slug}/share", ['source' => 'copy_link', 'visitor_id' => $visitor])->assertOk()->assertJsonPath('recorded', true)->assertJsonPath('shares', 2);

        $this->assertSame(2, SongShare::query()->where('song_id', (string) $song->getKey())->count());
        $this->assertSame(1, (int) $video->fresh()->share_count);
    }

    public function test_a_script_that_rotates_visitor_ids_cannot_inflate_shares_beyond_the_address_cap(): void
    {
        $song = $this->song('Share flood');

        foreach (range(1, 25) as $ignored) {
            $this->postJson("/api/v1/songs/{$song->slug}/share", ['source' => 'facebook', 'visitor_id' => (string) Str::uuid()])->assertOk();
        }

        $this->assertSame(10, SongShare::query()->where('song_id', (string) $song->getKey())->count());
    }

    public function test_public_catalog_reads_are_rate_limited_per_visitor(): void
    {
        $names = ['topics.index', 'topics.show', 'genres.index', 'genres.show', 'banners.index', 'albums.index', 'albums.show', 'artists.index', 'artists.show', 'playlists.index', 'playlists.show', 'charts.index', 'charts.show', 'songs.index', 'songs.show', 'songs.lyrics', 'videos.index', 'videos.show', 'home.bootstrap'];
        foreach ($names as $name) {
            $route = Route::getRoutes()->getByName('api.v1.'.$name);
            $this->assertNotNull($route, $name);
            $this->assertContains('throttle:240,1,catalog', $route->gatherMiddleware(), $name);
        }
    }
}
