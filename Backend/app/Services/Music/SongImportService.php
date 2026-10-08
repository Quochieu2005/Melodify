<?php

namespace App\Services\Music;

use App\Models\Artist;
use App\Models\Lyric;
use App\Models\Song;
use App\Models\SongAudioFile;
use App\Services\CloudinaryService;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

class SongImportService
{
    public function __construct(
        private readonly NhacCuaTuiClient $nhaccuatui,
        private readonly LyricsClient $lyricsClient,
        private readonly AppleMusicArtistImageClient $appleMusic,
    ) {}

    public function importFromNhacCuaTui(string $songId, ?object $admin = null): Song
    {
        $track = $this->nhaccuatui->getSong($songId);
        $externalId = (string) ($track['trackId'] ?? $songId);
        $artist = $this->syncArtist($track, $admin);

        $song = Song::query()
            ->where('external_source', 'nhaccuatui')
            ->where('external_id', $externalId)
            ->first();

        if (! $song) {
            $song = new Song();
            $song->external_source = 'nhaccuatui';
            $song->external_id = $externalId;
            if ($admin) {
                $song->created_by_admin_id = (string) $admin->getKey();
            }
        }

        $title = trim((string) ($track['trackName'] ?? 'Bài hát')) ?: 'Bài hát';
        $artistName = trim((string) ($track['artistName'] ?? 'Nghệ sĩ chưa xác định'));
        $song->title = $title;
        $song->slug = $this->uniqueSlug(Song::class, Str::slug($title.' '.$artistName), $song->getKey());
        $song->release_date = $this->dateValue($track['releaseDate'] ?? null);
        $song->duration_seconds = isset($track['trackTimeMillis'])
            ? (int) round(((int) $track['trackTimeMillis']) / 1000)
            : null;
        $song->explicit = ($track['trackExplicitness'] ?? '') === 'explicit';
        $song->cover_url = $this->largeArtwork($track['artworkUrl100'] ?? null);
        $song->preview_url = null;
        $song->external_url = $track['trackViewUrl'] ?? null;
        $song->itunes_url = null;
        $song->artist_name = $artistName;
        $song->status = $song->status ?: 'published';
        $song->save();

        if ($artist) {
            $song->artistCredits()->updateOrCreate(
                ['artist_id' => (string) $artist->getKey()],
                ['artist_role' => 'primary'],
            );
        }

        $this->syncAudioFile($song, $track);
        $this->syncLyrics($song, $track);

        return $song->fresh();
    }

    private function syncArtist(array $track, ?object $admin): ?Artist
    {
        $source = $this->source($track);
        $externalId = (string) ($track['artistId'] ?? '');
        $name = trim((string) ($track['artistName'] ?? ''));

        if ($name === '') {
            return null;
        }

        $artist = $externalId !== ''
            ? Artist::query()->where('external_source', $source)->where('external_id', $externalId)->first()
            : null;

        if (! $artist) {
            $artist = Artist::query()->where('slug', Str::slug($name))->first();
        }

        if (! $artist) {
            $artist = new Artist();
            $artist->slug = $this->uniqueSlug(Artist::class, Str::slug($name), null);
            if ($admin) {
                $artist->created_by_admin_id = (string) $admin->getKey();
            }
        }

        $artist->name = $name;
        $artist->external_source = $source;
        $artist->external_id = $externalId ?: null;
        $artist->status = $artist->status ?: 'active';
        $artist->save();
        $this->syncArtistAvatar($artist, $track);

        return $artist;
    }

