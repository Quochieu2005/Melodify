<?php

use App\Models\Admin;
use App\Models\Artist;
use App\Models\Comment;
use App\Models\Playlist;
use App\Models\PlaylistSong;
use App\Models\Report;
use App\Models\Song;
use App\Models\SongArtist;
use App\Models\SongAudioFile;
use App\Models\User;
use Illuminate\Support\Facades\DB;

require __DIR__.'/bootstrap.php';

$connection = DB::connection('mongodb');
$database = $connection->getMongoDB();
$expectedPrefix = 'test_browser_'.$testId.'_';
if ($connection->getTablePrefix() !== $expectedPrefix || ! preg_match('/^test_browser_[a-f0-9]{16}_$/', $expectedPrefix)) {
    throw new RuntimeException('Refusing to access non-test collections.');
}
if (($argv[1] ?? '') === 'cleanup') {
    foreach ($database->listCollectionNames() as $name) {
        if (str_starts_with($name, $expectedPrefix)) {
            $database->selectCollection($name)->drop();
        }
    }
    echo json_encode(['cleaned_prefix' => $expectedPrefix]);

    return;
}

$admin = Admin::query()->create([
    'name' => 'Browser Test Admin', 'email' => 'browser-admin@example.test',
    'password' => 'BrowserTest!2026', 'role' => 'super_admin', 'status' => 'active', 'is_active' => true,
]);
$user = User::query()->create([
    'name' => 'Browser Test User', 'username' => 'browser-user', 'email' => 'browser-user@example.test',
    'password' => 'BrowserTest!2026', 'status' => 'active', 'is_active' => true,
]);
$artist = Artist::query()->create(['name' => 'Browser Artist', 'slug' => 'browser-artist', 'status' => 'active']);
$song = Song::query()->create([
    'title' => 'Browser Fixture Song', 'slug' => 'browser-fixture-song', 'status' => 'published',
    'artist_name' => 'Browser Artist', 'artist_id' => (string) $artist->getKey(), 'duration_seconds' => 12,
    'cover_url' => 'http://127.0.0.1:8001/_browser/files/cover.png',
]);
SongArtist::query()->create(['song_id' => (string) $song->getKey(), 'artist_id' => (string) $artist->getKey(), 'role' => 'primary', 'position' => 1]);
SongAudioFile::query()->create([
    'song_id' => (string) $song->getKey(), 'file_type' => 'full', 'source' => 'cloudinary', 'status' => 'active',
    'file_url' => 'http://127.0.0.1:8001/_browser/files/tone.wav', 'duration_seconds' => 12,
]);
$playlist = Playlist::query()->create(['name' => 'Browser Fixture Playlist', 'slug' => 'browser-fixture-playlist', 'status' => 'active', 'visibility' => 'public']);
PlaylistSong::query()->create(['playlist_id' => (string) $playlist->getKey(), 'song_id' => (string) $song->getKey(), 'position' => 1]);
Comment::query()->create(['user_id' => (string) $user->getKey(), 'song_id' => (string) $song->getKey(), 'content' => 'Browser fixture comment', 'status' => 'visible']);
Report::query()->create(['reporter_user_id' => (string) $user->getKey(), 'target_type' => 'song', 'target_id' => (string) $song->getKey(), 'reason' => 'Browser fixture report', 'status' => 'pending']);
echo json_encode(['directory' => $testDirectory, 'artist_id' => (string) $artist->getKey(), 'song_id' => (string) $song->getKey(), 'playlist_id' => (string) $playlist->getKey(), 'user_id' => (string) $user->getKey(), 'admin_id' => (string) $admin->getKey()], JSON_UNESCAPED_SLASHES);
