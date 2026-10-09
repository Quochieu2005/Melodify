<?php

namespace App\Http\Controllers\AdminController;

use App\Http\Controllers\Controller;
use App\Models\Artist;
use App\Models\Banner;
use App\Models\Genre;
use App\Models\Playlist;
use App\Models\Topic;
use App\Rules\PlainText;
use App\Services\MediaAssetService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Illuminate\View\View;
use Throwable;

class BannerController extends Controller
{
    public function index(?Request $request = null): View
    {
        $request ??= request();
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:100', new PlainText()],
        ]);
        $search = trim((string) ($filters['q'] ?? ''));
        $query = Banner::query();

        if ($search !== '') {
            $query->where(function ($nestedQuery) use ($search): void {
                $nestedQuery
                    ->where('title', 'like', "%{$search}%")
                    ->orWhere('slug', 'like', "%{$search}%")
                    ->orWhere('link_url', 'like', "%{$search}%")
                    ->orWhere('status', 'like', "%{$search}%");
            });
        }

        $items = $query
            ->orderBy('sort_order')
            ->orderByDesc('created_at')
            ->paginate(12)
            ->withQueryString();

        return view('Admin.banners.index', compact('items', 'search'));
    }

    public function create(): View
    {
        return view('Admin.banners.create', [
            'item' => null,
            ...$this->formOptions(),
            'mediaAssets' => app(MediaAssetService::class)->latest(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->normalizeSortOrderInput($request);
        $data = $this->validated($request);
        $formToken = (string) $data['form_token'];
        unset($data['form_token']);

        $requestKey = 'admin-banner-create:'.(string) auth('admin')->id().':'.$formToken;
        if (! Cache::add($requestKey, true, now()->addMinutes(10))) {
            return back()->withInput()->withErrors([
                'image' => 'Yêu cầu tạo banner này đã được xử lý. Vui lòng không gửi lại biểu mẫu.',
            ]);
        }

        try {
            $media = app(MediaAssetService::class)->resolve(
                $request,
                $request->user('admin'),
                null,
                null,
                true,
                $data['slug'],
            );

            Banner::query()->create([
                ...$data,
                'image_url' => $media['url'],
                'image_public_id' => $media['public_id'],
            ]);
        } catch (Throwable $exception) {
            Cache::forget($requestKey);
            report($exception);

            return back()
                ->withInput()
                ->withErrors(['image' => 'Không thể tải ảnh banner lên Cloudinary. Vui lòng kiểm tra cấu hình và thử lại.']);
        }

        return redirect()->route('admin.banners.index')->with('success', 'Đã tạo banner thành công.');
    }

    public function edit(string $slug): View
    {
        return view('Admin.banners.edit', [
            'item' => $this->findBySlug($slug),
            ...$this->formOptions(),
            'mediaAssets' => app(MediaAssetService::class)->latest(),
        ]);
    }

    public function update(Request $request, string $slug): RedirectResponse
    {
        $this->normalizeSortOrderInput($request);
        $banner = $this->findBySlug($slug);
        $data = $this->validated($request, $banner);
        unset($data['form_token']);
        try {
            $media = app(MediaAssetService::class)->resolve(
                $request,
                $request->user('admin'),
                $banner->image_url,
                $banner->image_public_id,
                false,
                $data['slug'],
            );
            $data['image_url'] = $media['url'];
            $data['image_public_id'] = $media['public_id'];

            $banner->forceFill($data)->save();
        } catch (Throwable $exception) {
            report($exception);

            return back()
                ->withInput()
                ->withErrors(['image' => 'Không thể cập nhật banner hoặc tải ảnh lên Cloudinary.']);
        }

        return redirect()->route('admin.banners.index')->with('success', 'Đã cập nhật banner.');
    }

    public function destroy(string $slug): RedirectResponse
    {
        $banner = $this->findBySlug($slug);
        $banner->delete();

        return back()->with('success', 'Đã xóa banner. Ảnh được giữ lại trong kho dùng chung.');
    }

    private function findBySlug(string $slug): Banner
    {
        return Banner::query()->where('slug', $slug)->firstOrFail();
    }

    public function destroyBulk(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'banner_ids' => ['required', 'array', 'min:1', 'max:50'],
            'banner_ids.*' => ['required', 'string', 'max:64', 'distinct'],
        ], [
            'banner_ids.required' => 'Hãy chọn ít nhất một banner để xóa.',
            'banner_ids.array' => 'Danh sách banner được chọn không hợp lệ.',
            'banner_ids.min' => 'Hãy chọn ít nhất một banner để xóa.',
            'banner_ids.max' => 'Bạn chỉ được xóa tối đa 50 banner mỗi lần.',
            'banner_ids.*.distinct' => 'Banner được chọn không được trùng lặp.',
        ]);

        $keyName = (new Banner())->getKeyName();
        $banners = Banner::query()
            ->whereIn($keyName, array_values($data['banner_ids']))
            ->get();

        if ($banners->isEmpty()) {
            return back()->withErrors([
                'banner_ids' => 'Không tìm thấy banner nào phù hợp để xóa.',
            ]);
        }

        foreach ($banners as $banner) {
            $banner->delete();
        }

        return back()->with('success', "Đã xóa {$banners->count()} banner đã chọn.");
    }

    public function destroyAll(): RedirectResponse
    {
        $banners = Banner::query()->get();

        if ($banners->isEmpty()) {
            return back()->with('warning', 'Hiện chưa có banner nào để xóa.');
        }

        foreach ($banners as $banner) {
            $banner->delete();
        }

        return back()->with('success', "Đã xóa toàn bộ {$banners->count()} banner.");
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, ?Banner $banner = null): array
    {
        $data = $request->validate([
            'form_token' => [$banner ? 'nullable' : 'required', 'string', 'uuid'],
            'title' => ['bail', 'required', 'string', 'min:1', 'max:100', new PlainText()],
            'slug' => ['nullable', 'alpha_dash', 'max:120', new PlainText()],
            'image' => [$banner ? 'nullable' : 'required_without:image_asset_id', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120', 'dimensions:max_width=6000,max_height=4000'],
            'image_asset_id' => [$banner ? 'nullable' : 'required_without:image', 'string', 'alpha_dash', 'max:64'],
            'link_url' => ['nullable', 'string', 'max:500', 'regex:/^(https?:\/\/|\/)[^<>"\']*$/', new PlainText()],
            'sort_order' => [
                'bail',
                'required',
                'integer',
                'min:0',
                'max:9999',
            ],
            'status' => ['required', 'in:active,inactive'],
            'artist_ids' => ['nullable', 'array', 'max:50'],
            'artist_ids.*' => ['required', 'string', 'max:64', 'distinct'],
            'genre_ids' => ['nullable', 'array', 'max:50'],
            'genre_ids.*' => ['required', 'string', 'max:64', 'distinct'],
            'topic_ids' => ['nullable', 'array', 'max:50'],
            'topic_ids.*' => ['required', 'string', 'max:64', 'distinct'],
            'playlist_ids' => ['nullable', 'array', 'max:50'],
            'playlist_ids.*' => ['required', 'string', 'max:64', 'distinct'],
        ], [
            'title.max' => 'Tên banner không được dài hơn 100 ký tự.',
            'slug.max' => 'Slug không được dài hơn 120 ký tự.',
        ]);

        $providedSlug = trim((string) ($data['slug'] ?? ''));
        $slug = Str::slug($providedSlug !== '' ? $providedSlug : $data['title']);

        if (blank($slug)) {
            throw ValidationException::withMessages([
                'slug' => 'Không thể tạo slug từ tiêu đề banner này.',
            ]);
        }

        if ($providedSlug !== '' && $this->slugExists($slug, $banner)) {
            throw ValidationException::withMessages([
                'slug' => 'Slug này đã tồn tại. Hãy chọn slug khác.',
            ]);
        }

        $data['slug'] = $providedSlug === ''
            ? $this->uniqueSlug($slug, $banner)
            : $slug;

        foreach (['artist_ids', 'genre_ids', 'topic_ids', 'playlist_ids'] as $field) {
            $data[$field] = array_values(array_unique(array_map('strval', $data[$field] ?? [])));
        }

        $this->validateRelationIds($data);
        unset($data['image'], $data['image_asset_id']);

        return $data;
    }

    private function normalizeSortOrderInput(Request $request): void
    {
        $value = trim((string) $request->input('sort_order', ''));

        if ($value !== '' && preg_match('/^\d+$/', $value) === 1) {
            $request->merge(['sort_order' => (int) $value]);
        }
    }

    /** @return array{artists: mixed, genres: mixed, topics: mixed, playlists: mixed} */
    private function formOptions(): array
    {
        return [
            'artists' => Artist::query()->orderBy('name')->limit(300)->get(),
            'genres' => Genre::query()->orderBy('name')->limit(300)->get(),
            'topics' => Topic::query()->orderBy('name')->limit(300)->get(),
            'playlists' => Playlist::query()->orderBy('name')->limit(300)->get(),
        ];
    }

    /** @param array<string, mixed> $data */
    private function validateRelationIds(array $data): void
    {
        $relations = [
            'artist_ids' => [Artist::class, 'nghệ sĩ'],
            'genre_ids' => [Genre::class, 'thể loại'],
            'topic_ids' => [Topic::class, 'chủ đề'],
            'playlist_ids' => [Playlist::class, 'playlist'],
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

    private function slugExists(string $slug, ?Banner $banner = null): bool
    {
        return Banner::query()
            ->where('slug', $slug)
            ->when($banner, fn ($query) => $query->where($banner->getKeyName(), '!=', $banner->getKey()))
            ->exists();
    }

    private function uniqueSlug(string $baseSlug, ?Banner $banner = null): string
    {
        $slug = $baseSlug;
        $suffix = 2;

        while ($this->slugExists($slug, $banner)) {
            $slug = "{$baseSlug}-{$suffix}";
            $suffix++;
        }

        return $slug;
    }

}
