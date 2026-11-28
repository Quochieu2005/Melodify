<?php

namespace App\Http\Controllers;

use App\Models\SongVideo;
use App\Services\Music\NhacCuaTuiClient;
use App\Support\PublicUrl;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
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

    public function download(string $slug, Request $request, NhacCuaTuiClient $nhaccuatui)
    {
        $video = $this->findActiveVideo($slug);
        abort_unless($video, 404);
        abort_if($video->source === 'youtube', 422, 'YouTube không cung cấp tải video trực tiếp.');

        $url = $video->video_url;
        if ($video->source === 'nhaccuatui' && filled($video->external_id)) {
            try {
                $external = $nhaccuatui->getVideo((string) $video->external_id);
            } catch (Throwable $exception) {
                report($exception);
                abort(502, 'Không thể lấy video từ NhacCuaTui.');
            }

            $url = $external['downloadUrl'] ?? $external['videoUrl'] ?? null;
            if (filled($url)) {
                $video->video_url = $external['videoUrl'] ?? $video->video_url;
                $video->thumbnail_url = $external['artworkUrl'] ?? $video->thumbnail_url;
                $video->duration_seconds = $external['durationSeconds'] ?? $video->duration_seconds;
                $video->source_url = $external['videoViewUrl'] ?? $video->source_url;
                $video->save();
            }
        }

        abort_if(blank($url), 404, 'Video này chưa có tệp để tải xuống.');
        $filename = (Str::slug((string) $video->title) ?: 'melodify-video').'.mp4';

        // Only NhacCuaTui URLs come from a provider API. Any other URL was typed by an admin, so never let the
        // server fetch it blindly for an anonymous visitor (it could point at an internal service).
        $untrusted = ! ($video->source === 'nhaccuatui' && filled($video->external_id));
        abort_if($untrusted && ! PublicUrl::isSafe((string) $url), 422, 'URL video không hợp lệ.');

        return $this->proxy((string) $url, $request, $nhaccuatui, $filename, $untrusted);
    }

    private function findActiveVideo(string $identifier): ?SongVideo
    {
        $video = SongVideo::query()->where('status', 'active')->where('slug', $identifier)->first();
        if ($video) {
            return $video;
        }

        try {
            return SongVideo::query()->where('status', 'active')->find($identifier);
        } catch (Throwable) {
            return null;
        }
    }

    private function proxy(string $url, Request $request, NhacCuaTuiClient $nhaccuatui, ?string $downloadFilename = null, bool $untrusted = false)
    {
        $remote = $nhaccuatui->stream($url, $request->header('Range'), 'video/mp4,video/*;q=0.9,*/*;q=0.8', followRedirects: ! $untrusted);
        if ($untrusted && $remote->redirect()) {
            // Do not follow redirects on the server (a public URL can redirect to an internal one); hand the
            // browser the next hop instead, but only when it is itself a public URL.
            $location = (string) $remote->header('Location');
            abort_unless($location !== '' && PublicUrl::isSafe($location), 422, 'URL video không hợp lệ.');

            return redirect()->away($location);
        }
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
        if ($downloadFilename !== null) {
            $headers['Content-Disposition'] = 'attachment; filename="'.$downloadFilename.'"; filename*=UTF-8\'\''.rawurlencode($downloadFilename);
        }

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