    private function syncArtistAvatar(Artist $artist, array $track): void
    {
        if (filled($artist->avatar_url)) {
            return;
        }

        try {
            $imageUrl = $track['artistImageUrl'] ?? null;
            if (blank($imageUrl) && $this->source($track) !== 'nhaccuatui') {
                $imageUrl = $this->appleMusic->findArtistImage(
                    (string) $artist->name,
                    $track['artistViewUrl'] ?? $track['artistLinkUrl'] ?? null,
                    (string) ($track['artistId'] ?? $artist->external_id ?? ''),
                );
            }

            if (blank($imageUrl)) {
                return;
            }

            $timeout = $this->source($track) === 'nhaccuatui'
                ? config('services.nhaccuatui.timeout', 15)
                : config('services.itunes.timeout', 10);
            $response = Http::timeout((int) $timeout)
                ->accept('*/*')
                ->get($imageUrl);
            $response->throw();

            $extension = strtolower(pathinfo((string) parse_url($imageUrl, PHP_URL_PATH), PATHINFO_EXTENSION));
            $extension = in_array($extension, ['jpg', 'jpeg', 'png', 'webp'], true) ? $extension : 'jpg';
            $cloudinary = app(CloudinaryService::class);
            $uploaded = $cloudinary->uploadImageContents(
                $response->body(),
                Str::slug($artist->name).'.'.$extension,
                config('cloudinary.artist_folder', 'melodify/artists'),
                $cloudinary->datedPublicId($artist->slug),
            );
            $avatarUrl = $uploaded['secure_url'] ?? $uploaded['url'] ?? null;

            if (blank($avatarUrl)) {
                return;
            }

            $artist->avatar_url = $avatarUrl;
            $artist->avatar_public_id = $uploaded['public_id'] ?? null;
            $artist->avatar_source = 'apple_music';
            $artist->save();
        } catch (Throwable $exception) {
            Log::warning('Không thể đồng bộ ảnh nghệ sĩ riêng từ Apple Music.', [
                'artist_id' => (string) $artist->getKey(),
                'artist_name' => $artist->name,
                'exception' => $exception->getMessage(),
            ]);
        }
    }

    private function syncAudioFile(Song $song, array $track): void
    {
        $url = $track['streamUrl'] ?? $track['previewUrl'] ?? null;

        if (! filled($url)) {
            return;
        }

        $isFull = filled($track['streamUrl'] ?? null);
        $audio = SongAudioFile::query()->firstOrNew([
            'song_id' => (string) $song->getKey(),
            'file_type' => $isFull ? 'full' : 'preview',
        ]);
        $audio->file_url = $url;
        $audio->duration_seconds = $song->duration_seconds;
        $audio->premium_only = false;
        $audio->status = 'active';
        $audio->source = $this->source($track);
        $audio->external_id = (string) ($track['trackId'] ?? '');
        $audio->save();
    }

    private function syncLyrics(Song $song, array $track): void
    {
        $lyrics = null;
        if ($this->source($track) === 'nhaccuatui') {
            try {
                $lyrics = $this->nhaccuatui->getLyrics((string) $song->external_id, $track);
            } catch (RuntimeException) {
                $lyrics = null;
            }
        }

        if (! $lyrics) {
            try {
                $lyrics = $this->lyricsClient->find(
                    (string) ($track['trackName'] ?? ''),
                    (string) ($track['artistName'] ?? ''),
                    $track['collectionName'] ?? null,
                    isset($track['trackTimeMillis']) ? (int) round(((int) $track['trackTimeMillis']) / 1000) : null,
                );
            } catch (RuntimeException) {
                return;
            }
        }

        if (! $lyrics || (! filled($lyrics['plainLyrics'] ?? null) && ! filled($lyrics['syncedLyrics'] ?? null))) {
            return;
        }

        $lyric = Lyric::query()->firstOrNew([
            'song_id' => (string) $song->getKey(),
            'language' => 'unknown',
        ]);
        $lyric->content = $lyrics['plainLyrics'] ?? $lyrics['syncedLyrics'];
        $lyric->plain_lyrics = $lyrics['plainLyrics'] ?? null;
        $lyric->synced_lyrics = $lyrics['syncedLyrics'] ?? null;
        $lyric->is_synced = filled($lyrics['syncedLyrics'] ?? null);
        $lyric->source = $lyrics['source'] ?? ($this->source($track) === 'nhaccuatui' ? 'NhacCuaTui' : 'LRCLIB');
        $lyric->save();
    }

    private function source(array $track): string
    {
        return (string) ($track['source'] ?? 'nhaccuatui');
    }

    private function uniqueSlug(string $model, ?string $base, mixed $ignoreId): string
    {
        $base = Str::slug($base ?: 'melodify');
        $candidate = $base !== '' ? $base : 'melodify';
        $suffix = 2;

        while (true) {
            $query = $model::query()->where('slug', $candidate);
            $existing = $query->first();

            if (! $existing || ($ignoreId !== null && (string) $existing->getKey() === (string) $ignoreId)) {
                return $candidate;
            }

            $candidate = $base.'-'.$suffix++;
        }
    }

    private function largeArtwork(?string $artwork): ?string
    {
        return filled($artwork) ? str_replace('100x100', '600x600', $artwork) : null;
    }

    private function dateValue(mixed $value): ?string
    {
        $date = substr((string) $value, 0, 10);

        return preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) === 1 ? $date : null;
    }
}
