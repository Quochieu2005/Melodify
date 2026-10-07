<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Album;
use App\Models\Artist;
use App\Models\Banner;
use App\Models\Genre;
use App\Models\Topic;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CatalogController extends Controller
{
    public function topics(Request $request): JsonResponse
    {
        return $this->collection($request, Topic::class, ['active'], fn (Topic $topic): array => $this->topicData($topic));
    }

    public function topic(string $id): JsonResponse
    {
        return $this->show(Topic::class, $id, ['active'], fn (Topic $topic): array => $this->topicData($topic));
    }

    public function genres(Request $request): JsonResponse
    {
        return $this->collection($request, Genre::class, ['active'], fn (Genre $genre): array => $this->genreData($genre));
    }

    public function genre(string $id): JsonResponse
    {
        return $this->show(Genre::class, $id, ['active'], fn (Genre $genre): array => $this->genreData($genre));
    }

    public function banners(Request $request): JsonResponse
    {
        return $this->collection($request, Banner::class, ['active'], fn (Banner $banner): array => $this->bannerData($banner), 'title');
    }

    public function banner(string $id): JsonResponse
    {
        return $this->show(Banner::class, $id, ['active'], fn (Banner $banner): array => $this->bannerData($banner));
    }

    public function albums(Request $request): JsonResponse
    {
        return $this->collection($request, Album::class, ['published'], fn (Album $album): array => $this->albumData($album), 'title');
    }

    public function album(string $id): JsonResponse
    {
        return $this->show(Album::class, $id, ['published'], fn (Album $album): array => $this->albumData($album));
    }

    public function artists(Request $request): JsonResponse
    {
        return $this->collection($request, Artist::class, ['active'], fn (Artist $artist): array => $this->artistData($artist));
    }

    public function artist(string $id): JsonResponse
    {
        return $this->show(Artist::class, $id, ['active'], fn (Artist $artist): array => $this->artistData($artist));
    }

    private function collection(Request $request, string $model, array $statuses, callable $transform, string $searchField = 'name'): JsonResponse
    {
        $perPage = min(max($request->integer('per_page', 20), 1), 50);
        $query = $model::query()->whereIn('status', $statuses);

        if ($request->filled('q')) {
            $term = trim((string) $request->input('q'));
            $query->where($searchField, 'like', "%{$term}%");
        }

        $items = $query
            ->orderBy('sort_order')
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return response()->json([
            'data' => collect($items->items())->map($transform)->values()->all(),
            'meta' => [
                'current_page' => $items->currentPage(),
                'last_page' => $items->lastPage(),
                'per_page' => $items->perPage(),
                'total' => $items->total(),
            ],
        ]);
    }

    private function show(string $model, string $id, array $statuses, callable $transform): JsonResponse
    {
        $item = $model::query()->whereIn('status', $statuses)->findOrFail($id);

        return response()->json(['data' => $transform($item)]);
    }

    private function topicData(Topic $topic): array
    {
        return [
            'id' => (string) $topic->getKey(),
            'name' => $topic->name,
            'slug' => $topic->slug,
            'description' => $topic->description,
            'image_url' => $topic->image_url,
            'sort_order' => (int) ($topic->sort_order ?? 0),
            'status' => $topic->status,
        ];
    }

    private function genreData(Genre $genre): array
    {
        return [
            'id' => (string) $genre->getKey(),
            'name' => $genre->name,
            'slug' => $genre->slug,
            'description' => $genre->description,
            'image_url' => $genre->image_url,
            'sort_order' => (int) ($genre->sort_order ?? 0),
            'status' => $genre->status,
        ];
    }

    private function bannerData(Banner $banner): array
    {
        return [
            'id' => (string) $banner->getKey(),
            'title' => $banner->title,
            'slug' => $banner->slug,
            'image_url' => $banner->image_url,
            'link_url' => $banner->link_url,
            'sort_order' => (int) ($banner->sort_order ?? 0),
            'status' => $banner->status,
        ];
    }

    private function albumData(Album $album): array
    {
        $artist = $album->artist;

        return [
            'id' => (string) $album->getKey(),
            'title' => $album->title,
            'slug' => $album->slug,
            'artist_id' => $album->artist_id ? (string) $album->artist_id : null,
            'artist' => $artist ? $this->artistData($artist) : null,
            'release_date' => $album->release_date?->toDateString(),
            'cover_url' => $album->cover_url,
            'status' => $album->status,
        ];
    }

    private function artistData(Artist $artist): array
    {
        return [
            'id' => (string) $artist->getKey(),
            'name' => $artist->name,
            'slug' => $artist->slug,
            'bio' => $artist->bio,
            'avatar_url' => $artist->avatar_url,
            'verified' => (bool) $artist->verified,
            'status' => $artist->status,
        ];
    }
}
