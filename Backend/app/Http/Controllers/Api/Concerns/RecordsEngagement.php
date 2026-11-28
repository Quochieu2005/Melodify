<?php

namespace App\Http\Controllers\Api\Concerns;

use App\Models\AlbumFavorite;
use App\Models\AlbumShare;
use App\Models\Artist;
use App\Models\ArtistViewEvent;
use App\Models\ChartShare;
use App\Models\Favorite;
use App\Models\PlaylistFavorite;
use App\Models\PlaylistShare;
use App\Models\SongPlayEvent;
use App\Models\SongShare;
use App\Models\VideoFavorite;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

trait RecordsEngagement
{
    /**
     * True when this view or share should be counted. One person counts once per window: the account, or for guests
     * the visitor id the client sent. A script can send a new visitor id with every request, so guests are also capped
     * per address (many real visitors can share one address on a mobile network or in a school, so the cap is a
     * ceiling, not one per address).
     */
    /** The cache key that remembers a person has already been counted for this target. */
    private function engagementKey(string $type, string $targetId, string $channel, Request $request, ?string $visitorId): string
    {
        $userId = $request->user()?->getKey();
        $guestId = trim((string) $visitorId);
        $person = $userId ? 'user:'.$userId : 'guest:'.($guestId !== '' ? $guestId : 'ip:'.$request->ip());

        return "{$type}:{$targetId}:{$channel}:".hash('sha256', $person);
    }

    private function firstEngagement(Request $request, string $type, string $targetId, ?string $visitorId, int $visitorWindowSeconds, string $channel = '', int $addressLimit = 10, int $addressWindowSeconds = 1800): bool
    {
        $store = Cache::store('file');

        if (! $store->add($this->engagementKey($type, $targetId, $channel, $request, $visitorId), true, $visitorWindowSeconds)) {
            return false;
        }
        if ($request->user()?->getKey()) {
            return true;
        }

        $addressKey = "{$type}-address:{$targetId}:{$channel}:".hash('sha256', (string) $request->ip());
        $store->add($addressKey, 0, $addressWindowSeconds);

        return $store->increment($addressKey) <= $addressLimit;
    }

    public function recordAlbumShare(string $slug, Request $request): JsonResponse
    {
        $album = $this->findPublishedAlbum($slug);
        abort_unless($album, 404, 'Không tìm thấy album.');

        $data = $request->validate([
            'visitor_id' => ['nullable', 'string', 'max:120'],
            'source' => ['nullable', 'string', 'in:facebook,copy_link,web', 'max:30'],
        ]);
        $albumId = (string) $album->getKey();
        $recorded = $this->firstEngagement($request, 'share-album', $albumId, $data['visitor_id'] ?? null, 1800, $data['source'] ?? 'web');
        if ($recorded) {
            AlbumShare::query()->create([
                'album_id' => $albumId,
                'visitor_id' => $this->engagementActorId($request, $data['visitor_id'] ?? null),
                'source' => $data['source'] ?? 'web',
            ]);
        }

        return response()->json([
            'recorded' => $recorded,
            'shares' => AlbumShare::query()->where('album_id', $albumId)->count(),
        ]);
    }

    public function recordPlaylistShare(string $slug, Request $request): JsonResponse
    {
        $playlist = $this->findPublicPlaylist($slug);
        abort_unless($playlist, 404, 'Không tìm thấy playlist.');

        $data = $request->validate([
            'visitor_id' => ['nullable', 'string', 'max:120'],
            'source' => ['nullable', 'string', 'in:facebook,copy_link', 'max:30'],
        ]);
        $playlistId = (string) $playlist->getKey();
        $recorded = $this->firstEngagement($request, 'share-playlist', $playlistId, $data['visitor_id'] ?? null, 1800, $data['source'] ?? 'copy_link');
        if ($recorded) {
            PlaylistShare::query()->create([
                'playlist_id' => $playlistId,
                'visitor_id' => $this->engagementActorId($request, $data['visitor_id'] ?? null),
                'source' => $data['source'] ?? 'copy_link',
            ]);
        }

        return response()->json([
            'recorded' => $recorded,
            'shares' => PlaylistShare::query()->where('playlist_id', $playlistId)->count(),
        ]);
    }

