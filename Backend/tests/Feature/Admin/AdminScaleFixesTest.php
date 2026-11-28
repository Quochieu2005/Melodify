<?php

namespace Tests\Feature\Admin;

use App\Models\Admin;
use App\Models\Album;
use App\Models\Artist;
use App\Models\Favorite;
use App\Models\Genre;
use App\Models\Payment;
use App\Models\Playlist;
use App\Models\PlaylistSong;
use App\Models\Song;
use App\Models\SongAudioFile;
use App\Models\SongPlayEvent;
use App\Models\SongShare;
use App\Models\User;
use App\Services\Analytics\EventCounts;
use App\Services\CloudinaryService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Mockery\MockInterface;
use Tests\TestCase;

class AdminScaleFixesTest extends TestCase
{
    private string $prefix;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prefix = 'test_admin_scale_'.bin2hex(random_bytes(8)).'_';
        // The form requests' unique rules use the default connection, which is MongoDB in production.
        config(['database.default' => 'mongodb', 'database.connections.mongodb.prefix' => $this->prefix]);
        DB::purge('mongodb');
        Cache::store('file')->forget('admin:dashboard:metrics:v2:'.now()->format('Y-m-d-H-i'));
        $this->actingAs(new Admin([
            'name' => 'Scale Admin', 'email' => 'scale-admin@example.test', 'role' => 'super_admin',
            'status' => 'active', 'is_active' => true,
        ]), 'admin');
    }

    protected function tearDown(): void
    {
        Cache::store('file')->forget('admin:dashboard:metrics:v2:'.now()->format('Y-m-d-H-i'));
        SongAudioFile::flushEventListeners();

        try {
            $connection = DB::connection('mongodb');
            if ($connection->getTablePrefix() === $this->prefix && preg_match('/^test_admin_scale_[a-f0-9]{16}_$/', $this->prefix)) {
                foreach (['admins', 'admin_notifications', 'logs', 'songs', 'artists', 'albums', 'playlists', 'playlist_songs', 'song_artists', 'genres', 'song_play_events', 'favorites', 'song_shares', 'payments', 'users', 'song_audio_files', 'lyrics'] as $collection) {
                    $connection->getCollection($collection)->drop();
                }
            }
            DB::purge('mongodb');
        } finally {
            parent::tearDown();
        }
    }

    private function song(string $title, array $extra = []): Song
    {
        return Song::query()->create($extra + ['title' => $title, 'slug' => Str::slug($title).'-'.Str::lower(Str::random(4)), 'status' => 'published']);
    }

    private function playlist(string $name, array $extra = []): Playlist
    {
        return Playlist::query()->create($extra + [
            'name' => $name, 'slug' => Str::slug($name).'-'.Str::lower(Str::random(4)), 'type' => 'popular', 'visibility' => 'public',
            'status' => 'active', 'sort_order' => random_int(100, 9000), 'is_system' => true,
        ]);
    }

    public function test_event_counts_are_computed_inside_mongodb_with_day_and_date_filters(): void
    {
        $song = $this->song('Counted');
        $other = $this->song('Other');
        $today = now();
        SongPlayEvent::query()->create(['song_id' => (string) $song->getKey(), 'started_at' => $today, 'visitor_id' => 'a']);
        SongPlayEvent::query()->create(['song_id' => (string) $song->getKey(), 'started_at' => $today, 'visitor_id' => 'b']);
        SongPlayEvent::query()->create(['song_id' => (string) $other->getKey(), 'started_at' => $today->copy()->subDays(2), 'visitor_id' => 'c']);
        SongPlayEvent::query()->create(['song_id' => (string) $other->getKey(), 'started_at' => $today->copy()->subDays(40), 'visitor_id' => 'd']);
        Payment::query()->create(['user_id' => 'u', 'payment_code' => 'P1', 'amount' => 12000, 'status' => 'success', 'paid_at' => $today]);
        Payment::query()->create(['user_id' => 'u', 'payment_code' => 'P2', 'amount' => 30000, 'status' => 'success', 'paid_at' => $today]);
        Payment::query()->create(['user_id' => 'u', 'payment_code' => 'P3', 'amount' => 99999, 'status' => 'pending', 'paid_at' => $today]);

        $from = $today->copy()->subDays(10);
        $bySong = EventCounts::by(SongPlayEvent::class, 'song_id', 'started_at', $from);
        $this->assertSame([(string) $song->getKey() => 2, (string) $other->getKey() => 1], $bySong);
        $this->assertSame(3, array_sum(EventCounts::by(SongPlayEvent::class, 'song_id', 'started_at', $from)));
        $this->assertSame(4, array_sum(EventCounts::by(SongPlayEvent::class, 'song_id')), 'no date filter counts everything');

        $perDay = EventCounts::perDay(SongPlayEvent::class, 'started_at', $from);
        $todayKey = $today->copy()->setTimezone(config('app.timezone'))->format('Y-m-d');
        $this->assertSame(2, $perDay[$todayKey]);
        $this->assertSame(3, array_sum($perDay));

        $sums = EventCounts::sumPerDay(Payment::class, 'paid_at', 'amount', $from, ['status' => ['$in' => ['success']]]);
        $this->assertSame(42000.0, $sums[$todayKey]);
    }

    public function test_dashboard_renders_trends_and_rankings_from_counted_data(): void
    {
        $song = $this->song('Ranked Song');
        $songId = (string) $song->getKey();
        $playlist = $this->playlist('Ranked Playlist');
        PlaylistSong::query()->create(['playlist_id' => (string) $playlist->getKey(), 'song_id' => $songId, 'position' => 0]);
        foreach (['a', 'b'] as $visitor) {
            SongPlayEvent::query()->create(['song_id' => $songId, 'started_at' => now(), 'visitor_id' => $visitor]);
        }
        Favorite::query()->create(['user_id' => 'u1', 'song_id' => $songId]);
        SongShare::query()->create(['song_id' => $songId, 'visitor_id' => 'v']);
        Payment::query()->create(['user_id' => 'u1', 'payment_code' => 'D1', 'amount' => 12000, 'status' => 'success', 'paid_at' => now()]);
        $this->userNamed('dash-user');

        $response = $this->get(route('admin.dashboard'))->assertOk()->assertSee('Ranked Playlist');

        $this->assertSame(2, $response->viewData('playTrend')->last()['value']);
        $this->assertSame(12000.0, (float) $response->viewData('paymentTrend')->last()['value']);
        $this->assertSame(1, $response->viewData('userTrend')->last()['value']);
        $this->assertSame(1, $response->viewData('stats')['songs']);
    }

    public function test_song_analytics_page_shows_counts_per_song(): void
    {
        $song = $this->song('Analytics Song');
        $songId = (string) $song->getKey();
        foreach (['a', 'b', 'c'] as $visitor) {
            SongPlayEvent::query()->create(['song_id' => $songId, 'started_at' => now(), 'visitor_id' => $visitor]);
        }
        Favorite::query()->create(['user_id' => 'u1', 'song_id' => $songId]);
        SongShare::query()->create(['song_id' => $songId, 'visitor_id' => 'v1']);
        SongShare::query()->create(['song_id' => $songId, 'visitor_id' => 'v2']);

        $row = collect($this->get(route('admin.analytics.song-views'))->assertOk()->viewData('items')->items())
            ->firstWhere(fn (array $item): bool => (string) $item['song']->getKey() === $songId);

        $this->assertSame(3, $row['views']);
        $this->assertSame(1, $row['favorites']);
        $this->assertSame(2, $row['shares']);
    }

    /** One bulk insert of more songs than the form lists (default 500). Returns the id of the alphabetically last one. */
    private function manySongs(array $lastExtra = []): Song
    {
        $now = now();
        $rows = [];
        for ($i = 1; $i <= 500; $i++) {
            $title = sprintf('Song %04d', $i);
            $rows[] = ['title' => $title, 'slug' => Str::slug($title), 'status' => 'published', 'created_at' => $now, 'updated_at' => $now];
        }
        Song::query()->insert($rows);

        return Song::query()->create($lastExtra + ['title' => 'Song 9999', 'slug' => 'song-9999', 'status' => 'published']);
    }

    public function test_album_form_keeps_a_selected_song_that_is_outside_the_option_limit(): void
    {
        $artist = Artist::query()->create(['name' => 'Album Artist', 'slug' => 'album-artist', 'status' => 'active']);
        $album = Album::query()->create(['title' => 'Album', 'slug' => 'album', 'artist_id' => (string) $artist->getKey(), 'artist_ids' => [(string) $artist->getKey()], 'status' => 'published']);
        $last = $this->manySongs(['album_id' => (string) $album->getKey()]);

        $this->get(route('admin.albums.edit', $album->getKey()))
            ->assertOk()
            ->assertSee('value="'.$last->getKey().'"', false);
    }

    public function test_album_update_moves_songs_in_and_out_with_bulk_updates(): void
    {
        $artist = Artist::query()->create(['name' => 'Bulk Artist', 'slug' => 'bulk-artist', 'status' => 'active']);
        $artistId = (string) $artist->getKey();
        $album = Album::query()->create(['title' => 'Bulk Album', 'slug' => 'bulk-album', 'artist_id' => $artistId, 'artist_ids' => [$artistId], 'status' => 'published']);
        $keep = $this->song('Keep', ['album_id' => (string) $album->getKey()]);
        $drop = $this->song('Drop', ['album_id' => (string) $album->getKey()]);
        $add = $this->song('Add');

        $this->put(route('admin.albums.update', $album->getKey()), [
            'title' => 'Bulk Album', 'slug' => 'bulk-album', 'status' => 'published',
            'artist_ids' => [$artistId], 'song_ids' => [(string) $keep->getKey(), (string) $add->getKey()],
        ])->assertRedirect(route('admin.albums.index'));

        $this->assertSame((string) $album->getKey(), (string) $keep->fresh()->album_id);
        $this->assertSame((string) $album->getKey(), (string) $add->fresh()->album_id);
        $this->assertEmpty($drop->fresh()->album_id);
    }

    public function test_album_update_rejects_an_unknown_song_with_one_validation_error(): void
    {
        $artist = Artist::query()->create(['name' => 'Check Artist', 'slug' => 'check-artist', 'status' => 'active']);
        $artistId = (string) $artist->getKey();
        $album = Album::query()->create(['title' => 'Check Album', 'slug' => 'check-album', 'artist_id' => $artistId, 'artist_ids' => [$artistId], 'status' => 'published']);

        $this->put(route('admin.albums.update', $album->getKey()), [
            'title' => 'Check Album', 'slug' => 'check-album', 'status' => 'published',
            'artist_ids' => [$artistId], 'song_ids' => ['64b64b64b64b64b64b64b64b'],
        ])->assertSessionHasErrors('song_ids');
    }

    public function test_playlist_update_replaces_songs_in_order_with_a_bulk_insert(): void
    {
        $playlist = $this->playlist('Order Playlist');
        $first = $this->song('First');
        $second = $this->song('Second');
        $third = $this->song('Third');
        PlaylistSong::query()->create(['playlist_id' => (string) $playlist->getKey(), 'song_id' => (string) $first->getKey(), 'position' => 0]);
        $payload = fn (array $songs): array => [
            'name' => 'Order Playlist', 'slug' => $playlist->slug, 'type' => 'popular', 'visibility' => 'public',
            'sort_order' => (int) $playlist->sort_order, 'status' => 'active', 'is_system' => 1,
            'song_ids' => array_map(fn (Song $song): string => (string) $song->getKey(), $songs),
        ];

        $this->put(route('admin.playlists.update', $playlist->getKey()), $payload([$third, $first, $second]))
            ->assertRedirect(route('admin.playlists.index'));

        $links = PlaylistSong::query()->where('playlist_id', (string) $playlist->getKey())->orderBy('position')->get();
        $this->assertSame([(string) $third->getKey(), (string) $first->getKey(), (string) $second->getKey()], $links->pluck('song_id')->map(fn ($id): string => (string) $id)->all());
        $this->assertSame([0, 1, 2], $links->pluck('position')->map(fn ($p): int => (int) $p)->all());

        $this->put(route('admin.playlists.update', $playlist->getKey()), $payload([$second]))->assertRedirect(route('admin.playlists.index'));
        $this->assertSame(1, PlaylistSong::query()->where('playlist_id', (string) $playlist->getKey())->count());

        $this->put(route('admin.playlists.update', $playlist->getKey()), $payload([]))->assertRedirect(route('admin.playlists.index'));
        $this->assertSame(0, PlaylistSong::query()->where('playlist_id', (string) $playlist->getKey())->count());
    }

    public function test_playlist_form_keeps_a_selected_song_that_is_outside_the_option_limit(): void
    {
        $playlist = $this->playlist('Limit Playlist');
        $last = $this->manySongs();
        PlaylistSong::query()->create(['playlist_id' => (string) $playlist->getKey(), 'song_id' => (string) $last->getKey(), 'position' => 0]);

        $this->get(route('admin.playlists.edit', $playlist->getKey()))
            ->assertOk()
            ->assertSee('value="'.$last->getKey().'"', false);
    }

    public function test_genre_update_attaches_and_detaches_playlists_without_loading_every_playlist(): void
    {
        $genre = Genre::query()->create(['name' => 'Pop', 'slug' => 'pop', 'status' => 'active', 'sort_order' => 1]);
        $genreId = (string) $genre->getKey();
        $one = $this->playlist('Playlist One');
        $two = $this->playlist('Playlist Two');
        $unrelated = $this->playlist('Unrelated', ['genre_ids' => ['some-other-genre']]);
        $payload = fn (array $playlists): array => [
            'name' => 'Pop', 'slug' => 'pop', 'status' => 'active', 'sort_order' => 1,
            'playlist_ids' => array_map(fn (Playlist $playlist): string => (string) $playlist->getKey(), $playlists),
        ];

        $this->put(route('admin.genres.update', $genre->getKey()), $payload([$one]))->assertRedirect();
        $this->assertContains($genreId, (array) $one->fresh()->genre_ids);
        $this->assertNotContains($genreId, (array) ($two->fresh()->genre_ids ?? []));

        $this->put(route('admin.genres.update', $genre->getKey()), $payload([$two]))->assertRedirect();
        $this->assertNotContains($genreId, (array) ($one->fresh()->genre_ids ?? []));
        $this->assertContains($genreId, (array) $two->fresh()->genre_ids);
        $this->assertSame(['some-other-genre'], (array) $unrelated->fresh()->genre_ids, 'playlists of other genres are untouched');
    }

    public function test_artist_form_lists_a_limited_number_of_users_but_keeps_the_linked_one(): void
    {
        config(['admin.option_list_limit' => 1]);
        $this->userNamed('aaa-user');
        $this->userNamed('bbb-user');
        $linked = $this->userNamed('zzz-user');
        $artist = Artist::query()->create(['name' => 'Linked Artist', 'slug' => 'linked-artist', 'status' => 'active', 'user_id' => (string) $linked->getKey()]);

        $this->get(route('admin.artists.edit', $artist->getKey()))
            ->assertOk()
            ->assertSee('aaa-user@example.test')
            ->assertSee('zzz-user@example.test')
            ->assertDontSee('bbb-user@example.test');
    }

    public function test_replacing_lyrics_audio_deletes_the_new_file_when_saving_it_fails(): void
    {
        $song = $this->song('Lyrics Song');
        $this->mock(CloudinaryService::class, function (MockInterface $mock): void {
            $mock->shouldReceive('datedPublicId')->andReturn('test/lyrics');
            $mock->shouldReceive('uploadAudio')->once()->andReturn(['secure_url' => 'https://res.cloudinary.com/demo/video/upload/l.mp3', 'public_id' => 'test/lyrics-audio', 'duration' => 100]);
            $mock->shouldReceive('deleteAudio')->once()->with('test/lyrics-audio');
        });
        SongAudioFile::saving(function (): void {
            throw new \LogicException('database is down');
        });

        $this->put(route('admin.songs.lyrics.update', $song->getKey()), [
            'audio_file' => UploadedFile::fake()->create('l.mp3', 500, 'audio/mpeg'),
        ])->assertSessionHasErrors('audio_file');

        $this->assertSame(0, SongAudioFile::query()->count());
    }

    private function userNamed(string $name): User
    {
        return User::query()->create([
            'name' => $name, 'username' => $name, 'slug' => $name, 'email' => $name.'@example.test',
            'password' => 'x', 'status' => 'active', 'is_premium' => 0,
        ]);
    }
}
