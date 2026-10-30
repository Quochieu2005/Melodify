<?php

namespace App\Http\Controllers;

use App\Models\Song;
use App\Models\SongAudioFile;
use App\Services\Music\NhacCuaTuiClient;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Throwable;

class AudioController extends Controller
{
    public function stream(string $slug, Request $request, NhacCuaTuiClient $nhaccuatui)
    {
        $song = Song::query()->where('slug', $slug)->first();

        if (! $song) {
            try {
                $song = Song::query()->find($slug);
            } catch (Throwable) {
                $song = null;
            }
        }

        abort_unless($song, 404);
        $audio = $this->findAudio($song);

        abort_if(
            (bool) ($audio?->premium_only ?? false)
                && ! $request->user('admin')
                && ! ($request->user()?->hasPremiumAccess() ?? false),
            403,
            'Bài hát này dành cho tài khoản VIP đã nạp.',
        );

        $qualityId = trim((string) $request->query('quality_id', ''));
        abort_if(strlen($qualityId) > 100, 404);
        $needsQualityRefresh = $qualityId !== '' && empty($audio?->stream_options);
        $audio = $this->refreshAudio($song, $nhaccuatui, $audio, force: $needsQualityRefresh);

        $download = $request->boolean('download');
        $option = null;
        if ($qualityId !== '') {
            $option = collect($audio?->stream_options ?? [])->first(fn (array $item): bool => (string) ($item['qualityId'] ?? $item['quality_id'] ?? '') === $qualityId
            );
            abort_unless($option, 404, 'Chất lượng này hiện không khả dụng.');
            abort_unless((bool) ($option['available'] ?? filled($option['streamUrl'] ?? $option['stream_url'] ?? null)), 404, 'NhacCuaTui có thông tin chất lượng nhưng chưa trả luồng phát/tải cho yêu cầu này.');
            $this->authorizeQuality($option, $request);
        }

        $url = $option
            ? $this->qualityUrl($option, $download)
            : ($download ? $this->defaultDownloadUrl($audio) : $audio?->file_url);
        abort_if(blank($url), 404, 'Bài hát chưa có audio ở chất lượng này.');
        $downloadFilename = $download
            ? $this->downloadFilename((string) $song->title, $option ?? $this->defaultDownloadOption($audio?->stream_options ?? []), $url)
            : null;

        if (($audio?->source ?? null) !== 'nhaccuatui') {
            if ($download) {
                $url = $this->cloudinaryAttachmentUrl($url, $downloadFilename);
            }

            return redirect()->away($url);
        }

        return $this->proxy(
            $url,
            $request,
            $nhaccuatui,
            function () use ($song, $nhaccuatui, $audio, $option, $download, $request): ?string {
                $fresh = $this->refreshAudio($song, $nhaccuatui, $audio, force: true);

                return $option
                    ? $this->findQualityUrl($fresh?->stream_options ?? [], (string) ($option['qualityId'] ?? $option['quality_id'] ?? ''), $download, $request)
                    : ($download ? $this->defaultDownloadUrl($fresh) : $fresh?->file_url);
            },
            $download,
            $downloadFilename,
        );
    }