    public function recordChartShare(string $slug, Request $request): JsonResponse
    {
        abort_unless(collect($this->chartDefinitions())->contains(fn (array $chart): bool => $chart['slug'] === $slug), 404, 'Không tìm thấy bảng xếp hạng.');

        $data = $request->validate([
            'visitor_id' => ['nullable', 'string', 'max:120'],
            'source' => ['nullable', 'string', 'in:facebook,copy_link,web', 'max:30'],
        ]);
        $recorded = $this->firstEngagement($request, 'share-chart', $slug, $data['visitor_id'] ?? null, 1800, $data['source'] ?? 'web');
        if ($recorded) {
            ChartShare::query()->create([
                'chart_slug' => $slug,
                'visitor_id' => $this->engagementActorId($request, $data['visitor_id'] ?? null),
                'source' => $data['source'] ?? 'web',
            ]);
        }

        return response()->json([
            'recorded' => $recorded,
            'shares' => ChartShare::query()->where('chart_slug', $slug)->count(),
        ]);
    }

    public function recordVideoShare(string $slug, Request $request): JsonResponse
    {
        $data = $request->validate([
            'visitor_id' => ['nullable', 'string', 'max:120'],
            'source' => ['nullable', 'in:web,copy_link,facebook'],
        ]);
        $video = $this->activeVideoByIdentifier($slug);
        abort_unless($video, 404, 'Không tìm thấy video.');
        $recorded = $this->firstEngagement($request, 'share-video', (string) $video->getKey(), $data['visitor_id'] ?? null, 1800, $data['source'] ?? 'web');
        if ($recorded) {
            $video->increment('share_count');
        }

        return response()->json([
            'recorded' => $recorded,
            'shares' => (int) ($video->fresh()?->share_count ?? 0),
        ]);
    }

    public function recordSongShare(string $slug, Request $request): JsonResponse
    {
        $song = $this->localSongById($slug);

        abort_unless($song, 404, 'Bài hát chưa được lưu trong kho nhạc.');

        $data = $request->validate([
            'visitor_id' => ['nullable', 'string', 'max:120'],
            'source' => ['nullable', 'string', 'max:30'],
        ]);
        $actorId = $this->engagementActorId($request, $data['visitor_id'] ?? null);
        $recorded = $this->firstEngagement($request, 'share-song', (string) $song->getKey(), $data['visitor_id'] ?? null, 1800, $data['source'] ?? 'web');

        if ($recorded) {
            SongShare::query()->create([
                'song_id' => (string) $song->getKey(),
                'visitor_id' => $actorId,
                'source' => $data['source'] ?? 'web',
            ]);

            $this->forgetSongDetailCache($song, $slug);
        }

        return response()->json([
            'recorded' => $recorded,
            'shares' => $this->songShareCount($song),
        ]);
    }

    public function recordSongView(string $slug, Request $request): JsonResponse
    {
        $song = $this->localSongById($slug);

        abort_unless($song, 404, 'Bài hát chưa được lưu trong kho nhạc.');

        $data = $request->validate([
            'visitor_id' => ['nullable', 'string', 'max:120'],
            'source' => ['nullable', 'string', 'max:30'],
        ]);
        $visitorId = trim((string) ($data['visitor_id'] ?? ''));
        $visitorId = $visitorId !== '' ? $visitorId : hash('sha256', (string) $request->ip());
        $songId = (string) $song->getKey();
        // A replay within a few seconds is the same listen; a guest can add at most 20 listens of one song per
        // address in half an hour, however many visitor ids a script sends.
        $isNewListen = $this->firstEngagement($request, 'view-song', $songId, $data['visitor_id'] ?? null, 20, '', 20);
        if ($isNewListen) {
            SongPlayEvent::query()->create([
                'user_id' => $request->user()?->getKey() ? (string) $request->user()->getKey() : null,
                'song_id' => $songId,
                'visitor_id' => $visitorId,
                'source' => $data['source'] ?? 'web',
                'started_at' => now(),
                'completed' => false,
            ]);
        }

        // Rollups refresh after one minute. Invalidating on every play
        // defeats caching for every visitor while music is being played.

        return response()->json([
            'recorded' => $isNewListen,
            'views' => $this->songViewCount($song),
        ]);
    }

