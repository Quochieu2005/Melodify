<?php

namespace App\Services\Music;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class AppleMusicArtistImageClient
{
    public function findArtistImage(
        string $artistName,
        ?string $artistUrl = null,
        ?string $artistId = null,
    ): ?string {
        $url = $this->artistPageUrl($artistName, $artistUrl, $artistId);

        if ($url === null) {
            return null;
        }

        $html = Http::accept('text/html')
            ->timeout((int) config('services.itunes.timeout', 10))
            ->get($url)
            ->throw()
            ->body();

        foreach ($this->jsonLdBlocks($html) as $json) {
            $image = $json['image'] ?? null;

            if (is_string($image) && Str::startsWith($image, 'http')) {
                return html_entity_decode($image);
            }
        }

        return null;
    }

    private function artistPageUrl(string $artistName, ?string $artistUrl, ?string $artistId): ?string
    {
        if (filled($artistUrl) && Str::startsWith($artistUrl, ['http://', 'https://'])) {
            return $artistUrl;
        }

        if (blank($artistId) || blank($artistName)) {
            return null;
        }

        return 'https://music.apple.com/vn/artist/'.rawurlencode(Str::slug($artistName)).'/'.rawurlencode($artistId);
    }

    private function jsonLdBlocks(string $html): array
    {
        preg_match_all(
            '/<script[^>]+type=["\']application\/ld\+json["\'][^>]*>(.*?)<\/script>/is',
            $html,
            $matches,
        );

        $blocks = [];

        foreach ($matches[1] ?? [] as $block) {
            $json = json_decode(html_entity_decode(trim($block)), true);

            if (is_array($json) && isset($json['image'])) {
                $blocks[] = $json;
            }
        }

        return $blocks;
    }
}
