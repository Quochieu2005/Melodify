<?php

namespace Tests\Feature;

use App\Models\Album;
use App\Models\Artist;
use App\Models\ArtistFollower;
use App\Models\ArtistViewEvent;
use App\Models\Banner;
use App\Models\Playlist;
use App\Models\Song;
use App\Models\SongArtist;
use App\Models\SongVideo;
use App\Services\Music\SongImportService;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ArtistCatalogRepairTest extends TestCase
{
    private string $prefix;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prefix = 'test_artist_repair_'.bin2hex(random_bytes(8)).'_';
        config(['database.connections.mongodb.prefix' => $this->prefix]);
        DB::purge('mongodb');
        Http::preventStrayRequests();
    }

    protected function tearDown(): void
    {
        try {
            $connection = DB::connection('mongodb');
            if ($connection->getTablePrefix() === $this->prefix && preg_match('/^test_artist_repair_[a-f0-9]{16}_$/', $this->prefix)) {
                foreach (['artists', 'albums', 'playlists', 'banners', 'song_videos', 'artist_followers', 'artist_view_events', 'song_artists', 'songs'] as $collection) {
                    $connection->getCollection($collection)->drop();
                }
            }
            DB::purge('mongodb');
        } finally {
            parent::tearDown();
        }
    }

    private function artist(string $name, array $extra = []): Artist
    {
        static $n = 0;
        $n++;

        return Artist::query()->create($extra + ['name' => $name, 'slug' => 'artist-'.$n.'-'.bin2hex(random_bytes(2)), 'status' => 'active']);
    }

    public function test_artists_get_a_normalized_name_key_when_created_and_renamed(): void
    {
        $artist = $this->artist('Sơn Tùng M-TP');
        $this->assertSame('sontungmtp', $artist->name_key);

        $artist->update(['name' => 'Another Name']);
        $this->assertSame('anothername', $artist->fresh()->name_key);
    }

    public function test_import_reuses_an_existing_artist_found_by_name_key_and_stamps_legacy_artists(): void
    {
        $existing = $this->artist('Son Tung MTP');
        // An artist saved before name_key existed has no key at all.
        Artist::raw(fn ($collection) => $collection->insertOne(['name' => 'Legacy Singer', 'slug' => 'legacy-singer', 'status' => 'active']));
        $service = app(SongImportService::class);

        $found = $service->syncExternalArtists(['artistName' => 'Sơn Tùng M-TP'], null, ['Sơn Tùng M-TP']);
        $legacy = $service->syncExternalArtists(['artistName' => 'legacy singer'], null, ['legacy singer']);

        $this->assertSame((string) $existing->getKey(), (string) $found[0]->getKey());
        $this->assertSame('Legacy Singer', $legacy[0]->name);
        $this->assertSame(2, Artist::query()->count(), 'no duplicate artist was created');
        $this->assertSame('legacysinger', Artist::query()->where('slug', 'legacy-singer')->first()->name_key);
    }

    /** @return array<string, mixed> ids of every record that points at the duplicate */
    private function buildDuplicateWorld(): array
    {
        $linked = $this->artist('Sơn Tùng M-TP', ['user_id' => 'user-1', 'created_at' => now()->subYear()]);
        $duplicate = $this->artist('Son Tung MTP', ['avatar_url' => 'https://img.example.test/p.jpg', 'bio' => 'Bio from the duplicate']);
        $linkedId = (string) $linked->getKey();
        $dupId = (string) $duplicate->getKey();
        $song = Song::query()->create(['title' => 'A Song', 'slug' => 'a-song', 'status' => 'published']);

        SongArtist::query()->create(['song_id' => (string) $song->getKey(), 'artist_id' => $dupId, 'artist_role' => 'primary']);
        $album = Album::query()->create(['title' => 'Album', 'slug' => 'album', 'artist_id' => $dupId, 'artist_ids' => [$dupId], 'status' => 'published']);
        $playlist = Playlist::query()->create(['name' => 'Playlist', 'slug' => 'playlist', 'artist_ids' => [$dupId, 'other-artist'], 'status' => 'active']);
        $banner = new Banner;
        $banner->forceFill(['title' => 'Banner', 'slug' => 'banner', 'artist_ids' => [$dupId], 'status' => 'active'])->save();
        $video = SongVideo::query()->create(['title' => 'Video', 'slug' => 'video', 'artist_ids' => [$dupId], 'artists' => [['id' => $dupId, 'name' => 'Son Tung MTP']], 'status' => 'active']);
        ArtistFollower::query()->create(['artist_id' => $dupId, 'user_id' => 'follower-a']);
        ArtistFollower::query()->create(['artist_id' => $dupId, 'user_id' => 'follower-b']);
        ArtistFollower::query()->create(['artist_id' => $linkedId, 'user_id' => 'follower-b']);
        ArtistViewEvent::query()->create(['artist_id' => $dupId, 'viewed_at' => now()]);

        return compact('linkedId', 'dupId', 'song', 'album', 'playlist', 'banner', 'video');
    }

    public function test_dry_run_reports_the_work_and_changes_nothing(): void
    {
        $world = $this->buildDuplicateWorld();

        $this->assertSame(0, Artisan::call('artists:repair-catalog', ['--dry-run' => true]));
        $output = Artisan::output();

        $this->assertStringContainsString('[dry-run]', $output);
        $this->assertStringContainsString('gộp 1 bản ghi trùng', $output);
        $this->assertSame(2, Artist::query()->count());
        $this->assertSame($world['dupId'], (string) $world['album']->fresh()->artist_id);
        $this->assertSame(1, ArtistFollower::query()->where('artist_id', $world['dupId'])->where('user_id', 'follower-a')->count());
    }

    public function test_merging_duplicates_keeps_the_linked_artist_and_moves_every_reference(): void
    {
        $world = $this->buildDuplicateWorld();
        $keep = $world['linkedId'];

        $this->assertSame(0, Artisan::call('artists:repair-catalog'));

        $this->assertSame(1, Artist::query()->count());
        $survivor = Artist::query()->firstOrFail();
        $this->assertSame($keep, (string) $survivor->getKey(), 'the artist linked to a user account survives');
        $this->assertSame('user-1', $survivor->user_id);
        $this->assertSame('https://img.example.test/p.jpg', $survivor->avatar_url, 'missing profile fields are filled from the duplicate');
        $this->assertSame('Bio from the duplicate', $survivor->bio);

        $this->assertSame(1, SongArtist::query()->where('artist_id', $keep)->count());
        $this->assertSame(0, SongArtist::query()->where('artist_id', $world['dupId'])->count());

        $album = $world['album']->fresh();
        $this->assertSame($keep, (string) $album->artist_id);
        $this->assertSame([$keep], array_map('strval', (array) $album->artist_ids));
        $this->assertSame([$keep, 'other-artist'], array_map('strval', (array) $world['playlist']->fresh()->artist_ids));
        $this->assertSame([$keep], array_map('strval', (array) $world['banner']->fresh()->artist_ids));
        $video = $world['video']->fresh();
        $this->assertSame([$keep], array_map('strval', (array) $video->artist_ids));
        $this->assertSame($keep, (string) $video->artists[0]['id']);

        $this->assertSame(0, ArtistFollower::query()->where('artist_id', $world['dupId'])->count());
        $this->assertSame(1, ArtistFollower::query()->where('artist_id', $keep)->where('user_id', 'follower-a')->count());
        $this->assertSame(1, ArtistFollower::query()->where('artist_id', $keep)->where('user_id', 'follower-b')->count(), 'a user who followed both is not counted twice');
        $this->assertSame(1, ArtistViewEvent::query()->where('artist_id', $keep)->count());
    }

    public function test_splitting_a_combined_artist_moves_credits_and_references_to_the_real_artists(): void
    {
        $combined = $this->artist('Alpha & Beta');
        $combinedId = (string) $combined->getKey();
        $song = Song::query()->create(['title' => 'Duet', 'slug' => 'duet', 'status' => 'published']);
        SongArtist::query()->create(['song_id' => (string) $song->getKey(), 'artist_id' => $combinedId, 'artist_role' => 'primary']);
        $album = Album::query()->create(['title' => 'Duets', 'slug' => 'duets', 'artist_id' => $combinedId, 'artist_ids' => [$combinedId], 'status' => 'published']);
        ArtistFollower::query()->create(['artist_id' => $combinedId, 'user_id' => 'fan']);

        $this->assertSame(0, Artisan::call('artists:repair-catalog'));

        $alpha = Artist::query()->where('name', 'Alpha')->firstOrFail();
        $beta = Artist::query()->where('name', 'Beta')->firstOrFail();
        $this->assertNull(Artist::query()->find($combinedId), 'the combined record is gone');

        $roles = SongArtist::query()->where('song_id', (string) $song->getKey())->pluck('artist_role', 'artist_id')->all();
        $this->assertSame('primary', $roles[(string) $alpha->getKey()]);
        $this->assertSame('featured', $roles[(string) $beta->getKey()]);

        $album = $album->fresh();
        $this->assertSame((string) $alpha->getKey(), (string) $album->artist_id);
        $this->assertSame([(string) $alpha->getKey(), (string) $beta->getKey()], array_map('strval', (array) $album->artist_ids));
        $this->assertSame(1, ArtistFollower::query()->where('artist_id', (string) $alpha->getKey())->where('user_id', 'fan')->count());
    }
}