    public function recordArtistView(string $slug, Request $request): JsonResponse
    {
        $data = $request->validate([
            'visitor_id' => ['nullable', 'string', 'max:120'],
        ]);
        $query = Artist::query()->where('status', 'active');
        $artist = (clone $query)->where('slug', $slug)->first();
        if (! $artist && preg_match('/^[a-f0-9]{24}$/i', $slug)) {
            $artist = (clone $query)->find($slug);
        }
        abort_unless($artist, 404, 'Không tìm thấy nghệ sĩ.');

        $artistId = (string) $artist->getKey();
        $actor = $request->user()
            ? 'user:'.$request->user()->getKey()
            : 'visitor:'.(trim((string) ($data['visitor_id'] ?? '')) ?: $request->ip());
        $visitorHash = hash('sha256', $actor);
        // Repeated renders, refreshes and canonical redirects count as one visit.
        if (! $this->firstEngagement($request, 'view-artist', $artistId, $data['visitor_id'] ?? null, 1800)) {
            return response()->json(['recorded' => false]);
        }
        $cacheKey = $this->engagementKey('view-artist', $artistId, '', $request, $data['visitor_id'] ?? null);

        try {
            ArtistViewEvent::query()->create([
                'artist_id' => $artistId,
                'visitor_hash' => $visitorHash,
                'viewed_at' => now(),
            ]);
        } catch (\Throwable $error) {
            Cache::store('file')->forget($cacheKey);
            throw $error;
        }

        $dateKey = now(config('app.timezone', 'Asia/Ho_Chi_Minh'))->toDateString();
        $revision = $this->catalogContentRevision();
        Cache::store('file')->forget('api:home-bootstrap:v21:'.$dateKey.':'.$revision);
        Cache::store('file')->forget('api:trending-artists:v8:'.$dateKey.':'.$revision);

        return response()->json(['recorded' => true]);
    }

    public function recordVideoView(string $slug, Request $request): JsonResponse
    {
        $data = $request->validate([
            'visitor_id' => ['nullable', 'string', 'max:120'],
        ]);
        $video = $this->activeVideoByIdentifier($slug);
        abort_unless($video, 404, 'Không tìm thấy video.');

        if (! $this->firstEngagement($request, 'view-video', (string) $video->getKey(), $data['visitor_id'] ?? null, 1800)) {
            return response()->json(['recorded' => false, 'views' => (int) ($video->view_count ?? 0)]);
        }
        $cacheKey = $this->engagementKey('view-video', (string) $video->getKey(), '', $request, $data['visitor_id'] ?? null);

        try {
            $video->increment('view_count');
        } catch (\Throwable $exception) {
            Cache::store('file')->forget($cacheKey);
            throw $exception;
        }

        return response()->json(['recorded' => true, 'views' => (int) ($video->fresh()?->view_count ?? 0)]);
    }

    public function toggleAlbumFavorite(string $slug, Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user, 401, 'Vui lòng đăng nhập để yêu thích album.');

        $album = $this->findPublishedAlbum($slug);
        abort_unless($album, 404, 'Không tìm thấy album.');

        $albumId = (string) $album->getKey();
        $actorId = (string) $user->getKey();
        $favorite = AlbumFavorite::query()->where('album_id', $albumId)->where('user_id', $actorId)->first();

        if ($favorite) {
            $favorite->delete();
            $favorited = false;
        } else {
            AlbumFavorite::query()->create(['album_id' => $albumId, 'user_id' => $actorId]);
            $favorited = true;
        }

