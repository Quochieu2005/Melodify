<?php

namespace App\Http\Controllers\AdminController;

use App\Models\Genre;
use App\Models\Playlist;
use App\Rules\PlainText;
use Illuminate\Http\Request;
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
            'playlist_ids' => ['nullable', 'array', 'max:500'],
            'playlist_ids.*' => ['required', 'string', 'max:64', 'distinct'],
            'image' => [$item === null ? 'required_without:image_asset_id' : 'nullable', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120', 'dimensions:max_width=4000,max_height=4000'],
            'image_asset_id' => [$item === null ? 'required_without:image' : 'nullable', 'string', 'alpha_dash', 'max:64'],
        ];
    }

    public function show(string $id): View
    {
        $item = Genre::query()->findOrFail($id);
        $playlists = Playlist::query()
            ->where('genre_ids', (string) $item->getKey())
            ->orderBy('sort_order')
            ->orderBy('name')
            ->paginate(20)
            ->withQueryString();

        return view('Admin.catalog.show', [
            'item' => $item,
            'resource' => $this->resource,
            'resourceTitle' => $this->title,
            'playlists' => $playlists,
        ]);
    }

    protected function supplementalFormData(?object $item): array
    {
        return [
            'playlists' => $this->availablePlaylists(),
            'selectedPlaylistIds' => $this->selectedPlaylistIds($item, 'genre_ids'),
        ];
    }

    protected function preparePayload(Request $request, array $data, ?object $item): array
    {
        $this->validatePlaylistIds($data['playlist_ids'] ?? []);
        $data = parent::preparePayload($request, $data, $item);
        unset($data['playlist_ids']);

        return $data;
    }

    protected function afterPersist(object $item, array $data): void
    {
        $genreId = (string) $item->getKey();
        $this->syncPlaylistRelation('genre_ids', $genreId, $data['playlist_ids'] ?? []);
    }

    protected function validationMessages(): array
    {
        return [
            'playlist_ids.*.distinct' => 'Một playlist không được chọn trùng.',
        ];
    }
}
