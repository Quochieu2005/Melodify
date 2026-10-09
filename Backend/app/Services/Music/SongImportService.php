<?php

namespace App\Services\Music;

use App\Models\Artist;
use App\Models\Lyric;
use App\Models\Song;
use App\Models\SongArtist;
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
        $artistNames = $this->artistNames((string) ($track['artistName'] ?? ''));
        $artists = $this->syncArtists($track, $artistNames, $admin);

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

        if ($artists !== []) {
            $song->artistCredits()->delete();

            foreach ($artists as $position => $artist) {
                $song->artistCredits()->updateOrCreate(
                    ['artist_id' => (string) $artist->getKey()],
                    ['artist_role' => $position === 0 ? 'primary' : 'featured'],
                );
            }
        }

        $this->syncAudioFile($song, $track);
        $this->syncLyrics($song, $track);

        return $song->fresh();
    }

    /** @param array<int, string> $names
     *  @return array<int, Artist>
     */
    private function syncArtists(array $track, array $names, ?object $admin): array
    {
        $source = $this->source($track);
        $canUseExternalId = count($names) === 1;
        $artists = [];

        foreach ($names as $name) {
            $externalId = $canUseExternalId ? (string) ($track['artistId'] ?? '') : '';
            $artist = $externalId !== ''
                ? Artist::query()->where('external_source', $source)->where('external_id', $externalId)->first()
                : null;
            $artist ??= $this->findArtistByName($name);

            if (! $artist) {
                $artist = new Artist();
                $artist->name = $name;
                $artist->slug = $this->uniqueSlug(Artist::class, Str::slug($name), null);
                if ($admin) {
                    $artist->created_by_admin_id = (string) $admin->getKey();
                }
            }

            $artist->status = $artist->status ?: 'active';
            if ($externalId !== '' && blank($artist->external_id)) {
                $artist->external_source = $source;
                $artist->external_id = $externalId;
            }
            $artist->save();

            if ($canUseExternalId) {
                $this->syncArtistAvatar($artist, $track);
            }

            $artists[] = $artist;
        }

        return $artists;
    }

    /** @return array<int, string> */
    public function artistNames(string $artistName): array
    {
        $artistName = trim(preg_replace('/\s+/', ' ', $artistName) ?? '');
        if ($artistName === '') {
            return [];
        }

        $parts = preg_split('/\s*(?:,|&|\/|\bfeat\.?\s*|\bft\.?\s*|\bfeaturing\s+|\bvà\s+|\band\s+)\s*/iu', $artistName) ?: [];

        return collect($parts)
            ->map(fn ($name): string => trim($name))
            ->filter()
            ->unique(fn (string $name): string => $this->artistKey($name))
            ->values()
            ->all();
    }

    public function repairArtistCatalog(?object $admin = null): array
    {
        $stats = ['split' => 0, 'merged' => 0, 'credits' => 0];

        foreach (Artist::query()->get() as $combinedArtist) {
            $names = $this->artistNames((string) $combinedArtist->name);
            if (count($names) < 2) {
                continue;
            }

            $artists = $this->syncArtists(['source' => (string) $combinedArtist->external_source], $names, $admin);
            $credits = SongArtist::query()->where('artist_id', (string) $combinedArtist->getKey())->get();
            foreach ($credits as $credit) {
                foreach ($artists as $position => $artist) {
                    SongArtist::query()->updateOrCreate(
                        ['song_id' => (string) $credit->song_id, 'artist_id' => (string) $artist->getKey()],
                        ['artist_role' => $position === 0 ? 'primary' : 'featured'],
                    );
                    $stats['credits']++;
                }
                $credit->delete();
            }

            $combinedArtist->delete();
            $stats['split']++;
        }

        Artist::query()->get()
            ->groupBy(fn (Artist $artist): string => $this->artistKey((string) $artist->name))
            ->each(function ($artists) use (&$stats): void {
                if ($artists->count() < 2) {
                    return;
                }

                $primary = $artists->sortByDesc(fn (Artist $artist): int => (int) filled($artist->avatar_url) + (int) (bool) $artist->verified)->first();
                foreach ($artists->where($primary->getKeyName(), '!=', $primary->getKey()) as $duplicate) {
                    foreach (SongArtist::query()->where('artist_id', (string) $duplicate->getKey())->get() as $credit) {
                        $existing = SongArtist::query()->where('song_id', (string) $credit->song_id)->where('artist_id', (string) $primary->getKey())->first();
                        if ($existing) {
                            $credit->delete();
                        } else {
                            $credit->artist_id = (string) $primary->getKey();
                            $credit->save();
                        }
                        $stats['credits']++;
                    }
                    $duplicate->delete();
                    $stats['merged']++;
                }
            });

        return $stats;
    }

    private function findArtistByName(string $name): ?Artist
    {
        $key = $this->artistKey($name);

        return Artist::query()->get()->first(
            fn (Artist $artist): bool => $this->artistKey((string) $artist->name) === $key,
        );
    }

    private function artistKey(string $name): string
    {
        return Str::lower(preg_replace('/[^a-z0-9]+/', '', Str::ascii($name)) ?? '');
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
