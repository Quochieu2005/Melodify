<?php

namespace App\Http\Controllers\AdminController;

use App\Http\Controllers\Controller;
use App\Services\MediaAssetService;
use Closure;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Illuminate\View\View;

abstract class MediaCatalogController extends Controller
{
    protected string $model;

    protected string $resource;

    protected string $title;

    protected string $nameField = 'name';

    protected string $slugField = 'slug';

    protected string $imageUrlField = 'image_url';

    protected string $imagePublicIdField = 'image_public_id';

    protected array $formFields = [];

    protected array $columns = [];

    protected string $viewDirectory = 'Admin.catalog';

    abstract protected function rules(?object $item): array;

    protected function validationMessages(): array
    {
        return [];
    }

    public function index(?Request $request = null): View
    {
        $items = ($this->model)::query()
            ->orderBy('sort_order')
            ->latest()
            ->paginate(12);

        return view('Admin.catalog.index', $this->viewData(compact('items')));
    }

    public function create(): View
    {
        return view("{$this->viewDirectory}.create", $this->viewData([
            'item' => null,
            'fields' => $this->resolvedFields(),
            'mediaAssets' => app(MediaAssetService::class)->latest(),
        ]));
    }

    public function store(Request $request): RedirectResponse
    {
        $this->normalizeSortOrderInput($request);
        $data = $request->validate($this->rules(null), $this->validationMessages());
        $payload = $this->preparePayload($request, $data, null);
        ($this->model)::query()->create($payload);

        return redirect()->route("admin.{$this->resource}.index")
            ->with('success', "Đã tạo {$this->title} thành công.");
    }

    public function edit(string $id): View
    {
        $item = ($this->model)::query()->findOrFail($id);

        return view("{$this->viewDirectory}.edit", $this->viewData([
            'item' => $item,
            'fields' => $this->resolvedFields(),
            'mediaAssets' => app(MediaAssetService::class)->latest(),
        ]));
    }

    public function update(Request $request, string $id): RedirectResponse
    {
        $item = ($this->model)::query()->findOrFail($id);
        $this->normalizeSortOrderInput($request);
        $data = $request->validate($this->rules($item), $this->validationMessages());
        $item->update($this->preparePayload($request, $data, $item));

        return redirect()->route("admin.{$this->resource}.index")
            ->with('success', "Đã cập nhật {$this->title}.");
    }

    public function destroy(string $id): RedirectResponse
    {
        $item = ($this->model)::query()->findOrFail($id);
        $item->delete();

        return back()->with('success', "Đã xóa {$this->title}. Ảnh vẫn được giữ trong kho ảnh dùng chung.");
    }

