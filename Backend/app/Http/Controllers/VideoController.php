<?php

namespace App\Http\Controllers;

use App\Models\SongVideo;
use App\Services\Music\NhacCuaTuiClient;
use Illuminate\Http\Request;
use Throwable;

class VideoController extends Controller
{
    public function stream(string $slug, Request $request, NhacCuaTuiClient $nhaccuatui)
    {
        $video = SongVideo::query()->where('status', 'active')->where('slug', $slug)->first();
        if (! $video) {
            try {
                $video = SongVideo::query()->where('status', 'active')->find($slug);
            } catch (Throwable) {
                $video = null;
            }
        }

        abort_unless($video, 404);

        if ($video->source !== 'nhaccuatui' || blank($video->external_id)) {
            abort_if(blank($video->video_url), 404, 'Video chưa có URL phát.');

            return redirect()->away($video->video_url);
        }

        try {
            $external = $nhaccuatui->getVideo((string) $video->external_id);
        } catch (Throwable $exception) {
            report($exception);
            abort(502, 'Không thể tải video từ NhacCuaTui.');
        }

        $url = $external['videoUrl'] ?? null;
        abort_if(blank($url), 404, 'NhacCuaTui không cung cấp URL phát video này.');

        $video->video_url = $url;
        $video->thumbnail_url = $external['artworkUrl'] ?? $video->thumbnail_url;
        $video->duration_seconds = $external['durationSeconds'] ?? $video->duration_seconds;
        $video->source_url = $external['videoViewUrl'] ?? $video->source_url;
        $video->save();

        return $this->proxy($url, $request, $nhaccuatui);
    }

    private function proxy(string $url, Request $request, NhacCuaTuiClient $nhaccuatui)
    {
        $remote = $nhaccuatui->stream($url, $request->header('Range'), 'video/mp4,video/*;q=0.9,*/*;q=0.8');
        if ($remote->failed()) {
            abort(502, 'Không thể tải video từ NhacCuaTui.');
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
