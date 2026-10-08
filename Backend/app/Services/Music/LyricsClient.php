<?php

namespace App\Services\Music;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class LyricsClient
{
    public function find(string $trackName, string $artistName, ?string $albumName = null, ?int $duration = null): ?array
    {
        $query = [
            'track_name' => $trackName,
            'artist_name' => $artistName,
        ];

        if ($albumName) {
            $query['album_name'] = $albumName;
        }

        if ($duration && $duration > 0) {
            $query['duration'] = $duration;
        }

        $response = Http::acceptJson()
            ->withHeaders(['User-Agent' => config('services.lrclib.user_agent')])
            ->timeout((int) config('services.lrclib.timeout', 10))
            ->get(config('services.lrclib.base_url').'/api/get', $query);

        if ($response->status() === 404) {
            return null;
        }

        if ($response->failed()) {
            throw new RuntimeException('Không thể tải lời bài hát từ LRCLIB.');
        }

        $data = $response->json();

        return is_array($data) ? $data : null;
    }
}
