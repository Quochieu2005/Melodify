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

        return $this->normalizeTrack($data, $songId);
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
    public function stream(string $url, ?string $range = null)
    {
        $request = $this->request()
            ->withOptions(['stream' => true])
            ->withHeaders(['Accept' => 'audio/mpeg,audio/*;q=0.9,*/*;q=0.8']);

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
        $artistName = $item['artistName'] ?? data_get($item, 'artist.name') ?? $item[3] ?? 'Nghệ sĩ chưa xác định';
        $artistId = $item['artistId'] ?? data_get($item, 'artist.key') ?? '';
        $songId = $item['key'] ?? $item['SongID'] ?? $fallbackId ?? '';

        return [
            'trackId' => (string) $songId,
            'trackName' => trim((string) ($item['name'] ?? $item['SongName'] ?? $item[2] ?? 'Bài hát')),
            'artistId' => (string) $artistId,
            'artistName' => trim((string) $artistName),
            'artistImageUrl' => $item['artistImage'] ?? data_get($item, 'artist.image'),
            'collectionId' => (string) ($album['key'] ?? $item['collectionId'] ?? ''),
            'collectionName' => trim((string) ($album['name'] ?? $item['collectionName'] ?? $item['AlbumName'] ?? '')) ?: null,
            'releaseDate' => $this->releaseDate($item['dateRelease'] ?? $item['releaseDate'] ?? null),
            'trackTimeMillis' => $this->durationMilliseconds($duration),
            'primaryGenreName' => $item['genreName'] ?? $item['primaryGenreName'] ?? null,
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
