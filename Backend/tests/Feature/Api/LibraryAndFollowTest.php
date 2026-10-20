<?php

namespace Tests\Feature\Api;

use App\Models\Album;
use App\Models\AlbumFavorite;
use App\Models\Artist;
use App\Models\ArtistViewEvent;
use App\Models\Favorite;
use App\Models\Playlist;
use App\Models\PlaylistFavorite;
use App\Models\Song;
use App\Models\SongArtist;
use App\Models\SongPlayEvent;
use App\Models\User;
use App\Models\UserApiToken;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class LibraryAndFollowTest extends TestCase
{
    private string $testPrefix;

    protected function setUp(): void
    {
        parent::setUp();
        $this->testPrefix = 'test_library_'.bin2hex(random_bytes(8)).'_';
        config(['database.connections.mongodb.prefix' => $this->testPrefix]);
        DB::purge('mongodb');
        Cache::store('file')->put('api:catalog-content-revision:v1', (string) Str::uuid());
    }

    protected function tearDown(): void
    {
        try {
            $connection = DB::connection('mongodb');
            if ($connection->getTablePrefix() === $this->testPrefix && preg_match('/^test_library_[a-f0-9]{16}_$/', $this->testPrefix)) {
                foreach (['users', 'user_api_tokens', 'artists', 'artist_followers', 'artist_view_events', 'user_followers', 'songs', 'song_artists', 'song_play_events', 'favorites', 'albums', 'album_favorites', 'playlists', 'playlist_favorites', 'playlist_songs'] as $collection) {
                    $connection->getCollection($collection)->drop();
                }
            }
            DB::purge('mongodb');
        } finally {
            parent::tearDown();
        }
    }

    private function account(string $name): array
    {
        $user = User::query()->create(['name' => $name, 'username' => Str::slug($name), 'status' => 'active', 'email' => Str::slug($name).'@example.test', 'password' => 'not-a-real-password']);
        $token = Str::random(64);
        UserApiToken::query()->create(['user_id' => (string) $user->getKey(), 'token_hash' => hash('sha256', $token), 'expires_at' => now()->addHour()]);

        return [$user, ['Authorization' => 'Bearer '.$token]];
    }

    public function test_follow_requires_login_is_idempotent_and_updates_both_profiles(): void
    {
        $artist = Artist::query()->create(['name' => 'Test Artist', 'slug' => 'test-artist', 'status' => 'active']);
        [$alice, $aliceHeaders] = $this->account('Alice Test');
        [$bob, $bobHeaders] = $this->account('Bob Test');
        $this->postJson('/api/v1/artists/test-artist/follow', ['following' => true])->assertUnauthorized();
        $this->postJson('/api/v1/artists/test-artist/follow', ['following' => true], $aliceHeaders)->assertOk()->assertJsonPath('followers_count', 1);
        $this->postJson('/api/v1/artists/test-artist/follow', ['following' => true], $aliceHeaders)->assertOk()->assertJsonPath('followers_count', 1);
        $this->postJson('/api/v1/users/'.$bob->getKey().'/follow', ['following' => true, 'user_id' => $bob->getKey()], $aliceHeaders)->assertOk();
        $this->postJson('/api/v1/users/'.$alice->getKey().'/follow', ['following' => true], $aliceHeaders)->assertStatus(422);
        $this->getJson('/api/v1/me/library', $aliceHeaders)->assertOk()->assertJsonPath('data.following_count', 2)->assertJsonPath('data.following_artists.0.id', (string) $artist->getKey());
        $this->getJson('/api/v1/me/library', $bobHeaders)->assertOk()->assertJsonPath('data.followers_count', 1)->assertJsonPath('data.followers.0.id', (string) $alice->getKey());
        $this->getJson('/api/v1/users/'.$bob->getKey(), $aliceHeaders)->assertOk()->assertJsonPath('data.is_following', true)->assertJsonMissingPath('data.email')->assertJsonMissingPath('data.password');
        $this->postJson('/api/v1/artists/test-artist/follow', ['following' => false], $aliceHeaders)->assertOk()->assertJsonPath('followers_count', 0);
        $this->postJson('/api/v1/users/'.$bob->getKey().'/follow', ['following' => false], $aliceHeaders)->assertOk()->assertJsonPath('followers_count', 0);
        $this->getJson('/api/v1/me/library', $aliceHeaders)->assertJsonPath('data.following_count', 0);
    }

    public function test_favorites_import_and_library_are_account_scoped(): void
    {
        [$alice, $headers] = $this->account('Alice Library');
        [, $otherHeaders] = $this->account('Other Library');
        $visitor = (string) Str::uuid();
        $song = Song::query()->create(['title' => 'Library Song', 'slug' => 'library-song', 'status' => 'published']);
        $album = Album::query()->create(['title' => 'Library Album', 'slug' => 'library-album', 'status' => 'published']);
        $playlist = Playlist::query()->create(['name' => 'Library Playlist', 'slug' => 'library-playlist', 'status' => 'active', 'visibility' => 'public']);
        Favorite::query()->create(['user_id' => $visitor, 'song_id' => (string) $song->getKey()]);
        AlbumFavorite::query()->create(['user_id' => $visitor, 'album_id' => (string) $album->getKey()]);
        PlaylistFavorite::query()->create(['user_id' => $visitor, 'playlist_id' => (string) $playlist->getKey()]);
        $this->postJson('/api/v1/me/library/import', ['visitor_id' => $visitor], $headers)->assertOk();
        $this->postJson('/api/v1/me/library/import', ['visitor_id' => $visitor], $headers)->assertOk();
        $this->getJson('/api/v1/me/library', $headers)->assertOk()->assertJsonPath('data.favorite_song_count', 1)->assertJsonCount(1, 'data.favorite_albums')->assertJsonCount(1, 'data.favorite_playlists');
        $this->getJson('/api/v1/favorites/songs', $headers)->assertOk()->assertJsonPath('data.0.id', (string) $song->getKey());
        $this->getJson('/api/v1/me/library?visitor_id='.$visitor, $otherHeaders)->assertOk()->assertJsonPath('data.favorite_song_count', 0);
        $this->postJson('/api/v1/me/library/import', ['visitor_id' => (string) $alice->getKey()], $otherHeaders)->assertStatus(422);
        $this->postJson('/api/v1/songs/library-song/favorite', ['favorited' => false], $headers)->assertOk();
        $this->getJson('/api/v1/me/library', $headers)->assertJsonPath('data.favorite_song_count', 0);
        Auth::forgetGuards();
        $this->getJson('/api/v1/me/library?visitor_id='.$alice->getKey())->assertStatus(422);
    }

    public function test_private_playlist_is_readable_only_by_owner_and_refreshes_after_add(): void
    {
        [, $headers] = $this->account('Playlist Owner');
        [, $otherHeaders] = $this->account('Playlist Stranger');
        $song = Song::query()->create(['title' => 'Playlist Song', 'slug' => 'playlist-song', 'status' => 'published']);
        $playlist = $this->postJson('/api/v1/me/playlists', ['name' => 'Private Test'], $headers)->assertCreated()->json('data');
        $this->getJson('/api/v1/playlists/'.$playlist['slug'], $headers)->assertOk()->assertJsonPath('data.song_count', 0);
        $this->getJson('/api/v1/playlists/'.$playlist['slug'], $otherHeaders)->assertNotFound();
        $this->postJson('/api/v1/me/playlists/'.$playlist['id'].'/songs', ['song_ids' => [(string) $song->getKey()]], $headers)->assertOk();
        $this->getJson('/api/v1/playlists/'.$playlist['slug'], $headers)->assertOk()->assertJsonPath('data.song_count', 1);
        $this->getJson('/api/v1/me/library', $headers)->assertJsonPath('data.created_playlists.0.song_count', 1);
    }

    public function test_search_normalizes_names_filters_private_records_and_projects_safe_user_fields(): void
    {
        Artist::query()->create(['name' => 'Mr. T', 'slug' => 'mr-t', 'status' => 'active']);
        Song::query()->create(['title' => 'Tâm Tình', 'slug' => 'tam-tinh-thai-hoc', 'status' => 'published']);
        Playlist::query()->create(['name' => 'Hidden Test', 'slug' => 'hidden-test', 'status' => 'active', 'visibility' => 'private']);
        $this->account('Visible User');
        $this->getJson('/api/v1/search?q=mrt&type=artist')
            ->assertOk()
            ->assertJsonPath('data.artist.0.name', 'Mr. T')
            ->assertJsonPath('meta.per_page', 24);
        $this->getJson('/api/v1/search?q=mrt&type=artist&limit=3&suggest=1')
            ->assertOk()
            ->assertJsonPath('meta.per_page', 3)
            ->assertJsonPath('meta.totals', []);
        $this->getJson('/api/v1/search?q=tam%20tinh&type=song')->assertOk()->assertJsonCount(1, 'data.song');
        $this->getJson('/api/v1/search?q=Hidden&type=playlist')->assertOk()->assertJsonCount(0, 'data.playlist');
        $this->getJson('/api/v1/search?q=Visible&type=user')->assertOk()->assertJsonCount(1, 'data.user')->assertJsonMissingPath('data.user.0.email')->assertJsonMissingPath('data.user.0.password');
        $this->getJson('/api/v1/search?q=%5B')->assertOk();
        $this->getJson('/api/v1/search?q=hello&type=invalid')->assertStatus(422);
        $this->getJson('/api/v1/search?q=hello&page=0')->assertStatus(422);
        $this->getJson('/api/v1/search?q=')->assertStatus(422);

    }

    public function test_home_trending_artists_and_featured_songs_use_the_last_seven_days_of_plays(): void
    {
        $this->freezeTime();
        $artistA = Artist::query()->create(['name' => 'Weekly Artist A', 'slug' => 'weekly-artist-a', 'status' => 'active']);
        $artistB = Artist::query()->create(['name' => 'Weekly Artist B', 'slug' => 'weekly-artist-b', 'status' => 'active']);
        $artistC = Artist::query()->create(['name' => 'Weekly Artist C', 'slug' => 'weekly-artist-c', 'status' => 'active']);
        foreach ([$artistA, $artistB, $artistC] as $artist) {
            ArtistViewEvent::query()->create(['artist_id' => (string) $artist->getKey(), 'viewed_at' => now()->subDay()]);
        }
        $songA1 = Song::query()->create(['title' => 'A Song One', 'slug' => 'a-song-one', 'artist_name' => $artistA->name, 'status' => 'published']);
        $songA2 = Song::query()->create(['title' => 'A Song Two', 'slug' => 'a-song-two', 'artist_name' => $artistA->name, 'status' => 'published']);
        $songB = Song::query()->create(['title' => 'B Song', 'slug' => 'b-song', 'artist_name' => $artistB->name, 'status' => 'published']);
        $oldSong = Song::query()->create(['title' => 'Old Song', 'slug' => 'old-song', 'artist_name' => $artistC->name, 'status' => 'published']);
        SongArtist::query()->create(['song_id' => (string) $songA1->getKey(), 'artist_id' => (string) $artistA->getKey()]);
        SongArtist::query()->create(['song_id' => (string) $songA2->getKey(), 'artist_id' => (string) $artistA->getKey()]);
        SongArtist::query()->create(['song_id' => (string) $songB->getKey(), 'artist_id' => (string) $artistB->getKey()]);
        SongArtist::query()->create(['song_id' => (string) $oldSong->getKey(), 'artist_id' => (string) $artistC->getKey()]);

        foreach ([[$songA1, 10, now()->subDay()], [$songA2, 5, now()->subDays(3)], [$songB, 4, now()->subDays(2)], [$oldSong, 30, now()->subDays(8)]] as [$song, $playCount, $startedAt]) {
            for ($play = 0; $play < $playCount; $play++) {
                SongPlayEvent::query()->create(['song_id' => (string) $song->getKey(), 'started_at' => $startedAt, 'completed' => false]);
            }
        }

        $revision = (string) Cache::store('file')->get('api:catalog-content-revision:v1', 'initial');
        $cacheKey = 'api:home-bootstrap:v14:'.now(config('app.timezone', 'Asia/Ho_Chi_Minh'))->toDateString().':'.$revision;
        $trendingCacheKey = 'api:trending-artists:v8:'.now(config('app.timezone', 'Asia/Ho_Chi_Minh'))->toDateString().':'.$revision;
        Cache::store('file')->forget($cacheKey);
        Cache::store('file')->forget($trendingCacheKey);

        try {
            $this->getJson('/api/v1/home/bootstrap')
                ->assertOk()
                ->assertJsonPath('data.trending_artists.0.name', 'Weekly Artist A')
                ->assertJsonPath('data.trending_artists.0.followers_count', 0)
                ->assertJsonPath('data.trending_artists.0.weekly_plays', 15)
                ->assertJsonPath('data.trending_artists.0.featured_song.title', 'A Song One')
                ->assertJsonPath('data.trending_artists.0.featured_song.weekly_plays', 10)
                ->assertJsonPath('data.trending_artists.1.name', 'Weekly Artist B')
                ->assertJsonPath('data.trending_artists.1.weekly_plays', 4)
                ->assertJsonPath('data.trending_artists.0.weekly_views', 1)
                ->assertJsonCount(2, 'data.trending_artists');

            $this->getJson('/api/v1/artists/trending')
                ->assertOk()
                ->assertJsonPath('meta.limit', 50)
                ->assertJsonPath('meta.period_days', 7)
                ->assertJsonPath('meta.total', 2)
                ->assertJsonPath('data.0.name', 'Weekly Artist A')
                ->assertJsonPath('data.0.featured_song.title', 'A Song One');
        } finally {
            Cache::store('file')->forget($cacheKey);
            Cache::store('file')->forget($trendingCacheKey);
        }
    }

    public function test_trending_artists_endpoint_caps_results_at_fifty(): void
    {
        $this->freezeTime();
        for ($index = 0; $index < 55; $index++) {
            $number = str_pad((string) $index, 2, '0', STR_PAD_LEFT);
            $artist = Artist::query()->create([
                'name' => 'Top Artist '.$number,
                'slug' => 'top-artist-'.$number,
                'status' => 'active',
            ]);
            $song = Song::query()->create(['title' => 'Top Song '.$number, 'slug' => 'top-song-'.$number, 'artist_name' => $artist->name, 'status' => 'published']);
            SongArtist::query()->create(['song_id' => (string) $song->getKey(), 'artist_id' => (string) $artist->getKey()]);
            SongPlayEvent::query()->create(['song_id' => (string) $song->getKey(), 'started_at' => now()->subHour()]);
            ArtistViewEvent::query()->create(['artist_id' => (string) $artist->getKey(), 'viewed_at' => now()->subHour()]);
        }

        $cacheKey = 'api:trending-artists:v8:'.now(config('app.timezone', 'Asia/Ho_Chi_Minh'))->toDateString().':'.Cache::store('file')->get('api:catalog-content-revision:v1', 'initial');
        Cache::store('file')->forget($cacheKey);

        try {
            $this->getJson('/api/v1/artists/trending')
                ->assertOk()
                ->assertJsonCount(50, 'data')
                ->assertJsonPath('meta.limit', 50)
                ->assertJsonPath('meta.total', 50);
        } finally {
            Cache::store('file')->forget($cacheKey);
        }
    }

    public function test_trending_artist_credits_are_exact_and_featured_songs_are_not_repeated(): void
    {
        $this->freezeTime();
        $artistA = Artist::query()->create(['name' => 'Credit Artist A', 'slug' => 'credit-artist-a', 'status' => 'active']);
        $artistB = Artist::query()->create(['name' => 'Credit Artist B', 'slug' => 'credit-artist-b', 'status' => 'active']);
        $ghostArtist = Artist::query()->create(['name' => 'Ghost Artist', 'slug' => 'ghost-artist', 'status' => 'active']);
        foreach ([$artistA, $artistB, $ghostArtist] as $artist) {
            ArtistViewEvent::query()->create(['artist_id' => (string) $artist->getKey(), 'viewed_at' => now()->subDay()]);
        }

        $sharedSong = Song::query()->create([
            'title' => 'Shared Track',
            'slug' => 'shared-track',
            'artist_name' => 'Credit Artist A, Credit Artist B',
            'status' => 'published',
        ]);
        $artistASong = Song::query()->create([
            'title' => 'Artist A Solo',
            'slug' => 'artist-a-solo',
            'artist_name' => 'Credit Artist A',
            'status' => 'published',
        ]);
        $artistBSong = Song::query()->create([
            'title' => 'Artist B Solo',
            'slug' => 'artist-b-solo',
            'artist_name' => 'Credit Artist B',
            'status' => 'published',
        ]);
        $unlinkedSong = Song::query()->create([
            'title' => 'Unlinked Composite Credit',
            'slug' => 'unlinked-composite-credit',
            'artist_name' => 'Credit Artist A, Ghost Artist',
            'status' => 'published',
        ]);

        SongArtist::query()->create([
            'song_id' => (string) $sharedSong->getKey(),
            'artist_id' => (string) $artistB->getKey(),
            'artist_role' => 'featured',
        ]);
        SongArtist::query()->create([
            'song_id' => (string) $sharedSong->getKey(),
            'artist_id' => (string) $artistA->getKey(),
            'artist_role' => 'primary',
        ]);
        SongArtist::query()->create([
            'song_id' => (string) $sharedSong->getKey(),
            'artist_id' => (string) $ghostArtist->getKey(),
            'artist_role' => 'featured',
        ]);
        SongArtist::query()->create(['song_id' => (string) $artistASong->getKey(), 'artist_id' => (string) $artistA->getKey(), 'artist_role' => 'primary']);
        SongArtist::query()->create(['song_id' => (string) $artistBSong->getKey(), 'artist_id' => (string) $artistB->getKey(), 'artist_role' => 'primary']);

        foreach ([[$sharedSong, 10], [$artistASong, 6], [$artistBSong, 4], [$unlinkedSong, 20]] as [$song, $plays]) {
            for ($play = 0; $play < $plays; $play++) {
                SongPlayEvent::query()->create([
                    'song_id' => (string) $song->getKey(),
                    'started_at' => now()->subDay(),
                    'completed' => false,
                ]);
            }
        }

        $cacheKey = 'api:trending-artists:v8:'.now(config('app.timezone', 'Asia/Ho_Chi_Minh'))->toDateString().':'.Cache::store('file')->get('api:catalog-content-revision:v1', 'initial');
        Cache::store('file')->forget($cacheKey);

        try {
            $this->getJson('/api/v1/artists/trending')
                ->assertOk()
                ->assertJsonPath('data.0.id', (string) $artistA->getKey())
                ->assertJsonPath('data.0.weekly_plays', 16)
                ->assertJsonPath('data.0.featured_song.id', (string) $sharedSong->getKey())
                ->assertJsonPath('data.0.featured_song.artists.0.name', 'Credit Artist A')
                ->assertJsonPath('data.0.featured_song.artists.1.name', 'Credit Artist B')
                ->assertJsonPath('data.1.id', (string) $artistB->getKey())
                ->assertJsonPath('data.1.weekly_plays', 14)
                ->assertJsonPath('data.1.featured_song.id', (string) $artistBSong->getKey())
                ->assertJsonCount(2, 'data');

            $this->getJson('/api/v1/songs/shared-track')
                ->assertOk()
                ->assertJsonCount(2, 'data.artists')
                ->assertJsonPath('data.artists.0.name', 'Credit Artist A')
                ->assertJsonPath('data.artists.1.name', 'Credit Artist B')
                ->assertJsonPath('data.artist.name', 'Credit Artist A');

            $this->getJson('/api/v1/songs/unlinked-composite-credit')
                ->assertOk()
                ->assertJsonCount(0, 'data.artists');

            $this->getJson('/api/v1/artists/ghost-artist')
                ->assertOk()
                ->assertJsonPath('data.song_count', 0);
        } finally {
            Cache::store('file')->forget($cacheKey);
        }
    }

    public function test_trending_requires_both_recent_signals_and_ranks_their_combined_score(): void
    {
        $this->freezeTime();
        $cases = [
            ['Plays Leader', 'active', 'published', 8, 1, now()->subDay(), now()->subDay()],
            ['Visits Leader', 'active', 'published', 5, 6, now()->subDay(), now()->subDay()],
            ['No Visits', 'active', 'published', 20, 0, now()->subDay(), now()->subDay()],
            ['Old Visits', 'active', 'published', 20, 30, now()->subDay(), now()->subDays(8)],
            ['Future Plays', 'active', 'published', 20, 30, now()->addDay(), now()->subDay()],
            ['Draft Song', 'active', 'draft', 20, 30, now()->subDay(), now()->subDay()],
            ['Inactive Artist', 'inactive', 'published', 20, 30, now()->subDay(), now()->subDay()],
            ['No Plays', 'active', 'published', 0, 30, now()->subDay(), now()->subDay()],
            ['Future Visits', 'active', 'published', 20, 30, now()->subDay(), now()->addDay()],
        ];
        foreach ($cases as [$name, $status, $songStatus, $plays, $views, $playedAt, $viewedAt]) {
            $artist = Artist::query()->create(['name' => $name, 'slug' => Str::slug($name), 'status' => $status]);
            $song = Song::query()->create(['title' => $name.' Song', 'slug' => Str::slug($name).'-song', 'artist_name' => $name, 'status' => $songStatus]);
            SongArtist::query()->create(['song_id' => (string) $song->getKey(), 'artist_id' => (string) $artist->getKey()]);
            if ($plays > 0) {
                SongPlayEvent::query()->insert(array_fill(0, $plays, ['song_id' => (string) $song->getKey(), 'started_at' => $playedAt]));
            }
            if ($views > 0) {
                ArtistViewEvent::query()->insert(array_fill(0, $views, ['artist_id' => (string) $artist->getKey(), 'viewed_at' => $viewedAt]));
            }
        }

        $this->getJson('/api/v1/artists/trending')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.name', 'Visits Leader')
            ->assertJsonPath('data.0.weekly_plays', 5)
            ->assertJsonPath('data.0.weekly_views', 6)
            ->assertJsonPath('data.0.trending_score', 11)
            ->assertJsonPath('data.1.name', 'Plays Leader')
            ->assertJsonPath('data.1.trending_score', 9);
    }

    public function test_missing_distinct_song_is_skipped_before_filling_the_home_limit(): void
    {
        $this->freezeTime();
        $artists = collect();
        for ($index = 1; $index <= 5; $index++) {
            $artist = Artist::query()->create(['name' => 'Artist '.$index, 'slug' => 'artist-'.$index, 'status' => 'active']);
            $artists->push($artist);
            ArtistViewEvent::query()->create(['artist_id' => (string) $artist->getKey(), 'viewed_at' => now()->subHour()]);
        }
        $sharedSong = Song::query()->create(['title' => 'Shared', 'slug' => 'shared', 'artist_name' => 'Artist 1, Artist 2', 'status' => 'published']);
        foreach ($artists->take(2) as $artist) {
            SongArtist::query()->create(['song_id' => (string) $sharedSong->getKey(), 'artist_id' => (string) $artist->getKey()]);
        }
        SongPlayEvent::query()->insert(array_fill(0, 5, ['song_id' => (string) $sharedSong->getKey(), 'started_at' => now()->subHour()]));
        foreach ($artists->skip(2) as $artist) {
            $song = Song::query()->create(['title' => $artist->name.' Solo', 'slug' => $artist->slug.'-solo', 'artist_name' => $artist->name, 'status' => 'published']);
            SongArtist::query()->create(['song_id' => (string) $song->getKey(), 'artist_id' => (string) $artist->getKey()]);
            SongPlayEvent::query()->create(['song_id' => (string) $song->getKey(), 'started_at' => now()->subHour()]);
        }

        $this->getJson('/api/v1/home/bootstrap')
            ->assertOk()
            ->assertJsonCount(4, 'data.trending_artists')
            ->assertJsonPath('data.trending_artists.0.name', 'Artist 1')
            ->assertJsonPath('data.trending_artists.1.name', 'Artist 3')
            ->assertJsonPath('data.trending_artists.3.name', 'Artist 5');
        $this->getJson('/api/v1/artists/trending')->assertJsonCount(4, 'data');
    }

    public function test_catalog_fallback_shows_only_real_published_credited_songs_without_duplicates(): void
    {
        $this->freezeTime();
        $first = Artist::query()->create(['name' => 'Catalog Artist One', 'slug' => 'catalog-artist-one', 'sort_order' => 1, 'status' => 'active']);
        $second = Artist::query()->create(['name' => 'Catalog Artist Two', 'slug' => 'catalog-artist-two', 'sort_order' => 2, 'status' => 'active']);
        $uncredited = Artist::query()->create(['name' => 'Catalog Artist Three', 'slug' => 'catalog-artist-three', 'sort_order' => 3, 'status' => 'active']);
        $shared = Song::query()->create(['title' => 'Real Collaboration', 'slug' => 'real-collaboration', 'artist_name' => 'Catalog Artist One, Catalog Artist Two', 'release_date' => now()->subYear(), 'status' => 'published']);
        $solo = Song::query()->create(['title' => 'Second Artist Solo', 'slug' => 'second-artist-solo', 'artist_name' => $second->name, 'status' => 'published']);
        $newerUnplayed = Song::query()->create(['title' => 'Newer Unplayed Song', 'slug' => 'newer-unplayed-song', 'artist_name' => $first->name, 'release_date' => now(), 'status' => 'published']);
        SongArtist::query()->create(['song_id' => (string) $shared->getKey(), 'artist_id' => (string) $first->getKey()]);
        SongArtist::query()->create(['song_id' => (string) $shared->getKey(), 'artist_id' => (string) $second->getKey()]);
        SongArtist::query()->create(['song_id' => (string) $solo->getKey(), 'artist_id' => (string) $second->getKey()]);
        SongArtist::query()->create(['song_id' => (string) $newerUnplayed->getKey(), 'artist_id' => (string) $first->getKey()]);
        SongPlayEvent::query()->insert(array_fill(0, 3, ['song_id' => (string) $shared->getKey(), 'started_at' => now()->subHour()]));
        Song::query()->create(['title' => 'Incorrect Composite Credit', 'slug' => 'incorrect-composite-credit', 'artist_name' => $first->name.', '.$uncredited->name, 'status' => 'published']);
        Song::query()->create(['title' => 'Unpublished Track', 'slug' => 'unpublished-track', 'artist_name' => $uncredited->name, 'status' => 'draft']);

        $this->getJson('/api/v1/artists/trending')
            ->assertOk()
            ->assertJsonPath('meta.source', 'catalog')
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.id', (string) $first->getKey())
            ->assertJsonPath('data.0.featured_song.id', (string) $shared->getKey())
            ->assertJsonPath('data.0.featured_song.weekly_plays', 3)
            ->assertJsonPath('data.1.id', (string) $second->getKey())
            ->assertJsonPath('data.1.featured_song.id', (string) $solo->getKey())
            ->assertJsonPath('data.1.weekly_views', 0);
        $this->getJson('/api/v1/home/bootstrap')
            ->assertOk()
            ->assertJsonCount(2, 'data.trending_artists')
            ->assertJsonPath('data.trending_artists.0.ranking_source', 'catalog');
    }

    public function test_profile_view_is_explicit_deduplicated_validated_and_refreshes_trending(): void
    {
        $this->freezeTime();
        $artist = Artist::query()->create(['name' => 'Viewed Artist', 'slug' => 'viewed-artist', 'status' => 'active']);
        $song = Song::query()->create(['title' => 'Viewed Song', 'slug' => 'viewed-song', 'artist_name' => $artist->name, 'status' => 'published']);
        SongArtist::query()->create(['song_id' => (string) $song->getKey(), 'artist_id' => (string) $artist->getKey()]);
        SongPlayEvent::query()->create(['song_id' => (string) $song->getKey(), 'started_at' => now()->subHour()]);
        $this->getJson('/api/v1/artists/viewed-artist?summary=1')->assertOk();
        $this->getJson('/api/v1/artists/trending')
            ->assertJsonPath('meta.source', 'catalog')
            ->assertJsonPath('data.0.ranking_source', 'catalog')
            ->assertJsonPath('data.0.featured_song.id', (string) $song->getKey());
        $this->getJson('/api/v1/home/bootstrap')
            ->assertJsonPath('data.trending_artists.0.ranking_source', 'catalog')
            ->assertJsonPath('data.trending_artists.0.id', (string) $artist->getKey());
        $this->assertSame(0, ArtistViewEvent::query()->count());

        $this->postJson('/api/v1/artists/viewed-artist/view', ['visitor_id' => 'browser-a'])->assertOk()->assertJsonPath('recorded', true);
        $this->postJson('/api/v1/artists/'.$artist->getKey().'/view', ['visitor_id' => 'browser-a'])->assertOk()->assertJsonPath('recorded', false);
        $this->getJson('/api/v1/artists/trending')
            ->assertJsonPath('meta.source', 'weekly')
            ->assertJsonPath('data.0.weekly_views', 1)
            ->assertJsonPath('data.0.ranking_source', 'weekly');
        $this->getJson('/api/v1/home/bootstrap')
            ->assertJsonPath('data.trending_artists.0.id', (string) $artist->getKey())
            ->assertJsonPath('data.trending_artists.0.ranking_source', 'weekly');
        $this->assertSame(1, ArtistViewEvent::query()->count());

        $this->postJson('/api/v1/artists/viewed-artist/view', ['visitor_id' => 'browser-b'])->assertJsonPath('recorded', true);
        $this->postJson('/api/v1/artists/viewed-artist/view', ['visitor_id' => str_repeat('x', 121)])->assertUnprocessable()->assertJsonValidationErrors('visitor_id');
        $this->postJson('/api/v1/artists/missing-artist/view', ['visitor_id' => 'browser-a'])->assertNotFound();
        $this->assertSame(2, ArtistViewEvent::query()->count());

        $this->travel(31)->minutes();
        $this->postJson('/api/v1/artists/viewed-artist/view', ['visitor_id' => 'browser-a'])->assertJsonPath('recorded', true);
        $this->assertSame(3, ArtistViewEvent::query()->count());
    }
}
