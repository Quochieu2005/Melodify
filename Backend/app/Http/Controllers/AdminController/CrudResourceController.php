<?php

namespace App\Http\Controllers\AdminController;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AdminResourceRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Illuminate\View\View;

abstract class CrudResourceController extends Controller
{
    protected string $model;

    protected string $resource;

    protected string $title;

    protected array $fields = [];

    protected array $columns = [];

    protected string $viewDirectory = 'Admin.crud';

    public function index(): View
    {
        $items = ($this->model)::query()->latest()->paginate(10);

        return view('Admin.crud.index', $this->viewData(compact('items')));
    }

    public function create(): View
    {
        return view("{$this->viewDirectory}.create", $this->viewData([
            'item' => null,
            'fields' => $this->resolvedFields(),
        ]));
    }

    public function store(AdminResourceRequest $request): RedirectResponse
    {
        $data = $this->normalize($request->validated());
        ($this->model)::query()->create($data);

        return redirect()->route("admin.{$this->resource}.index")
            ->with('success', "Đã tạo {$this->title} thành công.");
    }

    public function edit(string $id): View|RedirectResponse
    {
        $item = ($this->model)::query()->findOrFail($id);

        return view("{$this->viewDirectory}.edit", $this->viewData([
            'item' => $item,
            'fields' => $this->resolvedFields(),
        ]));
    }

    public function update(AdminResourceRequest $request, string $id): RedirectResponse
    {
        $item = ($this->model)::query()->findOrFail($id);
        $item->update($this->normalize($request->validated(), $item->getKey()));

        return redirect()->route("admin.{$this->resource}.index")
            ->with('success', "Đã cập nhật {$this->title}.");
    }

    public function destroy(string $id): RedirectResponse
    {
        $item = ($this->model)::query()->findOrFail($id);
        $item->delete();

        return back()->with('success', "Đã xóa {$this->title}.");
    }

    protected function normalize(array $data, mixed $ignoreId = null): array
    {
        foreach ($this->fields as $name => $field) {
            if (($field['type'] ?? '') === 'checkbox') {
                $data[$name] = request()->boolean($name);
            }
        }

        if (array_key_exists('password', $data)) {
            if (blank($data['password'])) {
                unset($data['password']);
            } else {
                $data['password'] = Hash::driver('bcrypt')->make($data['password']);
            }
        }

        unset($data['password_confirmation']);

        if (array_key_exists('slug', $data)) {
            $name = (string) ($data['name'] ?? $data['title'] ?? '');
            $providedSlug = trim((string) ($data['slug'] ?? ''));
            $baseSlug = Str::slug($providedSlug !== '' ? $providedSlug : $name);

            if ($baseSlug === '') {
                throw ValidationException::withMessages([
                    'slug' => 'Không thể tạo slug từ tên này.',
                ]);
            }

            $slugExists = function (string $candidate) use ($ignoreId): bool {
                $existing = ($this->model)::query()->where('slug', $candidate)->first();

                return $existing !== null
                    && ($ignoreId === null || (string) $existing->getKey() !== (string) $ignoreId);
            };

            if ($slugExists($baseSlug) && $providedSlug !== '') {
                throw ValidationException::withMessages([
                    'slug' => 'Slug này đã tồn tại, vui lòng chọn slug khác.',
                ]);
            }

            $slug = $baseSlug;
            $suffix = 2;
            while ($slugExists($slug)) {
                $slug = $baseSlug.'-'.$suffix++;
            }

            $data['slug'] = $slug;
        }

        return $data;
    }

    protected function resolvedFields(): array
    {
        return collect($this->fields)->map(function (array $field): array {
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
            'fields' => $this->fields,
            'columns' => $this->columns,
        ], $data);
    }
}