    public function streamExternal(string $externalId, Request $request, NhacCuaTuiClient $nhaccuatui)
    {
        $key = 'external-audio:'.hash('sha256', $externalId);
        $track = Cache::remember($key, now()->addMinutes(5), fn () => $nhaccuatui->getSong($externalId, includeCountry: false));
        $qualityId = trim((string) $request->query('quality_id', ''));
        abort_if(strlen($qualityId) > 100, 404);
        $download = $request->boolean('download');
        $option = $qualityId === '' ? null : collect($track['streamOptions'] ?? [])->first(fn (array $item): bool => (string) ($item['qualityId'] ?? $item['quality_id'] ?? '') === $qualityId
        );
        if ($qualityId !== '') {
            abort_unless($option, 404, 'Chất lượng này hiện không khả dụng.');
            abort_unless((bool) ($option['available'] ?? filled($option['streamUrl'] ?? $option['stream_url'] ?? null)), 404, 'NhacCuaTui có thông tin chất lượng nhưng chưa trả luồng phát/tải cho yêu cầu này.');
            $this->authorizeQuality($option, $request);
        }
        $url = $option
            ? $this->qualityUrl($option, $download)
            : ($download ? $this->trackDownloadUrl($track) : ($track['streamUrl'] ?? null));
        abort_if(blank($url), 404, 'NhacCuaTui không cung cấp bản audio đầy đủ cho bài hát này.');
        $downloadFilename = $download
            ? $this->downloadFilename(
                (string) ($track['trackName'] ?? 'Bài hát'),
                $option ?? $this->defaultDownloadOption($track['streamOptions'] ?? []),
                $url,
            )
            : null;

        return $this->proxy($url, $request, $nhaccuatui, function () use ($key, $externalId, $nhaccuatui, $qualityId, $download, $request): ?string {
            Cache::forget($key);
            $track = $nhaccuatui->getSong($externalId, includeCountry: false);
            if (filled($track['streamUrl'] ?? null) || ! empty($track['streamOptions'])) {
                Cache::put($key, $track, now()->addMinutes(5));
            }

            return $qualityId !== ''
                ? $this->findQualityUrl($track['streamOptions'] ?? [], $qualityId, $download, $request)
                : ($download ? $this->trackDownloadUrl($track) : ($track['streamUrl'] ?? null));
        }, $download, $downloadFilename);
    }

    private function authorizeQuality(array $option, Request $request): void
    {
        abort_if(
            $this->requiresVipQuality($option)
                && ! $request->user('admin')
                && ! ($request->user()?->hasPremiumAccess() ?? false),
            403,
            'Chất lượng này dành cho tài khoản VIP.',
        );
    }

    private function requiresVipQuality(array $option): bool
    {
        $qualityHint = implode(' ', array_filter([
            (string) ($option['format'] ?? ''),
            (string) ($option['quality'] ?? ''),
            (string) ($option['label'] ?? ''),
            (string) ($option['name'] ?? ''),
            (string) ($option['key'] ?? ''),
            (string) ($option['typeUI'] ?? ''),
            (string) ($option['type'] ?? ''),
        ]));

        return (bool) ($option['premiumOnly'] ?? $option['premium_only'] ?? false)
            || preg_match('/lossless|flac|alac/i', $qualityHint) === 1
            || (int) ($option['bitrate'] ?? 0) >= 900;
    }

    private function qualityUrl(array $option, bool $download): ?string
    {
        return $download
            ? ($option['downloadUrl'] ?? $option['download_url'] ?? $option['streamUrl'] ?? $option['stream_url'] ?? null)
            : ($option['streamUrl'] ?? $option['stream_url'] ?? null);
    }

    private function findQualityUrl(array $options, string $qualityId, bool $download, Request $request): ?string
    {
        $option = collect($options)->first(fn (array $item): bool => (string) ($item['qualityId'] ?? $item['quality_id'] ?? '') === $qualityId
        );

        if (! $option) {
            return null;
        }

        abort_unless((bool) ($option['available'] ?? filled($option['streamUrl'] ?? $option['stream_url'] ?? null)), 404, 'Chất lượng này hiện không khả dụng.');
        $this->authorizeQuality($option, $request);

        return $this->qualityUrl($option, $download);
    }

    private function defaultDownloadUrl(?SongAudioFile $audio): ?string
    {
        $options = array_values(array_filter($audio?->stream_options ?? [], 'is_array'));
        $option = $this->defaultDownloadOption($options);
        $url = $option ? $this->qualityUrl($option, true) : null;
        if (filled($url)) {
            return $url;
        }

        // If the provider supplied quality options but none are public, do not
        // fall back to a generic URL that may point at a VIP-only quality.
        if ($options !== []) {
            return null;
        }

        return $audio?->file_url;
    }

    private function trackDownloadUrl(array $track): ?string
    {
        $options = array_values(array_filter($track['streamOptions'] ?? [], 'is_array'));
        $option = $this->defaultDownloadOption($options);
        $url = $option ? $this->qualityUrl($option, true) : null;
        if (filled($url)) {
            return $url;
        }

        // Avoid bypassing quality-level VIP checks through a generic provider URL.
        if ($options !== []) {
            return null;
        }

        return $track['downloadUrl'] ?? $track['streamUrl'] ?? null;
    }

