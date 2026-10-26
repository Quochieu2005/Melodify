<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Playlist;
use App\Models\PlaylistFavorite;
use App\Models\PlaylistShare;
use App\Models\PlaylistSong;
use App\Models\Song;
use App\Services\CloudinaryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Throwable;

class UserPlaylistController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $userId = (string) $request->user()->getKey();
        $playlists = Playlist::query()
            ->where('user_id', $userId)
            ->orderByDesc('updated_at')
            ->get();

        return response()->json([
            'data' => $playlists->map(fn (Playlist $playlist): array => $this->playlistSummary($playlist))->values(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'visibility' => ['sometimes', 'in:public,private'],
        ]);
        $userId = (string) $request->user()->getKey();
        $baseSlug = Str::slug($data['name']) ?: 'playlist';
        $playlist = Playlist::query()->create([
            'user_id' => $userId,
            'name' => trim($data['name']),
            'slug' => $baseSlug.'-'.Str::lower(Str::random(8)),
            'type' => 'personal',
            'type_custom' => 'Playlist cá nhân',
            'description' => null,
            'cover_url' => null,
            'visibility' => $data['visibility'] ?? 'private',
            'is_system' => false,
            'sort_order' => 0,
            'status' => 'active',
        ]);

        if ((string) $playlist->visibility === 'public') {
            $this->invalidateCatalogCache();
        }

        return response()->json(['data' => $this->playlistSummary($playlist)], 201);
    }

    public function update(Request $request, string $playlistId, CloudinaryService $cloudinary): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'min:1', 'max:100'],
            'visibility' => ['sometimes', 'required', 'in:public,private'],
            'cover_image_file' => ['sometimes', 'image', 'mimes:jpg,jpeg,png', 'max:5120', 'dimensions:min_width=640,min_height=640'],
        ], [
            'cover_image_file.image' => 'Ảnh bìa playlist không hợp lệ.',
            'cover_image_file.mimes' => 'Ảnh bìa playlist chỉ hỗ trợ JPG hoặc PNG.',
            'cover_image_file.max' => 'Ảnh bìa playlist không được lớn hơn 5 MB.',
            'cover_image_file.dimensions' => 'Ảnh bìa playlist cần có kích thước tối thiểu 640 × 640 px.',
        ]);
        if (array_key_exists('name', $data) && trim($data['name']) === '') {
            throw ValidationException::withMessages(['name' => 'Tên playlist không được để trống.']);
        }

        $playlist = Playlist::query()
            ->where('user_id', (string) $request->user()->getKey())
            ->findOrFail($playlistId);
        abort_unless(! (bool) $playlist->is_system, 404);
        $uploadedImage = null;

        try {
            $updates = [];
            if (array_key_exists('name', $data)) {
                $updates['name'] = trim($data['name']);
            }
            if (array_key_exists('visibility', $data)) {
                $updates['visibility'] = $data['visibility'];
            }
            if ($request->hasFile('cover_image_file')) {
                $coverPublicId = Str::slug('playlist-'.$playlistId.'-cover').'-'.now()->format('Y-m-d').'-'.Str::lower(Str::random(10));
                $uploadedImage = $cloudinary->uploadImage(
                    $request->file('cover_image_file'),
                    config('cloudinary.image_folder', 'melodify/covers'),
                    $coverPublicId,
                );
                $coverUrl = (string) ($uploadedImage['secure_url'] ?? $uploadedImage['url'] ?? '');
                if ($coverUrl === '') {
                    throw new RuntimeException('Cloudinary không trả về URL cho ảnh bìa playlist.');
                }
                $updates['cover_url'] = $coverUrl;
                $updates['cover_public_id'] = (string) ($uploadedImage['public_id'] ?? $coverPublicId);
            }

            if ($updates !== []) {
                $playlist->update($updates);
            }
            $this->syncAutomaticCover($playlist);
        } catch (Throwable $exception) {
            if (filled($uploadedImage['public_id'] ?? null)) {
                try {
                    $cloudinary->deleteImage((string) $uploadedImage['public_id']);
                } catch (Throwable $cleanupException) {
                    report($cleanupException);
                }
            }
            report($exception);

            return response()->json(['message' => 'Không thể cập nhật playlist lúc này. Vui lòng thử lại.'], 503);
        }

        $this->invalidateCatalogCache();

        return response()->json([
            'message' => 'Đã cập nhật playlist.',
            'data' => $this->playlistSummary($playlist->fresh()),
        ]);
    }

    public function destroy(Request $request, string $playlistId): JsonResponse
    {
        $playlist = Playlist::query()
            ->where('user_id', (string) $request->user()->getKey())
            ->findOrFail($playlistId);
        abort_unless(! (bool) $playlist->is_system, 404);

        $playlistKey = (string) $playlist->getKey();
        PlaylistSong::query()->where('playlist_id', $playlistKey)->delete();
        PlaylistFavorite::query()->where('playlist_id', $playlistKey)->delete();
        PlaylistShare::query()->where('playlist_id', $playlistKey)->delete();
        $playlist->delete();
        $this->invalidateCatalogCache();

        return response()->json(['message' => 'Đã xóa playlist.']);
    }

    public function addSongs(Request $request, string $playlistId): JsonResponse
    {
        $data = $request->validate([
            'song_ids' => ['required', 'array', 'min:1', 'max:500'],
            'song_ids.*' => ['required', 'string', 'distinct', 'max:120'],
        ]);
        $userId = (string) $request->user()->getKey();
        $playlist = Playlist::query()
            ->where('user_id', $userId)
            ->findOrFail($playlistId);
        $songIds = array_values(array_unique(array_map('strval', $data['song_ids'])));
        $songs = Song::query()
            ->whereIn((new Song)->getKeyName(), $songIds)
            ->get();

        if ($songs->count() !== count($songIds)) {
            throw ValidationException::withMessages([
                'song_ids' => 'Một hoặc nhiều bài hát không còn tồn tại.',
            ]);
        }

        $playlistKey = (string) $playlist->getKey();
        $existingIds = PlaylistSong::query()
            ->where('playlist_id', $playlistKey)
            ->pluck('song_id')
            ->map(fn ($songId): string => (string) $songId)
            ->all();
        $existingLookup = array_fill_keys($existingIds, true);
        $position = count($existingIds);
        $addedCount = 0;

        foreach ($songIds as $songId) {
            if (isset($existingLookup[$songId])) {
                continue;
            }

            PlaylistSong::query()->create([
                'playlist_id' => $playlistKey,
                'song_id' => $songId,
                'position' => $position,
                'added_by_user_id' => $userId,
            ]);
            $existingLookup[$songId] = true;
            $position++;
            $addedCount++;
        }

        $this->syncAutomaticCover($playlist);
        $this->invalidateCatalogCache();

        return response()->json([
            'message' => $addedCount > 0 ? 'Đã thêm bài hát vào playlist.' : 'Bài hát đã có trong playlist.',
            'added_count' => $addedCount,
        ]);
    }

    /**
     * @return array{id: string, name: string, slug: string, cover_url: string|null, song_count: int, visibility: string}
     */
    private function playlistSummary(Playlist $playlist): array
    {
        return [
            'id' => (string) $playlist->getKey(),
            'name' => (string) $playlist->name,
            'slug' => (string) $playlist->slug,
            'cover_url' => $playlist->cover_url ? (string) $playlist->cover_url : null,
            'song_count' => PlaylistSong::query()->where('playlist_id', (string) $playlist->getKey())->count(),
            'visibility' => (string) $playlist->visibility,
        ];
    }

    private function syncAutomaticCover(Playlist $playlist): void
    {
        // An uploaded Cloudinary image is an explicit user choice. Otherwise,
        // keep the playlist cover aligned with the song currently at position 1.
        if (filled($playlist->cover_public_id)) {
            return;
        }

        $firstLink = PlaylistSong::query()
            ->where('playlist_id', (string) $playlist->getKey())
            ->orderBy('position')
            ->first();
        $firstSong = $firstLink
            ? Song::query()->find((string) $firstLink->song_id)
            : null;
        $coverUrl = filled($firstSong?->cover_url) ? (string) $firstSong->cover_url : null;

        if ((string) ($playlist->cover_url ?? '') !== (string) ($coverUrl ?? '')) {
            $playlist->update(['cover_url' => $coverUrl]);
        }
    }

    private function invalidateCatalogCache(): void
    {
        Cache::store('file')->forever('api:catalog-content-revision:v1', (string) Str::uuid());
    }
}
