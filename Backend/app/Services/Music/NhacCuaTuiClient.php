<?php

namespace App\Services\Music;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class NhacCuaTuiClient
{
    public function searchSongs(string $query, int $limit = 10): array
    {
        $query = trim($query);
        if ($query === '') {
            throw new RuntimeException('Hãy nhập tên bài hát hoặc nghệ sĩ cần tìm.');
        }

        $page = 1;
        $size = min(max($limit, 1), 30);
        $url = config('services.nhaccuatui.graph_base_url').'/api/v1/search/song?'.http_build_query([
            'keyword' => $query,
            'pageindex' => $page,
            'pagesize' => $size,
            'correct' => 'false',
        ], '', '&', PHP_QUERY_RFC3986);
        $response = $this->request()->post($url, [
            'keyword' => $query,
            'pageindex' => $page,
            'pagesize' => $size,
            'correct' => false,
            'isShowLoading' => false,
        ]);

        $payload = $response->json();
        if ($response->failed() || (string) data_get($payload, 'code') !== '0') {
            throw new RuntimeException((string) data_get($payload, 'msg', 'NhacCuaTui không thể tìm bài hát.'));
        }

        $items = [];
        foreach ((array) data_get($payload, 'data.songs', []) as $item) {
            if (! is_array($item)) {
                continue;
            }

            $track = $this->normalizeTrack($item);
            $id = (string) ($track['trackId'] ?? '');
            if ($id !== '') {
                $items[$id] = $track;
            }
        }

        return ['results' => array_slice(array_values($items), 0, $limit)];
    }

    public function getSong(string $songId): array
    {
        $songId = trim($songId);
        if ($songId === '' || ! preg_match('/^[A-Za-z0-9]+$/', $songId)) {
            throw new RuntimeException('Mã bài hát NhacCuaTui không hợp lệ.');
        }

        $response = $this->request()->get(config('services.nhaccuatui.graph_base_url').'/api/v1/song/detail/'.$songId);

        $payload = $response->json();
        if ((string) data_get($payload, 'code') !== '0') {
            throw new RuntimeException((string) data_get($payload, 'msg', 'Không tìm thấy bài hát trên NhacCuaTui.'));
        }

        $data = data_get($payload, 'data');
        if (! is_array($data)) {
            throw new RuntimeException('NhacCuaTui trả về dữ liệu bài hát không hợp lệ.');
        }

        $track = $this->normalizeTrack($data, $songId);
        $artistId = trim((string) ($track['artistId'] ?? ''));

        if (blank($track['countryCode']) && $artistId !== '') {
            try {
                $artist = $this->getArtist($artistId);
                $track['countryCode'] = $this->countryCode($artist);
            } catch (RuntimeException) {
                // Country remains empty so the admin can enter it manually.
            }
        }

        return $track;
    }

    public function searchVideos(string $query, int $limit = 10): array
    {
        $query = trim($query);
        if ($query === '') {
            throw new RuntimeException('Hãy nhập tên video hoặc nghệ sĩ cần tìm.');
        }

        $size = min(max($limit, 1), 30);
        $response = $this->request()->get(
            config('services.nhaccuatui.graph_base_url').'/api/v1/search/video',
            [
                'keyword' => $query,
                'pageindex' => 1,
                'pagesize' => $size,
                'correct' => 'false',
            ],
        );
        $payload = $response->json();

        if ($response->failed() || (string) data_get($payload, 'code') !== '0') {
            throw new RuntimeException((string) data_get($payload, 'msg', 'NhacCuaTui không thể tìm video.'));
        }

        $items = [];
        foreach ((array) data_get($payload, 'data.videos', []) as $item) {
            if (! is_array($item)) {
                continue;
            }

            $video = $this->normalizeVideo($item);
            $id = (string) ($video['videoId'] ?? '');
            if ($id !== '') {
                $items[$id] = $video;
            }
        }

        return ['results' => array_slice(array_values($items), 0, $limit)];
    }

