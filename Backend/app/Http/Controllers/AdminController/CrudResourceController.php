<?php

namespace App\Http\Controllers\AdminController;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AdminResourceRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\View\View;

abstract class CrudResourceController extends Controller
{
    protected string $model;

    protected string $resource;

    protected string $title;

    protected array $fields = [];

    protected array $columns = [];

    public function index(): View
    {
        $items = ($this->model)::query()->latest()->paginate(10);

        return view('Admin.crud.index', $this->viewData(compact('items')));
    }

    public function create(): View
    {
        return view('Admin.crud.form', $this->viewData(['item' => null, 'fields' => $this->resolvedFields()]));
    }

    public function store(AdminResourceRequest $request): RedirectResponse
    {
        $data = $this->normalize($request->validated());
        ($this->model)::query()->create($data);

        return redirect()->route("admin.{$this->resource}.index")
            ->with('success', "Đã tạo {$this->title} thành công.");
    }

    public function edit(string $id): View
    {
        $item = ($this->model)::query()->findOrFail($id);

        return view('Admin.crud.form', $this->viewData(['item' => $item, 'fields' => $this->resolvedFields()]));
    }

    public function update(AdminResourceRequest $request, string $id): RedirectResponse
    {
        $item = ($this->model)::query()->findOrFail($id);
        $item->update($this->normalize($request->validated()));

        return redirect()->route("admin.{$this->resource}.index")
            ->with('success', "Đã cập nhật {$this->title}.");
    }

    public function destroy(string $id): RedirectResponse
    {
        $item = ($this->model)::query()->findOrFail($id);
        $item->delete();

        return back()->with('success', "Đã xóa {$this->title}.");
    }

    protected function normalize(array $data): array
    {
        foreach ($this->fields as $name => $field) {
            if (($field['type'] ?? '') === 'checkbox') {
                $data[$name] = request()->boolean($name);
            }
        }

        if (array_key_exists('password', $data) && blank($data['password'])) {
            unset($data['password']);
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
