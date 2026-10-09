<?php

namespace App\Http\Controllers\AdminController;

use App\Models\Topic;
use App\Models\Song;
use App\Models\TopicSong;
use App\Rules\PlainText;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Illuminate\View\View;

class TopicController extends MediaCatalogController
{
    protected string $model = Topic::class;

    protected string $resource = 'topics';

    protected string $title = 'chủ đề';

    protected string $viewDirectory = 'Admin.topics';

    protected array $columns = [
        'image_url' => 'Ảnh',
        'name' => 'Tên chủ đề',
        'type' => 'Kiểu',
        'slug' => 'Slug',
        'status' => 'Trạng thái',
    ];

    protected array $formFields = [
        'name' => ['label' => 'Tên chủ đề', 'required' => true],
        'type' => ['label' => 'Kiểu chủ đề', 'type' => 'select', 'required' => true, 'options' => []],
        'type_custom' => ['label' => 'Tên kiểu chủ đề', 'type' => 'text'],
        'slug' => ['label' => 'Slug', 'help' => 'Để trống để tự tạo theo tên; slug không được trùng.'],
        'description' => ['label' => 'Mô tả', 'type' => 'textarea'],
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
        $query = Topic::query();

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
        } elseif (array_key_exists($typeFilter, config('topics.types', []))) {
            if ($typeFilter === 'topic') {
                $query->where(function ($nestedQuery): void {
                    $nestedQuery->where('type', 'topic')->orWhereNull('type');
                });
            } else {
                $query->where('type', $typeFilter);
            }
        }

        $items = $query
            ->orderBy('sort_order')
            ->latest()
            ->paginate(12)
            ->withQueryString();
        return view('Admin.catalog.index', $this->viewData(compact(
            'items',
            'search',
            'typeFilter',
        )));
    }

    protected function rules(?object $item): array
    {
        return [
            'name' => ['bail', 'required', 'string', 'min:1', 'max:150', new PlainText()],
            'type' => ['required', Rule::in(array_keys(config('topics.types', [])))],
            'type_custom' => ['nullable', 'required_if:type,custom', 'string', 'min:1', 'max:80', new PlainText()],
            'slug' => ['nullable', 'alpha_dash', 'max:180', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', new PlainText()],
            'description' => ['nullable', 'string', 'max:2000', new PlainText()],
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
        $item = Topic::query()->findOrFail($id);
        $links = TopicSong::query()
            ->where('topic_id', (string) $item->getKey())
            ->orderBy('position')
            ->paginate(20)
            ->withQueryString();
        $songIds = $links->getCollection()->pluck('song_id')->map(fn ($id): string => (string) $id)->all();
        $songMap = $songIds === []
            ? collect()
            : Song::query()->whereIn((new Song())->getKeyName(), $songIds)->get()->keyBy(fn (Song $song): string => (string) $song->getKey());
        $songs = $links->setCollection(
            $links->getCollection()
                ->map(fn (TopicSong $link) => $songMap->get((string) $link->song_id))
                ->filter()
                ->values()
        );

        return view('Admin.catalog.show', [
            'item' => $item,
            'resource' => $this->resource,
            'resourceTitle' => $this->title,
            'songs' => $songs,
        ]);
    }

    protected function normalizePayload(array $data, Request $request): array
    {
        $data = parent::normalizePayload($data, $request);

        if (($data['type'] ?? null) !== 'custom') {
            $data['type_custom'] = null;
        }

        return $data;
    }

    protected function supplementalFormData(?object $item): array
    {
        return [
            'songs' => Song::query()->orderBy('title')->limit(500)->get(),
            'selectedSongIds' => $item === null
                ? []
                : TopicSong::query()->where('topic_id', (string) $item->getKey())->orderBy('position')->pluck('song_id')->map(fn ($id): string => (string) $id)->all(),
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
        $topicId = (string) $item->getKey();
        TopicSong::query()->where('topic_id', $topicId)->delete();

        foreach (array_values(array_unique(array_map('strval', $data['song_ids'] ?? []))) as $position => $songId) {
            TopicSong::query()->create([
                'topic_id' => $topicId,
                'song_id' => $songId,
                'position' => $position,
                'added_by_admin_id' => (string) auth('admin')->id(),
            ]);
        }
    }

    protected function validationMessages(): array
    {
        return [
            'type.required' => 'Vui lòng chọn kiểu chủ đề.',
            'type.in' => 'Kiểu chủ đề không hợp lệ.',
            'type_custom.required_if' => 'Vui lòng nhập tên kiểu chủ đề.',
            'type_custom.min' => 'Tên kiểu chủ đề phải có ít nhất 1 ký tự.',
            'type_custom.max' => 'Tên kiểu chủ đề không được dài hơn 80 ký tự.',
        ];
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
