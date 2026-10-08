<?php

namespace App\Services\Music;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class ItunesClient
{
    public function searchTracks(string $query, int $limit = 20): array
    {
        $tracks = [];
        $countries = config('services.itunes.countries', ['VN', 'US', 'CN']);

        foreach ($countries as $country) {
            $response = Http::acceptJson()
                ->timeout((int) config('services.itunes.timeout', 10))
                ->get(config('services.itunes.base_url').'/search', [
                    'term' => $query !== '' ? $query : 'a',
                    'media' => 'music',
                    'entity' => 'song',
                    'country' => $country,
                    'limit' => min(max($limit, 1), 25),
                ]);

            if ($response->failed()) {
                throw new RuntimeException('iTunes không thể trả dữ liệu bài hát.');
            }

            foreach ((array) $response->json('results', []) as $track) {
                $trackId = (string) ($track['trackId'] ?? '');

                if ($trackId !== '') {
                    $tracks[$trackId] = $track;
                }
            }
        }

        return ['results' => array_slice(array_values($tracks), 0, max($limit, 1))];
    }

    public function getTrack(string $trackId): array
    {
        foreach (config('services.itunes.countries', ['VN', 'US', 'CN']) as $country) {
            $response = Http::acceptJson()
                ->timeout((int) config('services.itunes.timeout', 10))
                ->get(config('services.itunes.base_url').'/lookup', [
                    'id' => $trackId,
                    'country' => $country,
                ]);

            if ($response->failed()) {
                throw new RuntimeException('iTunes không thể tải bài hát này.');
            }

            $track = collect((array) $response->json('results', []))->first(fn (array $item): bool => isset($item['trackId']));

            if (is_array($track)) {
                return $track;
            }
        }

        throw new RuntimeException('Không tìm thấy bài hát trên iTunes.');
    }
}
