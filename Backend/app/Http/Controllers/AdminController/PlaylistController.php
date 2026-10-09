<?php

namespace App\Http\Controllers\AdminController;

use App\Models\Playlist;
use App\Models\PlaylistSong;
use App\Models\Song;
use App\Models\Artist;
use App\Models\Genre;
use App\Models\Topic;
use App\Models\User;
use App\Rules\PlainText;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Illuminate\View\View;

class PlaylistController extends MediaCatalogController
{
    protected string $model = Playlist::class;

    protected string $resource = 'playlists';

    protected string $title = 'playlist';

    protected string $viewDirectory = 'Admin.playlists';

    protected string $imageUrlField = 'cover_url';

    protected string $imagePublicIdField = 'cover_public_id';

    protected array $columns = [
        'cover_url' => 'Ảnh bìa',
        'name' => 'Tên playlist',
        'type' => 'Nhóm playlist',
        'visibility' => 'Hiển thị',
        'status' => 'Trạng thái',
        'is_system' => 'Hệ thống',
    ];

    protected array $formFields = [
        'name' => ['label' => 'Tên playlist', 'required' => true],
        'type' => ['label' => 'Nhóm playlist', 'type' => 'select', 'required' => true, 'options' => []],
        'type_custom' => ['label' => 'Tên nhóm playlist', 'type' => 'text'],
        'slug' => ['label' => 'Slug', 'help' => 'Để trống để tự tạo theo tên; slug không được trùng.'],
        'user_id' => ['label' => 'Chủ sở hữu', 'type' => 'select', 'placeholder' => 'Playlist hệ thống', 'option_model' => User::class, 'option_label' => 'email'],
        'description' => ['label' => 'Mô tả', 'type' => 'textarea'],
        'is_system' => ['label' => 'Playlist hệ thống', 'type' => 'checkbox', 'help' => 'Playlist hệ thống không gắn với người dùng cụ thể.'],
        'visibility' => ['label' => 'Quyền hiển thị', 'type' => 'select', 'required' => true, 'options' => ['public' => 'Công khai', 'private' => 'Riêng tư', 'unlisted' => 'Không công khai']],
        'sort_order' => ['label' => 'Thứ tự hiển thị', 'type' => 'number', 'default' => 0, 'required' => true],
        'status' => ['label' => 'Trạng thái', 'type' => 'select', 'required' => true, 'options' => ['active' => 'Hoạt động', 'inactive' => 'Tạm ẩn']],
    ];

