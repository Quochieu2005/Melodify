<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Playlist;
use App\Models\PlaylistFavorite;
use App\Models\PlaylistShare;
use App\Models\PlaylistSong;
use App\Models\Song;
use App\Services\Analytics\EventCounts;
use App\Services\CloudinaryService;
use App\Support\CatalogRevision;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Throwable;

class UserPlaylistController extends Controller
{
    private const MAX_PLAYLISTS_PER_USER = 200;

    public function index(Request $request): JsonResponse
    {
        $userId = (string) $request->user()->getKey();
        $playlists = Playlist::query()
            ->where('user_id', $userId)
            ->orderByDesc('updated_at')
            ->get();

        // One aggregate for all song counts: a count per playlist is one Atlas round trip each.
        $counts = $playlists->isEmpty() ? [] : EventCounts::by(PlaylistSong::class, 'playlist_id', match: [
            'playlist_id' => ['$in' => $playlists->map(fn (Playlist $playlist): string => (string) $playlist->getKey())->all()],
        ]);

        return response()->json([
            'data' => $playlists
                ->map(fn (Playlist $playlist): array => $this->playlistSummary($playlist, $counts[(string) $playlist->getKey()] ?? 0))
                ->values(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'visibility' => ['sometimes', 'in:public,private'],
        ]);
        $userId = (string) $request->user()->getKey();
        if (Playlist::query()->where('user_id', $userId)->count() >= self::MAX_PLAYLISTS_PER_USER) {
            throw ValidationException::withMessages(['name' => 'Bạn đã đạt giới hạn '.self::MAX_PLAYLISTS_PER_USER.' playlist. Hãy xóa bớt playlist cũ trước khi tạo mới.']);
        }
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
        $replacedCoverId = (string) ($playlist->cover_public_id ?? '');

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
            if ($replacedCoverId !== '' && isset($updates['cover_public_id']) && $updates['cover_public_id'] !== $replacedCoverId) {
                $this->deleteCover($cloudinary, $replacedCoverId);
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

    public function destroy(Request $request, string $playlistId, CloudinaryService $cloudinary): JsonResponse
    {
        $playlist = Playlist::query()
            ->where('user_id', (string) $request->user()->getKey())
            ->findOrFail($playlistId);
        abort_unless(! (bool) $playlist->is_system, 404);

        $playlistKey = (string) $playlist->getKey();
        PlaylistSong::query()->where('playlist_id', $playlistKey)->delete();
        PlaylistFavorite::query()->where('playlist_id', $playlistKey)->delete();
        PlaylistShare::query()->where('playlist_id', $playlistKey)->delete();
        $coverPublicId = (string) ($playlist->cover_public_id ?? '');
        $playlist->delete();
        if ($coverPublicId !== '') {
            $this->deleteCover($cloudinary, $coverPublicId);
        }
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
        $now = now();
        $rows = [];

        foreach ($songIds as $songId) {
            if (isset($existingLookup[$songId])) {
                continue;
            }

            $rows[] = [
                'playlist_id' => $playlistKey,
                'song_id' => $songId,
                'position' => $position,
                'added_by_user_id' => $userId,
                'created_at' => $now,
                'updated_at' => $now,
            ];
            $existingLookup[$songId] = true;
            $position++;
        }

        // One insert for all songs instead of one round trip per song (up to 500).
        if ($rows !== []) {
            PlaylistSong::query()->insert($rows);
        }
        $addedCount = count($rows);

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
    private function playlistSummary(Playlist $playlist, ?int $songCount = null): array
    {
        return [
            'id' => (string) $playlist->getKey(),
            'name' => (string) $playlist->name,
            'slug' => (string) $playlist->slug,
            'cover_url' => $playlist->cover_url ? (string) $playlist->cover_url : null,
            'song_count' => $songCount ?? PlaylistSong::query()->where('playlist_id', (string) $playlist->getKey())->count(),
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

    /** An uploaded cover that is no longer used would stay on Cloudinary forever. */
    private function deleteCover(CloudinaryService $cloudinary, string $publicId): void
    {
        try {
            $cloudinary->deleteImage($publicId);
        } catch (Throwable $exception) {
            report($exception);
        }
    }

    private function invalidateCatalogCache(): void
    {
        CatalogRevision::bump();
    }
}