    public function destroyBulk(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'ids' => ['required', 'array', 'min:1', 'max:50'],
            'ids.*' => ['required', 'string', 'max:64', 'distinct'],
        ], [
            'ids.required' => "Hãy chọn ít nhất một {$this->title} để xóa.",
            'ids.array' => 'Danh sách được chọn không hợp lệ.',
            'ids.min' => "Hãy chọn ít nhất một {$this->title} để xóa.",
            'ids.max' => 'Bạn chỉ được xóa tối đa 50 mục mỗi lần.',
            'ids.*.distinct' => 'Các mục được chọn không được trùng lặp.',
        ]);

        $keyName = (new $this->model())->getKeyName();
        $items = ($this->model)::query()
            ->whereIn($keyName, array_values($data['ids']))
            ->get();

        if ($items->isEmpty()) {
            return back()->withErrors([
                'ids' => "Không tìm thấy {$this->title} nào phù hợp để xóa.",
            ]);
        }

        foreach ($items as $item) {
            $item->delete();
        }

        return back()->with('success', "Đã xóa {$items->count()} {$this->title} đã chọn.");
    }

    public function destroyAll(): RedirectResponse
    {
        $items = ($this->model)::query()->get();

        if ($items->isEmpty()) {
            return back()->with('warning', "Hiện chưa có {$this->title} nào để xóa.");
        }

        foreach ($items as $item) {
            $item->delete();
        }

        return back()->with('success', "Đã xóa toàn bộ {$items->count()} {$this->title}.");
    }

    public function toggleStatus(string $id): RedirectResponse
    {
        $item = ($this->model)::query()->findOrFail($id);
        $item->status = $item->status === 'active' ? 'inactive' : 'active';
        $item->save();

        return back()->with('success', "Đã chuyển trạng thái {$this->title} sang ".($item->status === 'active' ? 'Hoạt động' : 'Tạm ẩn').'.');
    }

    protected function preparePayload(Request $request, array $data, ?object $item): array
    {
        $data = $this->normalizePayload($data, $request);
        $data[$this->slugField] = $this->resolveSlug(
            $data[$this->slugField] ?? null,
            $data[$this->nameField] ?? '',
            $item?->getKey(),
        );

        $data['sort_order'] = (int) ($data['sort_order'] ?? 0);
        $media = app(MediaAssetService::class)->resolve(
            $request,
            request()->user('admin'),
            $item ? data_get($item, $this->imageUrlField) : null,
            $item ? data_get($item, $this->imagePublicIdField) : null,
            $item === null,
            $data[$this->slugField] ?? null,
        );
        $data[$this->imageUrlField] = $media['url'];
        $data[$this->imagePublicIdField] = $media['public_id'];

        unset($data['image_asset_id'], $data['image']);

        return $data;
    }

    protected function normalizeSortOrderInput(Request $request): void
    {
        $value = trim((string) $request->input('sort_order', ''));

        if ($value !== '' && preg_match('/^\d+$/', $value) === 1) {
            $request->merge(['sort_order' => (int) $value]);
        }
    }

    protected function uniqueSortOrderRule(?object $item, ?Closure $scope = null): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail) use ($item, $scope): void {
            $query = ($this->model)::query();

            if ($scope !== null) {
                $query = $scope($query);
            }

            $sortOrder = (int) $value;
            $hasDuplicate = $query->get()->contains(function (object $record) use ($item, $sortOrder): bool {
                if ($item !== null && (string) $record->getKey() === (string) $item->getKey()) {
                    return false;
                }

                $storedSortOrder = $record->getRawOriginal('sort_order');

                return is_numeric($storedSortOrder) && (int) $storedSortOrder === $sortOrder;
            });

            if ($hasDuplicate) {
                $fail('Thứ tự hiển thị này đã được sử dụng. Vui lòng chọn số khác.');
            }
        };
    }

    protected function normalizePayload(array $data, Request $request): array
    {
        foreach ($this->formFields as $name => $field) {
            if (($field['type'] ?? '') === 'checkbox') {
                $data[$name] = $request->boolean($name);
            }
        }

        return $data;
    }

    protected function resolveSlug(?string $provided, string $name, mixed $ignoreId = null): string
    {
        $providedSlug = filled($provided);
        $slug = Str::slug($provided ?: $name);

        if ($slug === '') {
            throw ValidationException::withMessages([
                $this->slugField => 'Không thể tạo slug từ tên này.',
            ]);
        }

        $query = function (string $candidate) use ($ignoreId): bool {
            $existing = ($this->model)::query()->where($this->slugField, $candidate)->first();

            return $existing !== null
                && ($ignoreId === null || (string) $existing->getKey() !== (string) $ignoreId);
        };

        if (! $query($slug)) {
            return $slug;
        }

        if ($providedSlug) {
            throw ValidationException::withMessages([
                $this->slugField => 'Slug này đã tồn tại, vui lòng chọn slug khác.',
            ]);
        }

        $base = $slug;
        $suffix = 2;
        do {
            $slug = $base.'-'.$suffix++;
        } while ($query($slug));

        return $slug;
    }

    protected function resolvedFields(): array
    {
        return collect($this->formFields)->map(function (array $field): array {
            if (! isset($field['option_model'])) {
                return $field;
            }

            $model = $field['option_model'];
            $label = $field['option_label'] ?? 'name';
            $field['options'] = $model::query()->orderBy($label)->get()->mapWithKeys(
                fn ($item): array => [(string) $item->getKey() => (string) data_get($item, $label)]
            )->all();

            return $field;
        })->all();
    }

    protected function viewData(array $data): array
    {
        return array_merge([
            'resource' => $this->resource,
            'resourceTitle' => $this->title,
            'fields' => $this->formFields,
            'columns' => $this->columns,
            'imageUrlField' => $this->imageUrlField,
            'imagePublicIdField' => $this->imagePublicIdField,
        ], $data);
    }
}