        return response()->json([
            'favorited' => $favorited,
            'favorites' => AlbumFavorite::query()->where('album_id', $albumId)->count(),
        ]);
    }

    public function togglePlaylistFavorite(string $slug, Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user, 401, 'Vui lòng đăng nhập để yêu thích playlist.');

        $playlist = $this->findPublicPlaylist($slug);
        abort_unless($playlist, 404, 'Không tìm thấy playlist.');

        $playlistId = (string) $playlist->getKey();
        $actorId = (string) $user->getKey();
        $favorite = PlaylistFavorite::query()
            ->where('playlist_id', $playlistId)
            ->where('user_id', $actorId)
            ->first();

        if ($favorite) {
            $favorite->delete();
            $favorited = false;
        } else {
            PlaylistFavorite::query()->create([
                'playlist_id' => $playlistId,
                'user_id' => $actorId,
            ]);
            $favorited = true;
        }

        return response()->json([
            'favorited' => $favorited,
            'favorites' => PlaylistFavorite::query()->where('playlist_id', $playlistId)->count(),
        ]);
    }

    public function toggleVideoFavorite(string $slug, Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user, 401, 'Vui lòng đăng nhập để yêu thích video.');

        $data = $request->validate([
            'favorited' => ['sometimes', 'boolean'],
        ]);
        $video = $this->activeVideoByIdentifier($slug);
        abort_unless($video, 404, 'Không tìm thấy video.');

        $videoId = (string) $video->getKey();
        $actorId = (string) $user->getKey();
        $favorite = VideoFavorite::query()->where('video_id', $videoId)->where('actor_id', $actorId)->first();
        $favorited = array_key_exists('favorited', $data) ? (bool) $data['favorited'] : ! $favorite;

        if ($favorited && ! $favorite) {
            VideoFavorite::query()->firstOrCreate(['video_id' => $videoId, 'actor_id' => $actorId]);
        } elseif (! $favorited && $favorite) {
            $favorite->delete();
        }

        $favorites = VideoFavorite::query()->where('video_id', $videoId)->count();
        $video->forceFill(['favorite_count' => $favorites])->save();

        return response()->json(['favorited' => $favorited, 'favorites' => $favorites]);
    }

    public function toggleSongFavorite(string $slug, Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user, 401, 'Vui lòng đăng nhập để yêu thích bài hát.');

        $song = $this->localSongById($slug);

        abort_unless($song, 404, 'Bài hát chưa được lưu trong kho nhạc.');

        $data = $request->validate([
            'favorited' => ['sometimes', 'boolean'],
        ]);
        $actorId = (string) $user->getKey();
        $favorite = Favorite::query()
            ->where('user_id', $actorId)
            ->where('song_id', (string) $song->getKey())
            ->first();

        if (array_key_exists('favorited', $data)) {
            $favorited = (bool) $data['favorited'];
            if ($favorited && ! $favorite) {
                Favorite::query()->create([
                    'user_id' => $actorId,
                    'song_id' => (string) $song->getKey(),
                ]);
            } elseif (! $favorited && $favorite) {
                $favorite->delete();
            }
        } elseif ($favorite) {
            $favorite->delete();
            $favorited = false;
        } else {
            Favorite::query()->create([
                'user_id' => $actorId,
                'song_id' => (string) $song->getKey(),
            ]);
            $favorited = true;
        }

        $this->forgetSongDetailCache($song, $slug);

        return response()->json([
            'favorited' => $favorited,
            'favorites' => $this->songFavoriteCount($song),
        ]);
    }

    public function reorderFavoriteSongs(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user, 401, 'Vui lòng đăng nhập để sắp xếp bài hát yêu thích.');

        $data = $request->validate([
            'song_ids' => ['required', 'array', 'max:500'],
            'song_ids.*' => ['required', 'string', 'distinct', 'max:120'],
        ]);
        $actorId = (string) $user->getKey();
        $requestedIds = collect($data['song_ids'])->map(fn ($songId): string => (string) $songId)->values();
        $existingIds = Favorite::query()
            ->where('user_id', $actorId)
            ->get(['song_id'])
            ->map(fn (Favorite $favorite): string => (string) $favorite->song_id)
            ->filter()
            ->unique()
            ->values();

        if ($requestedIds->count() !== $existingIds->count()
            || $requestedIds->sort()->values()->all() !== $existingIds->sort()->values()->all()) {
            abort(422, 'Danh sách bài hát yêu thích đã thay đổi. Hãy tải lại trang rồi thử lại.');
        }

        // One bulk write: an update per favorite is one Atlas round trip each (up to 500 for a long list).
        if ($requestedIds->isNotEmpty()) {
            Favorite::raw(fn ($collection) => $collection->bulkWrite(
                $requestedIds->map(fn (string $songId, int $position): array => ['updateOne' => [
                    ['user_id' => $actorId, 'song_id' => $songId],
                    ['$set' => ['sort_order' => $position]],
                ]])->values()->all(),
            ));
        }

        return response()->json(['ordered' => true]);
    }
}
