<?php

namespace Tests\Feature\Admin;

use App\Models\Admin;
use App\Models\Album;
use App\Models\Artist;
use App\Models\Genre;
use App\Models\Playlist;
use App\Models\PlaylistSong;
use App\Models\Song;
use App\Models\SongArtist;
use App\Models\SongGenre;
use App\Models\Topic;
use App\Models\TopicSong;
use App\Services\CatalogGroupService;
use App\Support\CatalogRevision;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AdminPerformanceTest extends TestCase
{
    private string $prefix;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prefix = 'test_admin_perf_'.bin2hex(random_bytes(8)).'_';
        config(['database.default' => 'mongodb', 'database.connections.mongodb.prefix' => $this->prefix]);
        DB::purge('mongodb');
        $this->actingAs(new Admin([
            'name' => 'Perf Admin', 'email' => 'perf-admin@example.test', 'role' => 'super_admin',
            'status' => 'active', 'is_active' => true,
        ]), 'admin');
    }

    protected function tearDown(): void
    {
        try {
            $connection = DB::connection('mongodb');
            if ($connection->getTablePrefix() === $this->prefix && preg_match('/^test_admin_perf_[a-f0-9]{16}_$/', $this->prefix)) {
                foreach (['admins', 'admin_notifications', 'logs', 'songs', 'artists', 'albums', 'genres', 'topics', 'playlists', 'song_artists', 'song_genres', 'topic_songs', 'playlist_songs', 'banners'] as $collection) {
                    $connection->getCollection($collection)->drop();
                }
            }
            DB::purge('mongodb');
        } finally {
            parent::tearDown();
        }
    }

    public function test_the_songs_list_shows_artist_album_genres_topics_and_playlists_from_a_single_lookup(): void
    {
        $primary = Artist::query()->create(['name' => 'Primary Artist', 'slug' => 'primary-artist', 'status' => 'active']);
        $featured = Artist::query()->create(['name' => 'Featured Artist', 'slug' => 'featured-artist', 'status' => 'active']);
        $pop = Genre::query()->create(['name' => 'Pop', 'slug' => 'pop', 'status' => 'active']);
        $rock = Genre::query()->create(['name' => 'Rock', 'slug' => 'rock', 'status' => 'active']);
        $chill = Topic::query()->create(['name' => 'Chill', 'slug' => 'chill', 'status' => 'active']);
        $focus = Topic::query()->create(['name' => 'Focus', 'slug' => 'focus', 'status' => 'active']);
        $listB = Playlist::query()->create(['name' => 'List B', 'slug' => 'list-b', 'status' => 'active']);
        $listA = Playlist::query()->create(['name' => 'List A', 'slug' => 'list-a', 'status' => 'active']);
        $album = Album::query()->create(['title' => 'Great Album', 'slug' => 'great-album', 'status' => 'published']);

        $full = Song::query()->create(['title' => 'Full Song', 'slug' => 'full-song', 'status' => 'published', 'album_id' => (string) $album->getKey()]);
        $fullId = (string) $full->getKey();
        // The featured credit is stored first: the primary one must still win.
        SongArtist::query()->create(['song_id' => $fullId, 'artist_id' => (string) $featured->getKey(), 'artist_role' => 'featured']);
        SongArtist::query()->create(['song_id' => $fullId, 'artist_id' => (string) $primary->getKey(), 'artist_role' => 'primary']);
        SongGenre::query()->create(['song_id' => $fullId, 'genre_id' => (string) $pop->getKey()]);
        SongGenre::query()->create(['song_id' => $fullId, 'genre_id' => (string) $rock->getKey()]);
        TopicSong::query()->create(['song_id' => $fullId, 'topic_id' => (string) $chill->getKey(), 'position' => 2]);
        TopicSong::query()->create(['song_id' => $fullId, 'topic_id' => (string) $focus->getKey(), 'position' => 1]);
        PlaylistSong::query()->create(['song_id' => $fullId, 'playlist_id' => (string) $listB->getKey(), 'position' => 2]);
        PlaylistSong::query()->create(['song_id' => $fullId, 'playlist_id' => (string) $listA->getKey(), 'position' => 1]);

        $typed = Song::query()->create(['title' => 'Typed Song', 'slug' => 'typed-song', 'status' => 'published', 'artist_name' => 'Typed Name']);

        // Links and an album that point at records that no longer exist must not break the page.
        $dangling = Song::query()->create(['title' => 'Dangling Song', 'slug' => 'dangling-song', 'status' => 'published', 'album_id' => '64b64b64b64b64b64b64b64b']);
        SongArtist::query()->create(['song_id' => (string) $dangling->getKey(), 'artist_id' => '64b64b64b64b64b64b64b64c', 'artist_role' => 'primary']);
        SongGenre::query()->create(['song_id' => (string) $dangling->getKey(), 'genre_id' => 'not-an-object-id']);

        $rows = collect($this->get(route('admin.songs.index'))->assertOk()->viewData('rows'))
            ->keyBy(fn (array $row): string => (string) $row['song']->getKey());

        $this->assertSame('Primary Artist', $rows[$fullId]['artist']);
        $this->assertSame('Great Album', $rows[$fullId]['album']);
        $this->assertSame('Pop, Rock', $rows[$fullId]['genre']);
        $this->assertSame('Focus, Chill', $rows[$fullId]['topic'], 'ordered by position');
        $this->assertSame('List A, List B', $rows[$fullId]['playlist'], 'ordered by position');

        $typedRow = $rows[(string) $typed->getKey()];
        $this->assertSame('Typed Name', $typedRow['artist'], 'the typed artist name wins over links');
        $this->assertNull($typedRow['album']);
        $this->assertSame('', $typedRow['genre']);

        $danglingRow = $rows[(string) $dangling->getKey()];
        $this->assertNull($danglingRow['artist']);
        $this->assertNull($danglingRow['album']);
        $this->assertSame('', $danglingRow['genre']);
    }

    public function test_sidebar_menu_data_is_kept_in_the_per_server_file_cache_not_the_shared_one(): void
    {
        config(['cache.default' => 'array']);
        Cache::store('file')->forget('catalog-custom-types:'.md5(Playlist::class));
        Playlist::query()->create(['name' => 'Custom group', 'slug' => 'custom-group', 'type' => 'custom', 'type_custom' => 'Fresh Group', 'status' => 'active']);

        $names = app(CatalogGroupService::class)->customTypeNames(Playlist::class)->all();

        $this->assertSame(['Fresh Group'], $names);
        $this->assertNotNull(Cache::store('file')->get('catalog-custom-types:'.md5(Playlist::class)));
        $this->assertNull(Cache::store('array')->get('catalog-custom-types:'.md5(Playlist::class)), 'not in the default store, which is MongoDB in production');
        Cache::store('file')->forget('catalog-custom-types:'.md5(Playlist::class));
    }

    public function test_an_admin_edit_warms_the_public_home_cache_for_the_new_revision(): void
    {
        $this->withoutDefer();
        $genre = Genre::query()->create(['name' => 'Warm', 'slug' => 'warm', 'status' => 'active', 'sort_order' => 1]);
        $before = Cache::store('file')->get(CatalogRevision::KEY);

        $this->put(route('admin.genres.update', $genre->getKey()), ['name' => 'Warm', 'slug' => 'warm', 'status' => 'active', 'sort_order' => 1])
            ->assertRedirect();

        $revision = Cache::store('file')->get(CatalogRevision::KEY);
        $this->assertNotSame($before, $revision, 'the edit bumps the catalog revision');
        $dateKey = now(config('app.timezone', 'Asia/Ho_Chi_Minh'))->toDateString();
        $this->assertTrue(
            Cache::store('file')->has('api:home-bootstrap:v21:'.$dateKey.':'.$revision),
            'the home bootstrap for the new revision is already cached when the first visitor arrives',
        );
    }
}
