<?php

namespace App\Services\Music;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class YouTubeClient
{
    public function searchVideos(string $query, int $limit = 10): array
    {
        $query = trim($query);
        if ($query === '') {
            throw new RuntimeException('Hãy nhập tên video hoặc nghệ sĩ cần tìm.');
        }

        $size = min(max($limit, 1), 25);
        $payload = $this->get('/search', [
            'part' => 'snippet',
            'q' => $query,
            'type' => 'video',
            'maxResults' => $size,
            'safeSearch' => 'none',
        ]);
        $items = (array) data_get($payload, 'items', []);
        $channels = $this->getChannels(collect($items)->pluck('snippet.channelId')->filter()->values()->all());

        return [
            'results' => collect($items)
                ->filter(fn ($item): bool => is_array($item) && filled(data_get($item, 'id.videoId')))
                ->map(fn (array $item): array => $this->normalizeVideo($item, $channels))
                ->values()
                ->all(),
        ];
    }

    public function getVideo(string $videoId): array
    {
        $videoId = trim($videoId);
        if (! preg_match('/^[A-Za-z0-9_-]{11}$/', $videoId)) {
            throw new RuntimeException('Mã video YouTube không hợp lệ.');
        }

        $payload = $this->get('/videos', [
            'part' => 'snippet,contentDetails,statistics',
            'id' => $videoId,
        ]);
        $item = collect((array) data_get($payload, 'items', []))->first();
        if (! is_array($item)) {
            throw new RuntimeException('Không tìm thấy video trên YouTube.');
        }

        $channelId = (string) data_get($item, 'snippet.channelId', '');
        $channels = $this->getChannels($channelId !== '' ? [$channelId] : []);

        return $this->normalizeVideo($item, $channels, $videoId);
    }

    /** @return array<string, mixed>|null */
    public function findChannel(string $name): ?array
    {
        $name = trim($name);
        if ($name === '') {
            return null;
        }

        $payload = $this->get('/search', [
            'part' => 'snippet',
            'q' => $name,
            'type' => 'channel',
            'maxResults' => 1,
        ]);
        $channelId = (string) data_get($payload, 'items.0.id.channelId', '');
        if ($channelId === '') {
            return null;
        }

        return $this->getChannels([$channelId])[$channelId] ?? null;
    }

    /** @param array<int, string> $channelIds @return array<string, array<string, mixed>> */
    private function getChannels(array $channelIds): array
    {
        $channelIds = collect($channelIds)->map(fn ($id): string => trim((string) $id))->filter()->unique()->values()->all();
        if ($channelIds === []) {
            return [];
        }

        $payload = $this->get('/channels', [
            'part' => 'snippet',
            'id' => implode(',', $channelIds),
        ]);

        return collect((array) data_get($payload, 'items', []))
            ->filter(fn ($item): bool => is_array($item) && filled($item['id'] ?? null))
            ->mapWithKeys(function (array $item): array {
                $snippet = (array) ($item['snippet'] ?? []);
                $countryCode = $this->countryCode($snippet['country'] ?? null);

                return [(string) $item['id'] => [
                    'id' => (string) $item['id'],
                    'name' => trim((string) ($snippet['title'] ?? 'Kênh YouTube')),
                    'image_url' => $this->thumbnailUrl($snippet['thumbnails'] ?? []),
                    'country_code' => $countryCode,
                    'country' => filled($countryCode) ? config('music.countries.'.$countryCode, $countryCode) : null,
                ]];
            })
            ->all();
    }

