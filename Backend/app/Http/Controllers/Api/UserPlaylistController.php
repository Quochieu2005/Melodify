<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Playlist;
use App\Models\PlaylistSong;
use App\Models\Song;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

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
            'name' => ['required', 'string', 'max:80'],
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
            'visibility' => 'private',
            'is_system' => false,
            'sort_order' => 0,
            'status' => 'active',
        ]);

        return response()->json(['data' => $this->playlistSummary($playlist)], 201);
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

        if (blank($playlist->cover_url)) {
            $firstSong = $songs->first();
            if ($firstSong && filled($firstSong->cover_url)) {
                $playlist->update(['cover_url' => $firstSong->cover_url]);
            }
        }

        $catalogRevision = (string) Cache::store('file')->get('api:catalog-content-revision:v1', 'initial');
        Cache::store('file')->forget('api:playlist-detail:v1:'.$catalogRevision.':'.sha1($playlistKey));

        return response()->json([
            'message' => $addedCount > 0 ? 'Đã thêm bài hát vào playlist.' : 'Bài hát đã có trong playlist.',
            'added_count' => $addedCount,
        ]);
    }

    /**
     * @return array{id: string, name: string, slug: string, cover_url: string|null, song_count: int}
     */
    private function playlistSummary(Playlist $playlist): array
    {
        return [
            'id' => (string) $playlist->getKey(),
            'name' => (string) $playlist->name,
            'slug' => (string) $playlist->slug,
            'cover_url' => $playlist->cover_url ? (string) $playlist->cover_url : null,
            'song_count' => PlaylistSong::query()->where('playlist_id', (string) $playlist->getKey())->count(),
        ];
    }
}