    public function getVideo(string $videoId): array
    {
        $videoId = trim($videoId);
        if ($videoId === '' || ! preg_match('/^[A-Za-z0-9]+$/', $videoId)) {
            throw new RuntimeException('Mã video NhacCuaTui không hợp lệ.');
        }

        $response = $this->request()->get(
            config('services.nhaccuatui.graph_base_url').'/api/v1/video/detail/'.$videoId,
        );
        $payload = $response->json();
        if ($response->failed() || (string) data_get($payload, 'code') !== '0') {
            throw new RuntimeException((string) data_get($payload, 'msg', 'Không tìm thấy video trên NhacCuaTui.'));
        }

        $data = data_get($payload, 'data');
        if (! is_array($data)) {
            throw new RuntimeException('NhacCuaTui trả về dữ liệu video không hợp lệ.');
        }

        $video = $this->normalizeVideo($data, $videoId);
        $video['artists'] = collect($video['artists'] ?? [])
            ->map(function (array $artist): array {
                if (blank($artist['id'] ?? null)) {
                    return $artist;
                }

                try {
                    $details = $this->getArtist((string) $artist['id']);
                    $artist['image_url'] ??= $this->firstUrl([$details['image'] ?? null, $details['avatar'] ?? null]);
                    $artist['country_code'] = $this->countryCode($details);
                    $artist['country'] = filled($artist['country_code'])
                        ? config('music.countries.'.$artist['country_code'], $artist['country_code'])
                        : null;
                } catch (RuntimeException) {
                    // Keep the video response usable when one artist profile is unavailable.
                }

                return $artist;
            })
            ->values()
            ->all();
        $video['artistName'] = $video['artists'] !== []
            ? implode(', ', array_column($video['artists'], 'name'))
            : $video['artistName'];

        return $video;
    }

    public function getArtist(string $artistId): array
    {
        $artistId = trim($artistId);
        if ($artistId === '' || ! preg_match('/^[A-Za-z0-9]+$/', $artistId)) {
            throw new RuntimeException('Mã nghệ sĩ NhacCuaTui không hợp lệ.');
        }

        $response = $this->request()->get(config('services.nhaccuatui.graph_base_url').'/api/v1/artist/detail/'.$artistId);
        $payload = $response->json();
        if ($response->failed() || (string) data_get($payload, 'code') !== '0') {
            throw new RuntimeException((string) data_get($payload, 'msg', 'Không tìm thấy nghệ sĩ trên NhacCuaTui.'));
        }

        $data = data_get($payload, 'data');
        if (! is_array($data)) {
            throw new RuntimeException('NhacCuaTui trả về dữ liệu nghệ sĩ không hợp lệ.');
        }

        return $data;
    }

    public function getLyrics(string $songId, ?array $track = null): ?array
    {
        $track ??= $this->getSong($songId);
        $response = $this->request()->get(config('services.nhaccuatui.graph_base_url').'/api/v1/song/lyric/detail', [
            'songKey' => $songId,
        ]);
        $payload = $response->json();
        if ($response->failed() || (string) data_get($payload, 'code') !== '0') {
            return null;
        }

        $data = data_get($payload, 'data', []);
        if (! is_array($data)) {
            return null;
        }

        $plain = trim((string) ($data['content'] ?? $data['lyric'] ?? $data['Lyric'] ?? ''));
        $synced = trim((string) ($data['timedLyric'] ?? $data['TimedLyric'] ?? $data['syncedLyrics'] ?? ''));
        if (preg_match('#^https?://.+\.lrc(?:\?.*)?$#i', $synced) === 1) {
            $synced = $this->downloadSyncedLyrics($synced) ?? '';
        }

        if ($plain === '' && $synced === '') {
            return null;
        }

        return [
            'id' => (string) ($data['lyricId'] ?? $data['LyricID'] ?? sha1($songId.'lyrics')),
            'plainLyrics' => $plain !== '' ? $plain : null,
            'syncedLyrics' => $synced !== '' ? $synced : null,
            'source' => 'NhacCuaTui',
        ];
    }

    /**
     * Open a stream from NhacCuaTui while keeping their required request headers.
     * The returned response is streamed by the application so browsers do not
     * request the signed NCT URL directly with a localhost Referer.
     */
    public function stream(string $url, ?string $range = null, string $accept = 'audio/mpeg,audio/*;q=0.9,*/*;q=0.8')
    {
        $request = $this->request()
            ->withOptions(['stream' => true])
            ->withHeaders(['Accept' => $accept]);

        if (filled($range)) {
            $request = $request->withHeaders(['Range' => $range]);
        }

        return $request->get($url);
    }

    private function request()
    {
        return Http::acceptJson()
            ->withHeaders([
                'Origin' => 'https://www.nhaccuatui.com',
                'Referer' => 'https://www.nhaccuatui.com/',
            ])
            ->withUserAgent(config('services.nhaccuatui.user_agent'))
            ->timeout((int) config('services.nhaccuatui.timeout', 15));
    }

