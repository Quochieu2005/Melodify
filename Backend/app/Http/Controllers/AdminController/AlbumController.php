<?php

namespace App\Http\Controllers\AdminController;

use App\Http\Requests\Admin\AdminResourceRequest;
use App\Models\Album;
use App\Models\Artist;
use App\Models\Song;
use App\Services\MediaAssetService;
use Illuminate\Http\RedirectResponse;
use Illuminate\View\View;

class AlbumController extends CrudResourceController
{
    protected string $model = Album::class;
    protected string $resource = 'albums';
    protected string $title = 'album';
    protected string $viewDirectory = 'Admin.albums';
    protected array $columns = ['cover_url' => 'Ảnh bìa', 'title' => 'Tên album', 'artist.name' => 'Nghệ sĩ', 'release_date' => 'Ngày phát hành', 'status' => 'Trạng thái'];
    protected array $searchable = ['title', 'slug'];
    protected array $indexWith = ['artist'];

    public function create(): View
    {
        return view('Admin.albums.create', $this->viewData([
            'item' => null,
            ...$this->formOptions(),
            'selectedArtistIds' => [],
            'selectedSongIds' => [],
            'mediaAssets' => app(MediaAssetService::class)->latest(),
        ]));
    }

    public function edit(string $id): View
    {
        $item = Album::query()->findOrFail($id);

        return view('Admin.albums.edit', $this->viewData([
            'item' => $item,
            ...$this->formOptions(),
            'selectedArtistIds' => $this->selectedArtists($item),
            'selectedSongIds' => Song::query()
                ->where('album_id', (string) $item->getKey())
                ->orderBy('title')
                ->pluck((new Song())->getKeyName())
                ->map(fn ($id): string => (string) $id)
                ->all(),
            'mediaAssets' => app(MediaAssetService::class)->latest(),
        ]));
    }

    public function show(string $id): View
    {
        $album = Album::query()->findOrFail($id);
        $artistIds = $this->selectedArtists($album);

        return view('Admin.albums.show', [
            'album' => $album,
            'artists' => $artistIds === []
                ? collect()
                : Artist::query()->whereIn((new Artist())->getKeyName(), $artistIds)->orderBy('name')->get(),
            'songs' => Song::query()
                ->where('album_id', (string) $album->getKey())
                ->orderBy('title')
                ->paginate(20)
                ->withQueryString(),
        ]);
    }

    public function store(AdminResourceRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $album = Album::query()->create($this->payload($request, $data));
        $this->syncSongs($album, $data['song_ids'] ?? []);

        return redirect()->route('admin.albums.index')->with('success', 'Đã tạo album thành công.');
    }

    public function update(AdminResourceRequest $request, string $id): RedirectResponse
    {
        $album = Album::query()->findOrFail($id);
        $data = $request->validated();
        $album->update($this->payload($request, $data, $album));
        $this->syncSongs($album, $data['song_ids'] ?? []);

        return redirect()->route('admin.albums.index')->with('success', 'Đã cập nhật album.');
    }

    /** @return array{artists: mixed, songs: mixed} */
    private function formOptions(): array
    {
        return [
            'artists' => Artist::query()->orderBy('name')->limit(500)->get(),
            'songs' => Song::query()->whereIn('status', ['draft', 'published'])->orderBy('title')->limit(500)->get(),
        ];
    }

    /** @return array<string, mixed> */
    private function payload(AdminResourceRequest $request, array $data, ?Album $album = null): array
    {
        $data = $this->normalize($data, $album?->getKey());
        $artistIds = array_values(array_unique(array_map('strval', $data['artist_ids'] ?? [])));
        $media = app(MediaAssetService::class)->resolve(
            $request,
            $request->user('admin'),
            $album?->cover_url,
            $album?->cover_public_id,
            $album === null,
            $data['slug'] ?? null,
        );

        $data['artist_ids'] = $artistIds;
        // Keep the first artist for current API/list compatibility.
        $data['artist_id'] = $artistIds[0];
        $data['cover_url'] = $media['url'];
        $data['cover_public_id'] = $media['public_id'];
        unset($data['song_ids'], $data['image'], $data['image_asset_id']);

        return $data;
    }

    /** @return array<int, string> */
    private function selectedArtists(Album $album): array
    {
        $ids = $album->artist_ids;
        if (! is_array($ids) || $ids === []) {
            $ids = filled($album->artist_id) ? [$album->artist_id] : [];
        }

        return collect($ids)->filter(fn ($id): bool => filled($id))->map(fn ($id): string => (string) $id)->values()->all();
    }

    /** @param array<int, string> $songIds */
    private function syncSongs(Album $album, array $songIds): void
    {
        $albumId = (string) $album->getKey();
        $songIds = array_values(array_unique(array_map('strval', $songIds)));
        $keyName = (new Song())->getKeyName();
        $currentSongIds = Song::query()->where('album_id', $albumId)->pluck($keyName)->map(fn ($id): string => (string) $id)->all();
        $removedIds = array_values(array_diff($currentSongIds, $songIds));

        if ($removedIds !== []) {
            Song::query()->whereIn($keyName, $removedIds)->update(['album_id' => null]);
        }

        foreach ($songIds as $songId) {
            Song::query()->whereKey($songId)->update(['album_id' => $albumId]);
        }
    }
}