    private function defaultDownloadOption(array $options): ?array
    {
        foreach ($options as $option) {
            if ($this->requiresVipQuality($option)
                || ! (bool) ($option['available'] ?? filled($option['streamUrl'] ?? $option['stream_url'] ?? null))) {
                continue;
            }

            if (filled($this->qualityUrl($option, true))) {
                return $option;
            }
        }

        return null;
    }

    private function downloadFilename(string $title, ?array $option, ?string $url): string
    {
        $qualityHint = implode(' ', array_filter([
            (string) ($option['format'] ?? ''),
            (string) ($option['quality'] ?? ''),
            (string) ($option['label'] ?? ''),
            (string) ($option['name'] ?? ''),
            (string) ($option['typeUI'] ?? ''),
            (string) ($option['type'] ?? ''),
        ]));
        $extension = match (true) {
            preg_match('/flac|lossless/i', $qualityHint) === 1 => 'flac',
            preg_match('/\\b(?:m4a|aac|alac)\\b/i', $qualityHint) === 1 => 'm4a',
            preg_match('/\\bwav\\b/i', $qualityHint) === 1 => 'wav',
            preg_match('/\\bmp3\\b/i', $qualityHint) === 1 => 'mp3',
            default => null,
        };

        if ($extension === null && filled($url)) {
            $path = parse_url((string) $url, PHP_URL_PATH);
            $urlExtension = is_string($path) ? strtolower(pathinfo($path, PATHINFO_EXTENSION)) : '';
            $extension = in_array($urlExtension, ['mp3', 'm4a', 'aac', 'flac', 'wav'], true) ? $urlExtension : null;
        }

        $extension ??= 'mp3';
        $safeTitle = preg_replace('/[\\x00-\\x1F\\x7F\\/\\\\:*?"<>|]+/u', ' ', trim($title)) ?? '';
        $safeTitle = preg_replace('/\\s+/u', ' ', trim($safeTitle)) ?? '';
        $safeTitle = preg_replace('/\\.(?:mp3|m4a|aac|flac|wav)$/i', '', $safeTitle) ?? $safeTitle;

        return ($safeTitle !== '' ? $safeTitle : 'Melodify').'.'.$extension;
    }

    private function cloudinaryAttachmentUrl(string $url, ?string $filename = null): string
    {
        $parts = parse_url($url);
        if (($parts['host'] ?? '') !== 'res.cloudinary.com' || ! isset($parts['path'])) {
            return $url;
        }

        $attachment = 'fl_attachment';
        if (filled($filename)) {
            $asciiFilename = Str::ascii((string) $filename);
            $asciiFilename = preg_replace('/[^A-Za-z0-9._-]+/', '_', $asciiFilename) ?? '';
            $attachment .= ':'.(trim($asciiFilename, '._-') ?: 'melodify-audio.mp3');
        }

        $path = preg_replace(
            '#/(?:image|video|raw)/upload/(?!fl_attachment(?:,|/))#i',
            '$0'.$attachment.'/',
            $parts['path'],
            1,
        );
        if (! is_string($path) || $path === $parts['path']) {
            return $url;
        }

        $downloadUrl = ($parts['scheme'] ?? 'https').'://'.$parts['host'].$path;
        if (isset($parts['port'])) {
            $downloadUrl = ($parts['scheme'] ?? 'https').'://'.$parts['host'].':'.$parts['port'].$path;
        }
        if (isset($parts['query'])) {
            $downloadUrl .= '?'.$parts['query'];
        }
        if (isset($parts['fragment'])) {
            $downloadUrl .= '#'.$parts['fragment'];
        }

        return $downloadUrl;
    }

    private function findAudio(Song $song): ?SongAudioFile
    {
        return SongAudioFile::query()
            ->where('song_id', (string) $song->getKey())
            ->where('status', 'active')
            ->where('file_type', 'full')
            ->first();
    }

