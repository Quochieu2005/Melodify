<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Album;
use App\Models\AlbumFavorite;
use App\Models\Artist;
use App\Models\ArtistFollower;
use App\Models\Favorite;
use App\Models\Playlist;
use App\Models\PlaylistFavorite;
use App\Models\PlaylistSong;
use App\Models\Song;
use App\Models\User;
use App\Models\UserFollower;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserLibraryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $data = $request->validate(['visitor_id' => ['nullable', 'string', 'max:120', 'regex:/^(?:[a-f0-9-]{36}|visitor-\d+-[a-z0-9]+)$/i']]);
        $actorId = (string) ($request->user()?->getKey() ?? ($data['visitor_id'] ?? ''));
        $songIds = Favorite::query()->where('user_id', $actorId)->pluck('song_id')->all();
        $playlistIds = PlaylistFavorite::query()->where('user_id', $actorId)->orderByDesc('created_at')->pluck('playlist_id')->all();
        $albumIds = AlbumFavorite::query()->where('user_id', $actorId)->orderByDesc('created_at')->pluck('album_id')->all();
        $created = $request->user()
            ? Playlist::query()->where('user_id', $actorId)->where('status', 'active')->orderByDesc('updated_at')->get(['_id', 'name', 'slug', 'cover_url'])
            : collect();
        $playlists = $playlistIds === [] ? collect() : Playlist::query()->whereIn('_id', $playlistIds)->where('status', 'active')->whereIn('visibility', ['public', 'unlisted'])->get(['_id', 'name', 'slug', 'cover_url']);
        $allPlaylistIds = $created->merge($playlists)->map(fn (Playlist $playlist): string => (string) $playlist->getKey())->unique()->values()->all();
        $counts = [];
        if ($allPlaylistIds !== []) {
            $rows = PlaylistSong::raw(fn ($collection) => $collection->aggregate([
                ['$match' => ['playlist_id' => ['$in' => $allPlaylistIds]]],
                ['$group' => ['_id' => '$playlist_id', 'count' => ['$sum' => 1]]],
            ]));
            foreach ($rows as $row) {
                $counts[(string) data_get($row, '_id')] = (int) data_get($row, 'count', 0);
            }
        }
        $summary = fn (Playlist $playlist): array => [
            'id' => (string) $playlist->getKey(), 'name' => $playlist->name, 'slug' => $playlist->slug,
            'cover_url' => $playlist->cover_url, 'song_count' => $counts[(string) $playlist->getKey()] ?? 0,
        ];
        $artistIds = ArtistFollower::query()->where('user_id', $actorId)->pluck('artist_id')->all();
        $followingArtists = $artistIds === [] ? collect() : Artist::query()->where('status', 'active')->whereIn('_id', $artistIds)->get(['_id', 'name', 'slug', 'avatar_url']);
        // Load both sides of the social graph together, then resolve each user
        // once. Empty libraries should not issue queries with empty ID lists.
        $userLinks = UserFollower::query()->where(function ($query) use ($actorId): void {
            $query->where('user_id', $actorId)->orWhere('followed_user_id', $actorId);
        })->get(['user_id', 'followed_user_id']);
        $followingIds = $userLinks->where('user_id', $actorId)->pluck('followed_user_id')->all();
        $followerIds = $userLinks->where('followed_user_id', $actorId)->pluck('user_id')->all();
        $userIds = array_values(array_unique([...$followingIds, ...$followerIds]));
        $users = $userIds === [] ? collect() : User::query()->where('status', 'active')->whereIn('_id', $userIds)->get(['_id', 'name', 'username', 'avatar_url']);
        $followingUsers = $users->filter(fn (User $user): bool => in_array((string) $user->getKey(), $followingIds, true));
        $followers = $users->filter(fn (User $user): bool => in_array((string) $user->getKey(), $followerIds, true));
        $albums = $albumIds === [] ? collect() : Album::query()->whereIn('_id', $albumIds)->where('status', 'published')->get(['_id', 'title', 'slug', 'cover_url']);

        return response()->json(['data' => [
            'favorite_song_count' => $songIds === [] ? 0 : Song::query()->whereIn('_id', $songIds)->whereIn('status', ['published', 'draft'])->count(),
            'created_playlists' => $created->map($summary)->values(),
            'favorite_playlists' => $playlists->sortBy(fn (Playlist $playlist): int => (int) array_search((string) $playlist->getKey(), $playlistIds))->map($summary)->values(),
            'favorite_albums' => $albums
                ->sortBy(fn (Album $album): int => (int) array_search((string) $album->getKey(), $albumIds))
                ->map(fn (Album $album): array => ['id' => (string) $album->getKey(), 'title' => $album->title, 'slug' => $album->slug, 'cover_url' => $album->cover_url])->values(),
            'following_artists' => $followingArtists->map(fn (Artist $artist): array => ['id' => (string) $artist->getKey(), 'name' => $artist->name, 'slug' => $artist->slug, 'avatar_url' => $artist->avatar_url])->values(),
            'following_users' => $followingUsers->map(fn (User $user): array => FollowController::userSummary($user))->values(),
            'followers' => $followers->map(fn (User $user): array => FollowController::userSummary($user))->values(),
            'following_count' => $followingArtists->count() + $followingUsers->count(),
            'followers_count' => $followers->count(),
        ]])->header('Cache-Control', 'private, no-store');
    }

    /** Claim the browser's legacy anonymous library once; never accept an account ID as a visitor. */
    public function import(Request $request): JsonResponse
    {
        $data = $request->validate(['visitor_id' => ['required', 'string', 'max:120', 'regex:/^(?:[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}|visitor-\d+-[a-z0-9]+)$/i']]);
        $userId = (string) $request->user()->getKey();
        foreach ([Favorite::class => 'song_id', PlaylistFavorite::class => 'playlist_id', AlbumFavorite::class => 'album_id'] as $model => $field) {
            foreach ($model::query()->where('user_id', $data['visitor_id'])->get() as $favorite) {
                $existing = $model::query()->where('user_id', $userId)->where($field, $favorite->{$field})->exists();
                if ($existing) {
                    $favorite->delete();
                } else {
                    $favorite->update(['user_id' => $userId]);
                }
            }
        }

        return response()->json(['imported' => true]);
    }
}