    private function normalizeTrack(array $item, ?string $fallbackId = null): array
    {
        $album = $item['album'] ?? [];
        $album = is_array($album) ? $album : [];
        $duration = $item['duration'] ?? $item['SongDuration'] ?? null;
        $artistItems = $item['artist'] ?? [];
        if (is_array($artistItems) && isset($artistItems['name'])) {
            $artistItems = [$artistItems];
        }

        $artists = collect(is_array($artistItems) ? $artistItems : [])
            ->filter(fn ($artist): bool => is_array($artist))
            ->map(function (array $artist): array {
                return [
                    'id' => trim((string) ($artist['key'] ?? $artist['artistId'] ?? $artist['id'] ?? '')),
                    'name' => trim((string) ($artist['name'] ?? $artist['artistName'] ?? '')),
                    'image_url' => $this->firstUrl([
                        $artist['image'] ?? null,
                        $artist['artistImage'] ?? null,
                        $artist['avatar'] ?? null,
                    ]),
                ];
            })
            ->filter(fn (array $artist): bool => $artist['name'] !== '')
            ->values()
            ->all();

        if ($artists === []) {
            $fallbackArtistName = trim((string) ($item['artistName'] ?? data_get($item, 'artist.name') ?? $item[3] ?? ''));
            if ($fallbackArtistName !== '') {
                $artists[] = [
                    'id' => trim((string) ($item['artistId'] ?? data_get($item, 'artist.key') ?? '')),
                    'name' => $fallbackArtistName,
                    'image_url' => $this->firstUrl([
                        $item['artistImage'] ?? null,
                        data_get($item, 'artist.image'),
                    ]),
                ];
            }
        }

        $artistName = $item['artistName'] ?? data_get($item, 'artist.name') ?? $item[3] ?? '';
        if ($artists !== []) {
            $artistName = implode(', ', array_column($artists, 'name'));
        }
        $artistId = $artists[0]['id'] ?? ($item['artistId'] ?? data_get($item, 'artist.key') ?? '');
        $artistImageUrl = $artists[0]['image_url'] ?? $item['artistImage'] ?? data_get($item, 'artist.image');
        $songId = $item['key'] ?? $item['SongID'] ?? $fallbackId ?? '';

        return [
            'trackId' => (string) $songId,
            'trackName' => trim((string) ($item['name'] ?? $item['SongName'] ?? $item[2] ?? 'Bài hát')),
            'artistId' => (string) $artistId,
            'artistName' => trim((string) $artistName) ?: 'Nghệ sĩ chưa xác định',
            'artistImageUrl' => $artistImageUrl,
            'artists' => $artists,
            'collectionId' => (string) ($album['key'] ?? $item['collectionId'] ?? ''),
            'collectionName' => trim((string) ($album['name'] ?? $item['collectionName'] ?? $item['AlbumName'] ?? '')) ?: null,
            'releaseDate' => $this->releaseDate($item['dateRelease'] ?? $item['releaseDate'] ?? null),
            'trackTimeMillis' => $this->durationMilliseconds($duration),
            'primaryGenreName' => $item['genreName'] ?? $item['primaryGenreName'] ?? null,
            'countryCode' => $this->countryCode($item),
            'trackExplicitness' => ($item['explicit'] ?? false) ? 'explicit' : 'notExplicit',
            'artworkUrl100' => $this->firstUrl([
                $item['image'] ?? null,
                $item['SongThumbnail'] ?? null,
                $item[8] ?? null,
            ]),
            'trackViewUrl' => $this->firstUrl([
                $item['linkShare'] ?? null,
                $item['SongLink'] ?? null,
                $fallbackId ? 'https://www.nhaccuatui.com/song/'.$fallbackId : null,
            ]),
            'streamUrl' => $this->streamUrl($item['streamURL'] ?? $item['streamUrl'] ?? $item[7] ?? null),
            'downloadUrl' => $this->downloadUrl($item['streamURL'] ?? $item['streamUrl'] ?? null),
            'previewUrl' => null,
            'source' => 'nhaccuatui',
        ];
    }