    private function refreshAudio(Song $song, NhacCuaTuiClient $nhaccuatui, ?SongAudioFile $audio, bool $force = false): ?SongAudioFile
    {

        // A locally uploaded/admin-provided file takes precedence over the
        // upstream catalog audio, even when the song itself was imported.
        if ($audio && $audio->source !== 'nhaccuatui' && blank($audio->external_id)) {
            return $audio;
        }

        $externalId = $audio?->external_id;

        if (blank($externalId) && $song->external_source === 'nhaccuatui') {
            $externalId = $song->external_id;
        }

        if (blank($externalId)) {
            return $audio;
        }

        // Seeking/range requests must not repeat catalog and artist lookups.
        if (! $force
            && (filled($audio?->file_url) || ! empty($audio?->stream_options))
            && $audio?->refreshed_at?->gt(now()->subMinutes(5))) {
            return $audio;
        }

        try {
            $track = $nhaccuatui->getSong((string) $externalId, includeCountry: false);
            if (blank($track['streamUrl'] ?? null) && empty($track['streamOptions'])) {
                return $audio;
            }

            $audio ??= new SongAudioFile;
            $audio->song_id = (string) $song->getKey();
            $audio->file_type = 'full';
            $audio->file_url = $track['streamUrl'] ?? null;
            $audio->stream_options = $track['streamOptions'] ?? [];
            $audio->external_id = (string) ($track['trackId'] ?? $externalId);
            $audio->source = 'nhaccuatui';
            $audio->duration_seconds = isset($track['trackTimeMillis'])
                ? (int) round(((int) $track['trackTimeMillis']) / 1000)
                : $audio->duration_seconds;
            $audio->premium_only = (bool) ($audio->premium_only ?? false);
            $audio->status = 'active';
            $audio->refreshed_at = now();
            $audio->save();
        } catch (Throwable) {
            // Keep the previous URL if the upstream service is temporarily unavailable.
        }

        return $audio;
    }

    private function proxy(string $url, Request $request, NhacCuaTuiClient $nhaccuatui, ?callable $refresh = null, bool $download = false, ?string $downloadFilename = null)
    {
        try {
            $remote = $nhaccuatui->stream($url, $request->header('Range'));
            if (in_array($remote->status(), [401, 403, 404, 410], true) && $refresh) {
                $remote->toPsrResponse()->getBody()->close();
                $freshUrl = $refresh();
                if (filled($freshUrl)) {
                    $remote = $nhaccuatui->stream($freshUrl, $request->header('Range'));
                }
            }
        } catch (ConnectionException $exception) {
            report($exception);
            abort(502, 'Nguồn âm thanh chưa phản hồi. Vui lòng thử lại.');
        }
        if ($remote->status() === 416) {
            return response('', 416, ['Content-Range' => $remote->header('Content-Range')]);
        }
        if ($remote->failed()) {
            abort(502, 'Không thể tải audio từ NhacCuaTui.');
        }

        $headers = [];
        foreach ([
            'Content-Type',
            'Content-Length',
            'Content-Range',
            'Accept-Ranges',
            'ETag',
            'Last-Modified',
        ] as $header) {
            $value = $remote->header($header);
            if (filled($value)) {
                $headers[$header] = $value;
            }
        }
        $headers['Cache-Control'] = 'no-store, no-cache, must-revalidate';
        $headers['X-Accel-Buffering'] = 'no';
        if ($download) {
            $filename = $downloadFilename ?: 'Melodify.mp3';
            $fallbackFilename = Str::ascii($filename);
            $fallbackFilename = preg_replace('/[^A-Za-z0-9._-]+/', '_', $fallbackFilename) ?? '';
            $fallbackFilename = trim($fallbackFilename, '._-') ?: 'Melodify.mp3';
            $headers['Content-Disposition'] = 'attachment; filename="'.$fallbackFilename.'"; filename*=UTF-8\'\''.rawurlencode($filename);
        }

        return response()->stream(function () use ($remote): void {
            $body = $remote->toPsrResponse()->getBody();
            try {
                while (! $body->eof() && ! connection_aborted()) {
                    echo $body->read(1024 * 64);
                    if (function_exists('ob_flush')) {
                        @ob_flush();
                    }
                    flush();
                }
            } finally {
                $body->close();
            }
        }, $remote->status(), $headers);
    }
}
