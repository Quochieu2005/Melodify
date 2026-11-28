<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Album;
use App\Models\Artist;
use App\Models\Playlist;
use App\Models\PlaylistSong;
use App\Models\RecentItem;
use App\Models\Song;
use App\Models\SongVideo;
use App\Services\Analytics\EventCounts;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;

/** "Nghe gần đây": what an account or an anonymous visitor opened recently, kept on the server. */
class RecentHistoryController extends Controller
{
    public const CATEGORIES = ['song', 'playlist', 'album', 'artist', 'video'];

    /** The most items kept for one person; the oldest are dropped. */
    public const LIMIT = 100;

    private const VISITOR_RULE = ['nullable', 'string', 'max:120', 'regex:/^(?:[a-f0-9-]{36}|visitor-\d+-[a-z0-9]+)$/i'];

    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'visitor_id' => self::VISITOR_RULE,
            'category' => ['nullable', Rule::in(self::CATEGORIES)],
        ]);
        $actorId = $this->actorId($request, $data['visitor_id'] ?? null);
        if ($actorId === '') {
            return response()->json(['data' => []])->header('Cache-Control', 'private, no-store');
        }

        $query = RecentItem::query()->where('actor_id', $actorId);
        if (isset($data['category'])) {
            $query->where('category', $data['category']);
        }
        $entries = $query->orderByDesc('played_at')->limit(self::LIMIT)->get();

        $byCategory = $entries->groupBy('category')->map(fn (Collection $group): array => $group->pluck('item_id')->map(fn ($id): string => (string) $id)->unique()->values()->all());
        $cards = [];
        foreach ($byCategory as $category => $ids) {
            $cards[$category] = $this->cards((string) $category, $ids);
        }

        // Newest first; an item the catalog no longer shows (deleted, hidden, private) is left out.
        $items = $entries->map(function (RecentItem $entry) use ($cards): ?array {
            $card = $cards[(string) $entry->category][(string) $entry->item_id] ?? null;

            return $card === null ? null : $card + ['played_at' => $entry->played_at?->toIso8601String()];
        })->filter()->values()->all();

        return response()->json(['data' => $items])->header('Cache-Control', 'private, no-store');
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'visitor_id' => self::VISITOR_RULE,
            'category' => ['required', Rule::in(self::CATEGORIES)],
            'id' => ['required', 'string', 'max:64'],
        ]);
        $actorId = $this->actorId($request, $data['visitor_id'] ?? null);
        if ($actorId === '') {
            return response()->json(['message' => 'Thiếu mã khách để lưu lịch sử.'], 422);
        }
        // Only something that exists and is public can be remembered.
        if ($this->cards($data['category'], [$data['id']]) === []) {
            return response()->json(['message' => 'Không tìm thấy nội dung này.'], 404);
        }

        RecentItem::query()->updateOrCreate(
            ['actor_id' => $actorId, 'category' => $data['category'], 'item_id' => $data['id']],
            ['played_at' => now()],
        );

        // Keep the newest LIMIT items of this person.
        $stale = RecentItem::query()->where('actor_id', $actorId)->orderByDesc('played_at')->skip(self::LIMIT)->take(50)->get(['_id'])
            ->map(fn (RecentItem $entry): string => (string) $entry->getKey())->all();
        if ($stale !== []) {
            RecentItem::query()->whereIn('_id', $stale)->delete();
        }

        return response()->json(['recorded' => true]);
    }

    public function destroy(Request $request): JsonResponse
    {
        $data = $request->validate([
            'visitor_id' => self::VISITOR_RULE,
            'category' => ['required', Rule::in(self::CATEGORIES)],
            'ids' => ['required', 'array', 'min:1', 'max:'.self::LIMIT],
            'ids.*' => ['string', 'max:64'],
        ]);
        $actorId = $this->actorId($request, $data['visitor_id'] ?? null);
        if ($actorId === '') {
            return response()->json(['deleted' => 0]);
        }

        $deleted = RecentItem::query()
            ->where('actor_id', $actorId)
            ->where('category', $data['category'])
            ->whereIn('item_id', array_values(array_unique($data['ids'])))
            ->delete();

        return response()->json(['deleted' => (int) $deleted]);
    }

    private function actorId(Request $request, ?string $visitorId): string
    {
        return (string) ($request->user()?->getKey() ?? ($visitorId ?? ''));
    }

    /**
     * What the history shows for these ids: only items that exist and that anyone can open.
     *
     * @param  list<string>  $ids
     * @return array<string, array<string, mixed>> id => card
     */
    private function cards(string $category, array $ids): array
    {
        if ($ids === []) {
            return [];
        }

        try {
            return match ($category) {
                'song' => $this->songCards($ids),
                'playlist' => $this->playlistCards($ids),
                'album' => $this->albumCards($ids),
                'artist' => $this->artistCards($ids),
                'video' => $this->videoCards($ids),
                default => [],
            };
        } catch (\Throwable) {
            // A made-up id that is not a valid MongoDB id finds nothing.
            return [];
        }
    }

    private function songCards(array $ids): array
    {
        $cards = [];
        foreach (Song::query()->whereIn('_id', $ids)->whereIn('status', ['published', 'draft'])->get() as $song) {
            $id = (string) $song->getKey();
            $cards[$id] = [
                'id' => $id,
                'category' => 'song',
                'title' => (string) $song->title,
                'subtitle' => (string) ($song->artist_name ?: 'Nghệ sĩ chưa cập nhật'),
                'slug' => $song->slug,
                'image_url' => $song->cover_url,
                'duration_seconds' => $song->duration_seconds !== null ? (int) $song->duration_seconds : null,
                'publisher' => 'Melodify',
            ];
        }

        return $cards;
    }

    private function playlistCards(array $ids): array
    {
        $playlists = Playlist::query()->whereIn('_id', $ids)->where('status', 'active')->whereIn('visibility', ['public', 'unlisted'])->get();
        $counts = $playlists->isEmpty() ? [] : EventCounts::by(PlaylistSong::class, 'playlist_id', match: ['playlist_id' => ['$in' => $playlists->map(fn (Playlist $playlist): string => (string) $playlist->getKey())->all()]]);
        $cards = [];
        foreach ($playlists as $playlist) {
            $id = (string) $playlist->getKey();
            $cards[$id] = [
                'id' => $id,
                'category' => 'playlist',
                'title' => (string) $playlist->name,
                'subtitle' => ($counts[$id] ?? 0).' bài hát',
                'slug' => $playlist->slug,
                'image_url' => $playlist->cover_url,
            ];
        }

        return $cards;
    }

    private function albumCards(array $ids): array
    {
        $albums = Album::query()->whereIn('_id', $ids)->where('status', 'published')->get();
        $artistIds = $albums->pluck('artist_id')->filter()->map(fn ($id): string => (string) $id)->unique()->values()->all();
        $artists = $artistIds === [] ? collect() : Artist::query()->whereIn('_id', $artistIds)->get(['name'])->mapWithKeys(fn (Artist $artist): array => [(string) $artist->getKey() => $artist->name]);
        $cards = [];
        foreach ($albums as $album) {
            $id = (string) $album->getKey();
            $cards[$id] = [
                'id' => $id,
                'category' => 'album',
                'title' => (string) $album->title,
                'subtitle' => (string) ($artists->get((string) $album->artist_id) ?: 'Album'),
                'slug' => $album->slug,
                'image_url' => $album->cover_url,
            ];
        }

        return $cards;
    }

    private function artistCards(array $ids): array
    {
        $cards = [];
        foreach (Artist::query()->whereIn('_id', $ids)->where('status', 'active')->get() as $artist) {
            $id = (string) $artist->getKey();
            $cards[$id] = [
                'id' => $id,
                'category' => 'artist',
                'title' => (string) $artist->name,
                'subtitle' => 'Nghệ sĩ',
                'slug' => $artist->slug,
                'image_url' => $artist->avatar_url,
            ];
        }

        return $cards;
    }

    private function videoCards(array $ids): array
    {
        $cards = [];
        foreach (SongVideo::query()->whereIn('_id', $ids)->where('status', 'active')->get() as $video) {
            $id = (string) $video->getKey();
            $names = collect((array) ($video->artists ?? []))->map(fn ($artist): string => (string) (is_array($artist) ? ($artist['name'] ?? '') : ''))->filter()->implode(', ');
            $cards[$id] = [
                'id' => $id,
                'category' => 'video',
                'title' => (string) $video->title,
                'subtitle' => $names !== '' ? $names : 'Video',
                'slug' => $video->slug,
                'image_url' => $video->thumbnail_url,
                'duration_seconds' => $video->duration_seconds !== null ? (int) $video->duration_seconds : null,
            ];
        }

        return $cards;
    }
}