    private function normalizeVideo(array $item, ?string $fallbackId = null): array
    {
        $artistItems = $item['artists'] ?? $item['artist'] ?? [];
        if (is_array($artistItems) && isset($artistItems['name'])) {
            $artistItems = [$artistItems];
        }

        $artists = collect(is_array($artistItems) ? $artistItems : [])
            ->filter(fn ($artist): bool => is_array($artist))
            ->map(function (array $artist): array {
                return [
                    'id' => trim((string) ($artist['key'] ?? $artist['artistId'] ?? $artist['id'] ?? '')),
                    'name' => trim((string) ($artist['name'] ?? $artist['artistName'] ?? '')),
                    'image_url' => $this->firstUrl([
                        $artist['image'] ?? null,
                        $artist['artistImage'] ?? null,
                        $artist['avatar'] ?? null,
                    ]),
                ];
            })
            ->filter(fn (array $artist): bool => $artist['name'] !== '')
            ->values()
            ->all();

        if ($artists === []) {
            $artistName = trim((string) ($item['artistName'] ?? data_get($item, 'artist.name') ?? ''));
            if ($artistName !== '') {
                $artists[] = [
                    'id' => trim((string) ($item['artistId'] ?? data_get($item, 'artist.key') ?? '')),
                    'name' => $artistName,
                    'image_url' => $this->firstUrl([
                        $item['artistImage'] ?? null,
                        data_get($item, 'artist.image'),
                    ]),
                ];
            }
        }

        $videoId = (string) ($item['key'] ?? $item['videoId'] ?? $fallbackId ?? '');
        $streams = $item['streamURL'] ?? $item['streamUrl'] ?? null;
        $durationSeconds = null;
        if (isset($item['duration']) && is_numeric($item['duration'])) {
            $durationSeconds = (int) round((float) $item['duration']);
        } elseif (isset($item['durationMillis']) && is_numeric($item['durationMillis'])) {
            $durationSeconds = (int) round(((float) $item['durationMillis']) / 1000);
        }

        return [
            'videoId' => $videoId,
            'videoName' => trim((string) ($item['name'] ?? $item['videoName'] ?? 'Video nhạc')),
            'artistId' => (string) ($artists[0]['id'] ?? $item['artistId'] ?? ''),
            'artistName' => $artists !== []
                ? implode(', ', array_column($artists, 'name'))
                : 'Nghệ sĩ chưa xác định',
            'artists' => $artists,
            'artworkUrl' => $this->firstUrl([
                $item['image'] ?? null,
                $item['thumbnail'] ?? null,
                $item['thumbnailUrl'] ?? null,
            ]),
            'durationSeconds' => $durationSeconds,
            'videoUrl' => $this->streamUrl($streams),
            'downloadUrl' => $this->downloadUrl($streams),
            'videoViewUrl' => $this->firstUrl([
                $item['linkShare'] ?? null,
                $item['link'] ?? null,
                $videoId !== '' ? 'https://www.nhaccuatui.com/video/'.$videoId : null,
            ]),
            'source' => 'nhaccuatui',
        ];
    }

    private function streamUrl(mixed $streams): ?string
    {
        if (is_string($streams)) {
            return $this->firstUrl([$streams]);
        }

        if (! is_array($streams)) {
            return null;
        }

        $available = collect($streams)
            ->filter(fn ($stream): bool => is_array($stream)
                && filled($stream['stream'] ?? null)
                && ! filter_var($stream['onlyVIP'] ?? false, FILTER_VALIDATE_BOOLEAN)
                && (int) ($stream['status'] ?? 1) === 1)
            ->sortByDesc(fn (array $stream): int => (int) ($stream['value'] ?? $stream['type'] ?? 0));

        return $this->firstUrl([$available->first()['stream'] ?? null]);
    }

    private function downloadUrl(mixed $streams): ?string
    {
        if (! is_array($streams)) {
            return null;
        }

        $available = collect($streams)
            ->filter(fn ($stream): bool => is_array($stream)
                && filled($stream['download'] ?? null)
                && ! filter_var($stream['onlyVIP'] ?? false, FILTER_VALIDATE_BOOLEAN)
                && (int) ($stream['status'] ?? 1) === 1)
            ->sortByDesc(fn (array $stream): int => (int) ($stream['value'] ?? $stream['type'] ?? 0));

        return $this->firstUrl([$available->first()['download'] ?? null]);
    }