    public function index(?Request $request = null): View
    {
        $request ??= request();
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:100', new PlainText()],
            'type' => ['nullable', 'string', 'max:160'],
        ]);
        $search = trim((string) ($filters['q'] ?? ''));
        $typeFilter = trim((string) ($filters['type'] ?? ''));
        $query = Playlist::query();

        if ($search !== '') {
            $query->where(function ($nestedQuery) use ($search): void {
                $nestedQuery
                    ->where('name', 'like', "%{$search}%")
                    ->orWhere('slug', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhere('type_custom', 'like', "%{$search}%");
            });
        }

        $customType = str_starts_with($typeFilter, 'custom:')
            ? trim(substr($typeFilter, 7))
            : null;

        if ($customType !== null && $customType !== '') {
            $query->where('type', 'custom')->where('type_custom', $customType);
        } elseif (array_key_exists($typeFilter, config('playlists.types', []))) {
            $query->where('type', $typeFilter);
        }

        $items = $query
            ->orderBy('sort_order')
            ->latest()
            ->paginate(12)
            ->withQueryString();

        return view('Admin.catalog.index', $this->viewData(compact('items', 'search', 'typeFilter')));
    }

    public function create(): View
    {
        return view("{$this->viewDirectory}.create", $this->viewData([
            'item' => null,
            'fields' => $this->resolvedFields(),
            'mediaAssets' => app(\App\Services\MediaAssetService::class)->latest(),
            'songs' => $this->availableSongs(),
            'selectedSongIds' => [],
            ...$this->relationOptions(),
            'selectedArtistIds' => [],
            'selectedGenreIds' => [],
            'selectedTopicIds' => [],
        ]));
    }

    public function edit(string $id): View
    {
        $item = Playlist::query()->findOrFail($id);

        return view("{$this->viewDirectory}.edit", $this->viewData([
            'item' => $item,
            'fields' => $this->resolvedFields(),
            'mediaAssets' => app(\App\Services\MediaAssetService::class)->latest(),
            'songs' => $this->availableSongs(),
            'selectedSongIds' => PlaylistSong::query()
                ->where('playlist_id', (string) $item->getKey())
                ->orderBy('position')
                ->pluck('song_id')
                ->map(fn ($songId): string => (string) $songId)
                ->all(),
            ...$this->relationOptions(),
            'selectedArtistIds' => $this->selectedIds($item, 'artist_ids'),
            'selectedGenreIds' => $this->selectedIds($item, 'genre_ids'),
            'selectedTopicIds' => $this->selectedIds($item, 'topic_ids'),
        ]));
    }

    public function store(Request $request): RedirectResponse
    {
        $this->normalizeSortOrderInput($request);
        $data = $request->validate($this->rules(null), $this->validationMessages());
        $this->validateSongIds($data['song_ids'] ?? []);
        $this->validateRelationIds($data);
        $playlist = Playlist::query()->create($this->preparePayload($request, $data, null));
        $this->syncSongs($playlist, $data['song_ids'] ?? []);

        return redirect()->route("admin.{$this->resource}.index")
            ->with('success', "Đã tạo {$this->title} thành công.");
    }

    public function update(Request $request, string $id): RedirectResponse
    {
        $item = Playlist::query()->findOrFail($id);
        $this->normalizeSortOrderInput($request);
        $data = $request->validate($this->rules($item), $this->validationMessages());
        $this->validateSongIds($data['song_ids'] ?? []);
        $this->validateRelationIds($data);
        $item->update($this->preparePayload($request, $data, $item));
        $this->syncSongs($item, $data['song_ids'] ?? []);

        return redirect()->route("admin.{$this->resource}.index")
            ->with('success', "Đã cập nhật {$this->title}.");
    }

    public function destroy(string $id): RedirectResponse
    {
        $item = Playlist::query()->findOrFail($id);
        PlaylistSong::query()->where('playlist_id', (string) $item->getKey())->delete();
        $item->delete();

        return back()->with('success', "Đã xóa {$this->title}.");
    }

    protected function rules(?object $item): array
    {
        return [
            'name' => ['bail', 'required', 'string', 'min:1', 'max:180', new PlainText()],
            'type' => ['required', Rule::in(array_keys(config('playlists.types', [])))],
            'type_custom' => ['nullable', 'required_if:type,custom', 'string', 'min:1', 'max:80', new PlainText()],
            'slug' => ['nullable', 'alpha_dash', 'max:220', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', new PlainText()],
            'user_id' => ['nullable', 'string', 'alpha_dash', 'max:64'],
            'description' => ['nullable', 'string', 'max:2500', new PlainText()],
            'is_system' => ['nullable', 'boolean'],
            'visibility' => ['required', 'in:public,private,unlisted'],
            'sort_order' => ['required', 'integer', 'min:0', 'max:9999'],
            'status' => ['required', 'in:active,inactive'],
            'song_ids' => ['nullable', 'array', 'max:500'],
            'song_ids.*' => ['required', 'string', 'max:64', 'distinct'],
            'artist_ids' => ['nullable', 'array', 'max:50'],
            'artist_ids.*' => ['required', 'string', 'max:64', 'distinct'],
            'genre_ids' => ['nullable', 'array', 'max:50'],
            'genre_ids.*' => ['required', 'string', 'max:64', 'distinct'],
            'topic_ids' => ['nullable', 'array', 'max:50'],
            'topic_ids.*' => ['required', 'string', 'max:64', 'distinct'],
            'image' => [$item === null ? 'required_without:image_asset_id' : 'nullable', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120', 'dimensions:max_width=4000,max_height=4000'],
            'image_asset_id' => [$item === null ? 'required_without:image' : 'nullable', 'string', 'alpha_dash', 'max:64'],
        ];
    }

    protected function normalizePayload(array $data, Request $request): array
    {
        $data = parent::normalizePayload($data, $request);

        if (($data['type'] ?? null) !== 'custom') {
            $data['type_custom'] = null;
        }

        if ($data['is_system'] ?? false) {
            $data['user_id'] = null;
        }

        foreach (['song_ids', 'artist_ids', 'genre_ids', 'topic_ids'] as $key) {
            $data[$key] = array_values(array_unique(array_map('strval', $data[$key] ?? [])));
        }

        unset($data['song_ids']);

        return $data;
    }

    protected function preparePayload(Request $request, array $data, ?object $item): array
    {
        $data = parent::preparePayload($request, $data, $item);

        if ($item === null) {
            $data['created_by_admin_id'] = (string) auth('admin')->id();
        }

        return $data;
    }

    protected function validationMessages(): array
    {
        return [
            'type.required' => 'Vui lòng chọn nhóm playlist.',
            'type.in' => 'Nhóm playlist không hợp lệ.',
            'type_custom.required_if' => 'Vui lòng nhập tên nhóm playlist.',
            'type_custom.min' => 'Tên nhóm playlist phải có ít nhất 1 ký tự.',
            'type_custom.max' => 'Tên nhóm playlist không được dài hơn 80 ký tự.',
            'song_ids.array' => 'Danh sách bài hát không hợp lệ.',
            'song_ids.max' => 'Một playlist chỉ được có tối đa 500 bài hát.',
            'song_ids.*.distinct' => 'Một bài hát không được chọn trùng.',
            'artist_ids.*.distinct' => 'Một nghệ sĩ không được chọn trùng.',
            'genre_ids.*.distinct' => 'Một thể loại không được chọn trùng.',
            'topic_ids.*.distinct' => 'Một chủ đề không được chọn trùng.',
        ];
    }

    private function availableSongs()
    {
        return Song::query()
            ->whereIn('status', ['draft', 'published'])
            ->orderBy('title')
            ->limit(500)
            ->get();
    }

    private function validateSongIds(array $songIds): void
    {
        foreach ($songIds as $songId) {
            if (! Song::query()->find($songId)) {
                throw ValidationException::withMessages([
                    'song_ids' => 'Một bài hát đã chọn không tồn tại trong kho nhạc.',
                ]);
            }
        }
    }

    /** @param array<string, mixed> $data */
    private function validateRelationIds(array $data): void
    {
        $relations = [
            'artist_ids' => [Artist::class, 'nghệ sĩ'],
            'genre_ids' => [Genre::class, 'thể loại'],
            'topic_ids' => [Topic::class, 'chủ đề'],
        ];

        foreach ($relations as $field => [$model, $label]) {
            foreach ((array) ($data[$field] ?? []) as $id) {
                if (! $model::query()->find($id)) {
                    throw ValidationException::withMessages([
                        $field => "Một {$label} đã chọn không còn tồn tại.",
                    ]);
                }
            }
        }
    }

    /** @return array{artists: mixed, genres: mixed, topics: mixed} */
    private function relationOptions(): array
    {
        return [
            'artists' => Artist::query()->orderBy('name')->limit(300)->get(),
            'genres' => Genre::query()->orderBy('name')->limit(300)->get(),
            'topics' => Topic::query()->orderBy('name')->limit(300)->get(),
        ];
    }

    /** @return array<int, string> */
    private function selectedIds(Playlist $playlist, string $field): array
    {
        return collect($playlist->{$field} ?? [])
            ->filter(fn ($id): bool => filled($id))
            ->map(fn ($id): string => (string) $id)
            ->values()
            ->all();
    }

    private function syncSongs(Playlist $playlist, array $songIds): void
    {
        $playlistId = (string) $playlist->getKey();
        PlaylistSong::query()->where('playlist_id', $playlistId)->delete();

        foreach (array_values(array_unique(array_map('strval', $songIds))) as $position => $songId) {
            PlaylistSong::query()->create([
                'playlist_id' => $playlistId,
                'song_id' => $songId,
                'position' => $position,
                'added_by_admin_id' => (string) auth('admin')->id(),
            ]);
        }
    }

}
