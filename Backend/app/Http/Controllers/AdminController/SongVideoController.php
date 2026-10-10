<?php

namespace App\Http\Controllers\AdminController;

use App\Http\Controllers\Controller;
use App\Models\SongVideo;
use App\Services\CloudinaryService;
use App\Services\Music\SongImportService;
use App\Services\Music\YouTubeClient;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Str;
use Illuminate\View\View;
use Throwable;

class SongVideoController extends Controller
{
    public function index(Request $request): View
    {
        $data = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
        ]);
        $search = trim((string) ($data['q'] ?? ''));
        $query = SongVideo::query();

        if ($search !== '') {
            $query->where(function ($nestedQuery) use ($search): void {
                $nestedQuery
                    ->where('title', 'like', "%{$search}%")
                    ->orWhere('slug', 'like', "%{$search}%");
            });
        }

        $items = $query
            ->orderBy('sort_order')
            ->latest()
            ->paginate(20)
            ->withQueryString();

        return view('Admin.videos.index', compact('items', 'search'));
    }

    public function create(): View
    {
        return view('Admin.videos.create', [
            'item' => null,
        ]);
    }

    public function show(string $slug): View
    {
        $item = $this->findVideo($slug);

        return view('Admin.videos.show', compact('item'));
    }

    public function searchExternal(Request $request, YouTubeClient $youtube): JsonResponse
    {
        $data = $request->validate([
            'q' => ['required', 'string', 'max:100'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:20'],
        ]);
        try {
            $result = $youtube->searchVideos($data['q'], (int) ($data['limit'] ?? 10));
        } catch (Throwable $exception) {
            report($exception);

            return response()->json(['message' => $exception->getMessage()], 422);
        }

        return response()->json([
            'data' => collect($result['results'] ?? [])->map(fn (array $video): array => $this->externalVideoData($video))->values()->all(),
            'meta' => ['source' => 'YouTube'],
        ]);
    }

    public function previewExternal(Request $request, YouTubeClient $youtube): JsonResponse
    {
        $data = $request->validate([
            'video_id' => ['required', 'regex:/^[A-Za-z0-9_-]{11}$/'],
        ]);
        try {
            $video = $youtube->getVideo($data['video_id']);
        } catch (Throwable $exception) {
            report($exception);

            return response()->json(['message' => $exception->getMessage()], 422);
        }

        return response()->json(['data' => $this->externalVideoData($video)]);
    }

    public function source(string $slug): JsonResponse
    {
        $video = $this->findVideo($slug);
        $url = null;

        if (filled($video->video_url_encrypted)) {
            try {
                $url = Crypt::decryptString((string) $video->video_url_encrypted);
            } catch (Throwable $exception) {
                report($exception);
            }
        }

        if (blank($url) && $video->source === 'youtube' && filled($video->external_id)) {
            $url = 'https://www.youtube.com/watch?v='.$video->external_id;
        }

        if (blank($url) && filled($video->source_url)) {
            $url = $video->source_url;
        }

        if (blank($url) && filled($video->video_url)) {
            $url = $video->video_url;
        }

        abort_if(blank($url), 404, 'Video chưa có đường dẫn nguồn.');

        return response()->json([
            'url' => $url,
            'source' => $video->source,
        ]);
    }

    public function store(Request $request, CloudinaryService $cloudinary, YouTubeClient $youtube, SongImportService $songImport): RedirectResponse
    {
        $data = $this->validated($request);

        if (! $request->hasFile('video_file') && blank($data['video_url'] ?? null)) {
            return back()->withErrors(['video_file' => 'Hãy chọn file video hoặc nhập URL video.'])->withInput();
        }

        try {
            $media = $this->resolveMedia($request, $data, $cloudinary);
            $artistData = $this->syncVideoArtists($data, $youtube, $songImport);
            $video = new SongVideo();
            $this->fillVideo($video, $data, $media, $artistData);
            $video->created_by_admin_id = (string) auth('admin')->id();
            $video->save();
        } catch (Throwable $exception) {
            report($exception);

            return back()->withErrors(['video_file' => 'Không thể upload video. Kiểm tra Cloudinary, file hoặc URL rồi thử lại.'])->withInput();
        }

        return redirect()->route('admin.videos.index')->with('success', 'Đã upload video nhạc thành công.');
    }

    public function edit(string $id): View
    {
        $item = $this->findVideo($id);

        return view('Admin.videos.edit', [
            'item' => $item,
        ]);
    }

    public function update(Request $request, string $slug, CloudinaryService $cloudinary, YouTubeClient $youtube, SongImportService $songImport): RedirectResponse
    {
        $video = $this->findVideo($slug);
        $data = $this->validated($request);

        if ($request->boolean('remove_video') && ! $request->hasFile('video_file') && blank($data['video_url'] ?? null)) {
            $this->deleteCloudinaryVideo($video, $cloudinary);
            $video->delete();

            return redirect()->route('admin.videos.index')->with('success', 'Đã xóa video nhạc.');
        }

        $hasNewMedia = $request->hasFile('video_file') || filled($data['video_url'] ?? null);
        $artistData = $this->syncVideoArtists($data, $youtube, $songImport);
        if ($hasNewMedia) {
            try {
                $media = $this->resolveMedia($request, $data, $cloudinary);
                $oldSource = $video->source;
                $oldPublicId = $video->public_id;
                $this->fillVideo($video, $data, $media, $artistData);
                $video->save();

                if ($oldSource === 'cloudinary' && filled($oldPublicId) && $oldPublicId !== $video->public_id) {
                    $this->deleteCloudinaryPublicId($cloudinary, (string) $oldPublicId);
                }
            } catch (Throwable $exception) {
                report($exception);

                return back()->withErrors(['video_file' => 'Không thể cập nhật video. Kiểm tra Cloudinary, file hoặc URL rồi thử lại.'])->withInput();
            }
        } else {
            $video->title = trim((string) $data['title']);
            $video->slug = $this->uniqueSlug(
                trim((string) ($data['slug'] ?? $video->slug ?? '')),
                (string) $data['title'],
                $video->getKey(),
            );
            $video->thumbnail_url = $data['thumbnail_url'] ?? null;
            $video->duration_seconds = $data['duration_seconds'] ?? $video->duration_seconds;
            $video->sort_order = (int) ($data['sort_order'] ?? 0);
            $video->status = $data['status'];
            if ($artistData !== null) {
                $video->artist_ids = $artistData['ids'];
                $video->artists = $artistData['items'];
            }
            if (filled($data['external_id'] ?? null) && in_array(($data['external_source'] ?? null), ['youtube', 'nhaccuatui'], true)) {
                $video->external_id = $data['external_id'];
                $video->external_source = $data['external_source'];
                if ($data['external_source'] === 'youtube') {
                    $video->source = 'youtube';
                    $video->video_url = null;
                    $video->source_url = null;
                    if (filled($data['video_url'] ?? null)) {
                        $video->video_url_encrypted = Crypt::encryptString((string) $data['video_url']);
                    } elseif (blank($video->video_url_encrypted)) {
                        $video->video_url_encrypted = Crypt::encryptString('https://www.youtube.com/watch?v='.$data['external_id']);
                    }
                } else {
                    $video->source_url = $data['source_url'] ?? $video->source_url;
                }
            }
            $video->save();
        }

        return redirect()->route('admin.videos.index')->with('success', 'Đã cập nhật video nhạc.');
    }

    public function destroy(string $slug, CloudinaryService $cloudinary): RedirectResponse
    {
        $video = $this->findVideo($slug);
        $this->deleteCloudinaryVideo($video, $cloudinary);
        $video->delete();

        return back()->with('success', 'Đã xóa video nhạc.');
    }

    public function destroyBulk(Request $request, CloudinaryService $cloudinary): RedirectResponse
    {
        $data = $request->validate([
            'ids' => ['required', 'array', 'min:1', 'max:50'],
            'ids.*' => ['required', 'string', 'max:64', 'distinct'],
        ]);
        $keyName = (new SongVideo())->getKeyName();
        $videos = SongVideo::query()->whereIn($keyName, array_values($data['ids']))->get();

        if ($videos->isEmpty()) {
            return back()->withErrors(['ids' => 'Không tìm thấy video phù hợp để xóa.']);
        }

        foreach ($videos as $video) {
            $this->deleteCloudinaryVideo($video, $cloudinary);
            $video->delete();
        }

        return back()->with('success', "Đã xóa {$videos->count()} video nhạc đã chọn.");
    }

    public function destroyAll(CloudinaryService $cloudinary): RedirectResponse
    {
        $videos = SongVideo::query()->get();
        if ($videos->isEmpty()) {
            return back()->with('warning', 'Hiện chưa có video nhạc nào để xóa.');
        }

        foreach ($videos as $video) {
            $this->deleteCloudinaryVideo($video, $cloudinary);
            $video->delete();
        }

        return back()->with('success', "Đã xóa toàn bộ {$videos->count()} video nhạc.");
    }

    /** @return array<string, mixed> */
    private function validated(Request $request): array
    {
        return $request->validate([
            'title' => ['required', 'string', 'max:160'],
            'slug' => ['nullable', 'alpha_dash', 'max:200'],
            'video_file' => ['nullable', 'file', 'mimes:mp4,mov,m4v,webm,avi,mkv', 'max:512000'],
            'video_url' => ['nullable', 'url:http,https', 'max:1000'],
            'thumbnail_url' => ['nullable', 'url:http,https', 'max:500'],
            'source_url' => ['nullable', 'url:http,https', 'max:1000'],
            'external_id' => ['nullable', 'regex:/^[A-Za-z0-9_-]+$/', 'max:80'],
            'external_source' => ['nullable', 'in:youtube,nhaccuatui'],
            'artist_names' => ['nullable', 'string', 'max:500'],
            'duration_seconds' => ['nullable', 'integer', 'min:0', 'max:86400'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:9999'],
            'status' => ['required', 'in:active,inactive'],
            'remove_video' => ['nullable', 'boolean'],
        ]);
    }

    /** @return array{url: ?string, public_id: ?string, source: string, duration_seconds: ?int} */
    private function resolveMedia(Request $request, array $data, CloudinaryService $cloudinary): array
    {
        if ($request->hasFile('video_file')) {
            $uploaded = $cloudinary->uploadVideo(
                $request->file('video_file'),
                config('cloudinary.video_folder', 'melodify/videos'),
                Str::slug($data['title']).'-video-'.Str::lower(Str::random(10)),
            );
            $url = $uploaded['secure_url'] ?? $uploaded['url'] ?? null;
            if (blank($url)) {
                throw new \RuntimeException('Cloudinary không trả về URL video.');
            }

            return [
                'url' => $url,
                'public_id' => $uploaded['public_id'] ?? null,
                'source' => 'cloudinary',
                'duration_seconds' => isset($uploaded['duration']) ? (int) round((float) $uploaded['duration']) : null,
            ];
        }

        if (blank($data['video_url'] ?? null)) {
            throw new \RuntimeException('Video chưa có file hoặc URL.');
        }

        $isYouTube = ($data['external_source'] ?? null) === 'youtube' && filled($data['external_id'] ?? null);

        return [
            'url' => $isYouTube ? null : (string) $data['video_url'],
            'public_id' => null,
            'source' => $isYouTube
                ? 'youtube'
                : (($data['external_source'] ?? null) === 'nhaccuatui' && filled($data['external_id'] ?? null)
                    ? 'nhaccuatui'
                    : 'admin_url'),
            'duration_seconds' => null,
        ];
    }

    /** @param array<string, mixed> $data @param array{url: ?string, public_id: ?string, source: string, duration_seconds: ?int} $media */
    private function fillVideo(SongVideo $video, array $data, array $media, ?array $artistData = null): void
    {
        $video->title = trim((string) $data['title']);
        $video->slug = $this->uniqueSlug(
            trim((string) ($data['slug'] ?? $video->slug ?? '')),
            (string) $data['title'],
            $video->getKey(),
        );
        $video->video_url = $media['url'];
        $video->public_id = $media['public_id'];
        $video->source = $media['source'];
        $isExternalVideo = in_array($media['source'], ['youtube', 'nhaccuatui'], true);
        $video->external_id = $isExternalVideo ? ($data['external_id'] ?? null) : null;
        $video->external_source = $isExternalVideo ? ($data['external_source'] ?? $media['source']) : null;
        $video->source_url = $media['source'] === 'youtube'
            ? null
            : ($isExternalVideo ? ($data['source_url'] ?? null) : null);
        $video->video_url_encrypted = $media['source'] === 'youtube'
            ? Crypt::encryptString((string) ($data['video_url'] ?? 'https://www.youtube.com/watch?v='.$data['external_id']))
            : null;
        if ($media['source'] !== 'youtube') {
            $video->video_url_encrypted = null;
        }
        if (! $isExternalVideo) {
            $video->artist_ids = [];
            $video->artists = [];
        } elseif ($artistData !== null) {
            $video->artist_ids = $artistData['ids'];
            $video->artists = $artistData['items'];
        }
        $video->thumbnail_url = $data['thumbnail_url'] ?? null;
        $video->duration_seconds = $media['duration_seconds'] ?: ($data['duration_seconds'] ?? null);
        $video->sort_order = (int) ($data['sort_order'] ?? 0);
        $video->status = $data['status'];
    }

    private function deleteCloudinaryVideo(SongVideo $video, CloudinaryService $cloudinary): void
    {
        if ($video->source === 'cloudinary' && filled($video->public_id)) {
            $this->deleteCloudinaryPublicId($cloudinary, (string) $video->public_id);
        }
    }

    private function deleteCloudinaryPublicId(CloudinaryService $cloudinary, string $publicId): void
    {
        try {
            $cloudinary->deleteVideo($publicId);
        } catch (Throwable $exception) {
            report($exception);
        }
    }

    private function findVideo(string $slug): SongVideo
    {
        $video = SongVideo::query()->where('slug', $slug)->first();
        if ($video) {
            return $video;
        }

        try {
            $video = SongVideo::query()->find($slug);
        } catch (Throwable) {
            $video = null;
        }

        return $video ?: abort(404);
    }

    private function uniqueSlug(string $requestedSlug, string $title, mixed $ignoreId = null): string
    {
        $base = Str::slug($requestedSlug !== '' ? $requestedSlug : $title);
        $base = $base !== '' ? $base : 'music-video';
        $slug = $base;
        $suffix = 2;

        while (true) {
            $existing = SongVideo::query()->where('slug', $slug)->first();
            if (! $existing || ($ignoreId !== null && (string) $existing->getKey() === (string) $ignoreId)) {
                return $slug;
            }

            $slug = $base.'-'.$suffix++;
        }
    }

    /** @param array<string, mixed> $video */
    private function externalVideoData(array $video): array
    {
        return [
            'external_id' => (string) ($video['videoId'] ?? ''),
            'external_source' => 'youtube',
            'title' => (string) ($video['videoName'] ?? 'Video nhạc'),
            'artist_name' => (string) ($video['artistName'] ?? 'Nghệ sĩ chưa xác định'),
            'artists' => $video['artists'] ?? [],
            'thumbnail_url' => $video['artworkUrl'] ?? null,
            'video_url' => $video['videoUrl'] ?? null,
            'source_url' => $video['videoViewUrl'] ?? null,
            'embed_url' => $video['embedUrl'] ?? null,
            'duration_seconds' => $video['durationSeconds'] ?? null,
        ];
    }

    /** @return array{ids: array<int, string>, items: array<int, array<string, mixed>>}|null */
    private function syncVideoArtists(array $data, YouTubeClient $youtube, SongImportService $songImport): ?array
    {
        if (($data['external_source'] ?? null) !== 'youtube' || blank($data['external_id'] ?? null)) {
            return null;
        }

        try {
            $externalVideo = $youtube->getVideo((string) $data['external_id']);
            $primaryNames = collect($externalVideo['artists'] ?? [])
                ->filter(fn ($artist): bool => is_array($artist) && filled($artist['name'] ?? null))
                ->pluck('name')
                ->map(fn ($name): string => trim((string) $name))
                ->filter()
                ->all();
            $manualNames = $songImport->artistNames((string) ($data['artist_names'] ?? ''));
            $names = collect([...$primaryNames, ...$manualNames])
                ->map(fn ($name): string => trim((string) $name))
                ->filter()
                ->unique(fn (string $name): string => Str::lower(preg_replace('/[^a-z0-9]+/', '', Str::ascii($name)) ?? ''))
                ->values()
                ->all();
            $metadata = collect($externalVideo['artists'] ?? [])
                ->filter(fn ($artist): bool => is_array($artist) && filled($artist['name'] ?? null))
                ->keyBy(fn (array $artist): string => Str::lower(preg_replace('/[^a-z0-9]+/', '', Str::ascii((string) $artist['name'])) ?? ''));

            foreach ($names as $name) {
                $key = Str::lower(preg_replace('/[^a-z0-9]+/', '', Str::ascii($name)) ?? '');
                if ($metadata->has($key)) {
                    continue;
                }

                $channel = $youtube->findChannel($name);
                $metadata->put($key, $channel ?: [
                    'id' => '',
                    'name' => $name,
                    'image_url' => null,
                    'country_code' => null,
                    'country' => null,
                ]);
            }

            $externalVideo['artists'] = collect($names)->map(fn (string $name): array => (array) $metadata->get(
                Str::lower(preg_replace('/[^a-z0-9]+/', '', Str::ascii($name)) ?? ''),
                ['name' => $name],
            ))->values()->all();
            $externalVideo['artistName'] = implode(', ', $names);
            $artists = $songImport->syncExternalArtists($externalVideo, auth('admin')->user(), $names);
            $items = collect($artists)->map(function ($artist): array {
                $countryCode = $artist->country_code ?: null;

                return [
                    'id' => (string) $artist->getKey(),
                    'name' => $artist->name,
                    'slug' => $artist->slug,
                    'avatar_url' => $artist->avatar_url,
                    'country_code' => $countryCode,
                    'country' => filled($countryCode)
                        ? config('music.countries.'.$countryCode, $countryCode)
                        : null,
                ];
            })->values();

            return [
                'ids' => $items->pluck('id')->all(),
                'items' => $items->all(),
            ];
        } catch (Throwable $exception) {
            report($exception);

            return null;
        }
    }
}