    /** @param array<string, mixed> $item @param array<string, array<string, mixed>> $channels */
    private function normalizeVideo(array $item, array $channels, ?string $fallbackId = null): array
    {
        $id = (string) ($fallbackId ?: data_get($item, 'id.videoId', $item['id'] ?? ''));
        $channelId = (string) data_get($item, 'snippet.channelId', '');
        $channel = $channels[$channelId] ?? [
            'id' => $channelId,
            'name' => trim((string) data_get($item, 'snippet.channelTitle', 'Kênh YouTube')),
            'image_url' => null,
            'country_code' => null,
            'country' => null,
        ];
        $snippet = (array) ($item['snippet'] ?? []);

        return [
            'videoId' => $id,
            'videoName' => trim((string) ($snippet['title'] ?? 'Video YouTube')),
            'channelId' => $channelId,
            'channelName' => $channel['name'],
            'artistId' => $channel['id'],
            'artistName' => $channel['name'],
            'artists' => [$channel],
            'artworkUrl' => $this->thumbnailUrl($snippet['thumbnails'] ?? []),
            'durationSeconds' => $this->durationSeconds((string) data_get($item, 'contentDetails.duration', '')),
            'videoUrl' => $id !== '' ? 'https://www.youtube.com/watch?v='.$id : null,
            'embedUrl' => $id !== '' ? 'https://www.youtube.com/embed/'.$id : null,
            'videoViewUrl' => $id !== '' ? 'https://www.youtube.com/watch?v='.$id : null,
            'description' => (string) ($snippet['description'] ?? ''),
            'publishedAt' => $snippet['publishedAt'] ?? null,
            'source' => 'youtube',
        ];
    }

    /** @param array<string, mixed> $thumbnails */
    private function thumbnailUrl(array $thumbnails): ?string
    {
        foreach (['maxres', 'standard', 'high', 'medium', 'default'] as $key) {
            $url = $thumbnails[$key]['url'] ?? null;
            if (is_string($url) && filter_var($url, FILTER_VALIDATE_URL)) {
                return $url;
            }
        }

        return null;
    }

    private function durationSeconds(string $duration): ?int
    {
        if (! preg_match('/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/', $duration, $matches)) {
            return null;
        }

        return ((int) ($matches[1] ?? 0) * 3600)
            + ((int) ($matches[2] ?? 0) * 60)
            + (int) ($matches[3] ?? 0);
    }

    private function countryCode(?string $country): ?string
    {
        $candidate = strtoupper(trim((string) $country));
        $aliases = [
            'VN' => 'VN', 'VNM' => 'VN', 'VIETNAM' => 'VN', 'VIỆT NAM' => 'VN',
            'KR' => 'KR', 'KOR' => 'KR', 'SOUTH KOREA' => 'KR', 'KOREA' => 'KR',
            'US' => 'US', 'USA' => 'US', 'UNITED STATES' => 'US',
            'GB' => 'GB', 'GBR' => 'GB', 'UNITED KINGDOM' => 'GB', 'ENGLAND' => 'GB',
            'JP' => 'JP', 'JPN' => 'JP', 'JAPAN' => 'JP',
            'CN' => 'CN', 'CHN' => 'CN', 'CHINA' => 'CN',
        ];

        $candidate = $aliases[$candidate] ?? $candidate;

        return array_key_exists($candidate, config('music.countries', [])) ? $candidate : null;
    }

    /** @param array<string, mixed> $query @return array<string, mixed> */
    private function get(string $path, array $query): array
    {
        $apiKey = trim((string) config('services.youtube.api_key'));
        if ($apiKey === '') {
            throw new RuntimeException('YouTube API key chưa được cấu hình.');
        }

        $response = Http::acceptJson()
            ->timeout((int) config('services.youtube.timeout', 15))
            ->get(rtrim((string) config('services.youtube.base_url', 'https://www.googleapis.com/youtube/v3'), '/').$path, [
                ...$query,
                'key' => $apiKey,
            ]);
        $payload = $response->json();
        if ($response->failed() || isset($payload['error'])) {
            throw new RuntimeException((string) data_get($payload, 'error.message', 'YouTube API không phản hồi hợp lệ.'));
        }

        return is_array($payload) ? $payload : [];
    }
}
