<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Artist;
use App\Models\ArtistFollower;
use App\Models\User;
use App\Models\UserFollower;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FollowController extends Controller
{
    public function artist(Request $request, string $identifier): JsonResponse
    {
        $artist = Artist::query()->where('status', 'active')->where(function ($query) use ($identifier): void {
            $query->where('slug', $identifier)->orWhere('_id', $identifier);
        })->firstOrFail();
        $data = $request->validate(['following' => ['required', 'boolean']]);
        $userId = (string) $request->user()->getKey();
        $artistId = (string) $artist->getKey();
        $this->setFollowing(ArtistFollower::class, $userId, 'artist_id', $artistId, $data['following']);

        return response()->json(['following' => $data['following'], 'followers_count' => ArtistFollower::query()->where('artist_id', $artistId)->count()]);
    }

    public function user(Request $request, string $identifier): JsonResponse
    {
        $user = $this->findUser($identifier);
        $data = $request->validate(['following' => ['required', 'boolean']]);
        $userId = (string) $request->user()->getKey();
        $targetId = (string) $user->getKey();
        abort_if($userId === $targetId, 422, 'Bạn không thể tự theo dõi chính mình.');
        $this->setFollowing(UserFollower::class, $userId, 'followed_user_id', $targetId, $data['following']);

        return response()->json(['following' => $data['following'], 'followers_count' => UserFollower::query()->where('followed_user_id', $targetId)->count()]);
    }

    public function show(Request $request, string $identifier): JsonResponse
    {
        $user = $this->findUser($identifier);
        $id = (string) $user->getKey();

        return response()->json(['data' => self::userSummary($user) + [
            'following_count' => ArtistFollower::query()->where('user_id', $id)->count() + UserFollower::query()->where('user_id', $id)->count(),
            'followers_count' => UserFollower::query()->where('followed_user_id', $id)->count(),
            'is_following' => $request->user() && UserFollower::query()->where('user_id', (string) $request->user()->getKey())->where('followed_user_id', $id)->exists(),
        ]])->header('Cache-Control', 'private, no-store');
    }

    public static function userSummary(User $user): array
    {
        return ['id' => (string) $user->getKey(), 'name' => $user->name ?: $user->username, 'username' => $user->username, 'avatar_url' => $user->avatar_url];
    }

    private function findUser(string $identifier): User
    {
        return User::query()->where('status', 'active')->where(function ($query) use ($identifier): void {
            $query->where('username', $identifier)->orWhere('_id', $identifier);
        })->firstOrFail();
    }

    private function setFollowing(string $model, string $userId, string $field, string $targetId, bool $following): void
    {
        if ($following) {
            if (! $model::query()->where('user_id', $userId)->where($field, $targetId)->exists()) {
                $model::query()->firstOrCreate(['_id' => substr(hash('sha256', $model.'|'.$userId.'|'.$targetId), 0, 24)], ['user_id' => $userId, $field => $targetId]);
            }
        } else {
            $model::query()->where('user_id', $userId)->where($field, $targetId)->delete();
        }
    }
}