    private function releaseDate(mixed $value): ?string
    {
        if (is_numeric($value)) {
            $timestamp = (int) round((float) $value / 1000);

            return $timestamp > 0 ? date('Y-m-d', $timestamp) : null;
        }

        $date = substr((string) $value, 0, 10);

        return preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) === 1 ? $date : null;
    }

    private function firstUrl(array $values): ?string
    {
        foreach ($values as $value) {
            if (is_string($value) && preg_match('#^https?://#i', $value)) {
                return $value;
            }
        }

        return null;
    }

    private function countryCode(array $item): ?string
    {
        $rawCountry = $item['countryCode']
            ?? $item['country_code']
            ?? data_get($item, 'country.code')
            ?? data_get($item, 'country.name')
            ?? $item['national']
            ?? $item['nationality']
            ?? $item['countryName']
            ?? $item['country_name']
            ?? $item['country']
            ?? '';
        $candidate = strtoupper(trim((string) (
            is_scalar($rawCountry) ? $rawCountry : ''
        )));

        $aliases = [
            'VNM' => 'VN', 'VIETNAM' => 'VN',
            'KOR' => 'KR', 'SOUTH KOREA' => 'KR', 'KOREA' => 'KR',
            'CHN' => 'CN', 'CHINA' => 'CN',
            'JPN' => 'JP', 'JAPAN' => 'JP',
            'USA' => 'US', 'UNITED STATES' => 'US', 'UNITED STATES OF AMERICA' => 'US',
            'GBR' => 'GB', 'UNITED KINGDOM' => 'GB', 'ENGLAND' => 'GB',
            'FRA' => 'FR', 'FRANCE' => 'FR',
            'DEU' => 'DE', 'GERMANY' => 'DE',
            'ESP' => 'ES', 'SPAIN' => 'ES',
            'ITA' => 'IT', 'ITALY' => 'IT',
            'THA' => 'TH', 'THAILAND' => 'TH',
            'IDN' => 'ID', 'INDONESIA' => 'ID',
            'PHL' => 'PH', 'PHILIPPINES' => 'PH',
            'AUS' => 'AU', 'AUSTRALIA' => 'AU',
            'CAN' => 'CA', 'CANADA' => 'CA',
        ];

        $candidate = $aliases[$candidate] ?? $candidate;

        if (array_key_exists($candidate, config('music.countries', []))) {
            return $candidate;
        }

        foreach (config('music.countries', []) as $code => $label) {
            if (mb_strtolower($candidate) === mb_strtolower((string) $label)) {
                return (string) $code;
            }
        }

        return null;
    }

    private function downloadSyncedLyrics(string $url): ?string
    {
        $response = $this->request()->get($url);
        if ($response->failed()) {
            return null;
        }

        $hex = preg_replace('/\s+/', '', trim($response->body()));
        if ($hex === '' || strlen($hex) % 2 !== 0 || ! ctype_xdigit($hex)) {
            return null;
        }

        $encrypted = hex2bin($hex);
        if ($encrypted === false) {
            return null;
        }

        return $this->rc4($encrypted, 'Lyr1cjust4nct');
    }

    private function rc4(string $input, string $key): string
    {
        $state = range(0, 255);
        $keyLength = strlen($key);
        $j = 0;

        for ($i = 0; $i < 256; $i++) {
            $j = ($j + $state[$i] + ord($key[$i % $keyLength])) % 256;
            [$state[$i], $state[$j]] = [$state[$j], $state[$i]];
        }

        $i = 0;
        $j = 0;
        $output = '';
        $length = strlen($input);

        for ($offset = 0; $offset < $length; $offset++) {
            $i = ($i + 1) % 256;
            $j = ($j + $state[$i]) % 256;
            [$state[$i], $state[$j]] = [$state[$j], $state[$i]];
            $keystream = $state[($state[$i] + $state[$j]) % 256];
            $output .= chr(ord($input[$offset]) ^ $keystream);
        }

        return trim($output);
    }

    private function durationMilliseconds(mixed $duration): ?int
    {
        if (is_numeric($duration)) {
            $seconds = (float) $duration;
            $seconds = $seconds > 10000 ? $seconds / 1000 : $seconds;

            return (int) round($seconds * 1000);
        }

        if (is_string($duration) && preg_match('/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/', trim($duration), $matches)) {
            $seconds = isset($matches[3])
                ? ((int) $matches[1] * 3600) + ((int) $matches[2] * 60) + (int) $matches[3]
                : ((int) $matches[1] * 60) + (int) $matches[2];

            return $seconds * 1000;
        }

        return null;
    }
}
