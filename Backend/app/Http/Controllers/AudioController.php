<?php

namespace App\Http\Controllers;

use App\Models\Song;
use App\Models\SongAudioFile;
use App\Services\Music\NhacCuaTuiClient;
use Illuminate\Http\Request;
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
        $audio = $this->refreshAudio($song, $nhaccuatui);

        abort_if(blank($audio?->file_url), 404, 'Bài hát chưa có audio.');

        if ($audio->source !== 'nhaccuatui') {
            return redirect()->away($audio->file_url);
        }

        return $this->proxy($audio->file_url, $request, $nhaccuatui);
    }

    public function streamExternal(string $externalId, Request $request, NhacCuaTuiClient $nhaccuatui)
    {
        $track = $nhaccuatui->getSong($externalId);
        abort_if(blank($track['streamUrl'] ?? null), 404, 'NhacCuaTui không cung cấp bản audio đầy đủ cho bài hát này.');

        return $this->proxy($track['streamUrl'], $request, $nhaccuatui);
    }

    private function refreshAudio(Song $song, NhacCuaTuiClient $nhaccuatui): ?SongAudioFile
    {
        $audio = SongAudioFile::query()
            ->where('song_id', (string) $song->getKey())
            ->where('status', 'active')
            ->where('file_type', 'full')
            ->first();
        $externalId = $audio?->external_id;

        if (blank($externalId) && $song->external_source === 'nhaccuatui') {
            $externalId = $song->external_id;
        }

        if (blank($externalId)) {
            return $audio;
        }

        try {
            $track = $nhaccuatui->getSong((string) $externalId);
            if (blank($track['streamUrl'] ?? null)) {
                return $audio;
            }

            $audio ??= new SongAudioFile();
            $audio->song_id = (string) $song->getKey();
            $audio->file_type = 'full';
            $audio->file_url = $track['streamUrl'];
            $audio->external_id = (string) ($track['trackId'] ?? $externalId);
            $audio->source = 'nhaccuatui';
            $audio->duration_seconds = isset($track['trackTimeMillis'])
                ? (int) round(((int) $track['trackTimeMillis']) / 1000)
                : $audio->duration_seconds;
            $audio->premium_only = false;
            $audio->status = 'active';
            $audio->save();
        } catch (Throwable) {
            // Keep the previous URL if the upstream service is temporarily unavailable.
        }

        return $audio;
    }

    private function proxy(string $url, Request $request, NhacCuaTuiClient $nhaccuatui)
    {
        $remote = $nhaccuatui->stream($url, $request->header('Range'));
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

        return response()->stream(function () use ($remote): void {
            $body = $remote->toPsrResponse()->getBody();
            while (! $body->eof()) {
                echo $body->read(1024 * 64);
                if (function_exists('ob_flush')) {
                    @ob_flush();
                }
                flush();
            }
        }, $remote->status(), $headers);
    }
}
