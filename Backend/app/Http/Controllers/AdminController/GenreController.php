<?php

namespace App\Http\Controllers\AdminController;

use App\Models\Genre;
use App\Models\Song;
use App\Models\SongGenre;
use App\Rules\PlainText;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Illuminate\View\View;

class GenreController extends MediaCatalogController
{
    protected string $model = Genre::class;

    protected string $resource = 'genres';

    protected string $title = 'thể loại';

    protected string $viewDirectory = 'Admin.genres';

    protected array $columns = [
        'image_url' => 'Ảnh',
        'name' => 'Tên thể loại',
        'slug' => 'Slug',
        'status' => 'Trạng thái',
    ];

    protected array $formFields = [
        'name' => ['label' => 'Tên thể loại', 'required' => true],
        'slug' => ['label' => 'Slug', 'help' => 'Để trống để tự tạo theo tên; slug không được trùng.'],
        'description' => ['label' => 'Mô tả', 'type' => 'textarea'],
        'sort_order' => ['label' => 'Thứ tự hiển thị', 'type' => 'number', 'default' => 0, 'required' => true],
        'status' => ['label' => 'Trạng thái', 'type' => 'select', 'required' => true, 'options' => ['active' => 'Hoạt động', 'inactive' => 'Tạm ẩn']],
    ];

    protected function rules(?object $item): array
    {
        return [
            'name' => ['bail', 'required', 'string', 'min:1', 'max:150', new PlainText()],
            'slug' => ['nullable', 'alpha_dash', 'max:180', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', new PlainText()],
            'description' => ['nullable', 'string', 'max:2000', new PlainText()],
            // Several records may intentionally share a display position.  The
            // catalog query resolves a tie by creation date, so editing a record
            // must not be rejected just because another record uses this number.
            'sort_order' => ['required', 'integer', 'min:0', 'max:9999'],
            'status' => ['required', 'in:active,inactive'],
            'song_ids' => ['nullable', 'array', 'max:500'],
            'song_ids.*' => ['required', 'string', 'max:64', 'distinct'],
            'image' => [$item === null ? 'required_without:image_asset_id' : 'nullable', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120', 'dimensions:max_width=4000,max_height=4000'],
            'image_asset_id' => [$item === null ? 'required_without:image' : 'nullable', 'string', 'alpha_dash', 'max:64'],
        ];
    }

    public function show(string $id): View
    {
        $item = Genre::query()->findOrFail($id);
        $songIds = SongGenre::query()->where('genre_id', (string) $item->getKey())->pluck('song_id')->all();

        return view('Admin.catalog.show', [
            'item' => $item,
            'resource' => $this->resource,
            'resourceTitle' => $this->title,
            'songs' => $songIds === []
                ? Song::query()->where('album_id', '__no_song__')->paginate(20)->withQueryString()
                : Song::query()
                    ->whereIn((new Song())->getKeyName(), $songIds)
                    ->orderBy('title')
                    ->paginate(20)
                    ->withQueryString(),
        ]);
    }

    protected function supplementalFormData(?object $item): array
    {
        return [
            'songs' => Song::query()->orderBy('title')->limit(500)->get(),
            'selectedSongIds' => $item === null
                ? []
                : SongGenre::query()->where('genre_id', (string) $item->getKey())->pluck('song_id')->map(fn ($id): string => (string) $id)->all(),
        ];
    }

    protected function preparePayload(Request $request, array $data, ?object $item): array
    {
        $this->validateSongIds($data['song_ids'] ?? []);
        $data = parent::preparePayload($request, $data, $item);
        unset($data['song_ids']);

        return $data;
    }

    protected function afterPersist(object $item, array $data): void
    {
        $genreId = (string) $item->getKey();
        SongGenre::query()->where('genre_id', $genreId)->delete();

        foreach (array_values(array_unique(array_map('strval', $data['song_ids'] ?? []))) as $songId) {
            SongGenre::query()->create(['song_id' => $songId, 'genre_id' => $genreId]);
        }
    }

    private function validateSongIds(array $songIds): void
    {
        foreach ($songIds as $songId) {
            if (! Song::query()->find($songId)) {
                throw ValidationException::withMessages([
                    'song_ids' => 'Một bài hát đã chọn không còn tồn tại trong kho nhạc.',
                ]);
            }
        }
    }
}
