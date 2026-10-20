<?php

namespace App\Http\Controllers;

use App\Models\Song;
use App\Models\SongAudioFile;
use App\Services\Music\NhacCuaTuiClient;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
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
                && ! (bool) ($request->user()?->is_premium ?? false)
                && ! $request->user('admin'),
            403,
            'Bài hát này dành cho tài khoản VIP đã nạp.',
        );

        $audio = $this->refreshAudio($song, $nhaccuatui, $audio);
        abort_if(blank($audio?->file_url), 404, 'Bài hát chưa có audio.');

        if ($audio->source !== 'nhaccuatui') {
            return redirect()->away($audio->file_url);
        }

        return $this->proxy($audio->file_url, $request, $nhaccuatui, function () use ($song, $nhaccuatui, $audio): ?string {
            return $this->refreshAudio($song, $nhaccuatui, $audio, force: true)?->file_url;
        });
    }

    public function streamExternal(string $externalId, Request $request, NhacCuaTuiClient $nhaccuatui)
    {
        $key = 'external-audio:'.hash('sha256', $externalId);
        $track = Cache::remember($key, now()->addMinutes(5), fn () => $nhaccuatui->getSong($externalId, includeCountry: false));
        abort_if(blank($track['streamUrl'] ?? null), 404, 'NhacCuaTui không cung cấp bản audio đầy đủ cho bài hát này.');

        return $this->proxy($track['streamUrl'], $request, $nhaccuatui, function () use ($key, $externalId, $nhaccuatui): ?string {
            Cache::forget($key);
            $track = $nhaccuatui->getSong($externalId, includeCountry: false);
            if (filled($track['streamUrl'] ?? null)) {
                Cache::put($key, $track, now()->addMinutes(5));
            }

            return $track['streamUrl'] ?? null;
        });
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
        if (! $force && filled($audio?->file_url) && $audio?->refreshed_at?->gt(now()->subMinutes(5))) {
            return $audio;
        }

        try {
            $track = $nhaccuatui->getSong((string) $externalId, includeCountry: false);
            if (blank($track['streamUrl'] ?? null)) {
                return $audio;
            }

            $audio ??= new SongAudioFile;
            $audio->song_id = (string) $song->getKey();
            $audio->file_type = 'full';
            $audio->file_url = $track['streamUrl'];
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

    private function proxy(string $url, Request $request, NhacCuaTuiClient $nhaccuatui, ?callable $refresh = null)
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
