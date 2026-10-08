<?php

namespace App\Http\Controllers\AdminController;

use App\Http\Controllers\Controller;
use App\Models\Banner;
use App\Rules\PlainText;
use App\Services\CloudinaryService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Illuminate\View\View;
use Throwable;

class BannerController extends Controller
{
    public function index(): View
    {
        $items = Banner::query()
            ->orderBy('sort_order')
            ->orderByDesc('created_at')
            ->paginate(12);

        return view('Admin.banners.index', compact('items'));
    }

    public function create(): View
    {
        return view('Admin.banners.create', ['item' => null]);
    }

    public function store(Request $request, CloudinaryService $cloudinary): RedirectResponse
    {
        $data = $this->validated($request);
        $formToken = (string) $data['form_token'];
        unset($data['form_token']);

        $requestKey = 'admin-banner-create:'.(string) auth('admin')->id().':'.$formToken;
        if (! Cache::add($requestKey, true, now()->addMinutes(10))) {
            return back()->withInput()->withErrors([
                'image' => 'Yêu cầu tạo banner này đã được xử lý. Vui lòng không gửi lại biểu mẫu.',
            ]);
        }

        $uploaded = null;

        try {
            $uploaded = $cloudinary->uploadImage(
                $request->file('image'),
                config('cloudinary.banner_folder', 'banner'),
                $cloudinary->datedPublicId((string) $data['slug']),
            );

            $imageUrl = $uploaded['secure_url'] ?? $uploaded['url'] ?? null;

            if (blank($imageUrl)) {
                throw new \RuntimeException('Cloudinary không trả về URL ảnh banner.');
            }

            Banner::query()->create([
                ...$data,
                'image_url' => $imageUrl,
                'image_public_id' => $uploaded['public_id'] ?? null,
            ]);
        } catch (Throwable $exception) {
            Cache::forget($requestKey);
            $this->cleanupUploadedImage($cloudinary, $uploaded['public_id'] ?? null);
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
        ]);
    }

    public function update(Request $request, string $slug, CloudinaryService $cloudinary): RedirectResponse
    {
        $banner = $this->findBySlug($slug);
        $data = $this->validated($request, $banner);
        unset($data['form_token']);
        $oldPublicId = $banner->image_public_id;
        $uploaded = null;

        try {
            if ($request->hasFile('image')) {
                $uploaded = $cloudinary->uploadImage(
                    $request->file('image'),
                    config('cloudinary.banner_folder', 'banner'),
                    $cloudinary->datedPublicId((string) $data['slug']),
                );
                $data['image_url'] = $uploaded['secure_url'] ?? $uploaded['url'] ?? null;
                $data['image_public_id'] = $uploaded['public_id'] ?? null;
            }

            $banner->forceFill($data)->save();

            if ($uploaded && $oldPublicId && $oldPublicId !== ($data['image_public_id'] ?? null)) {
                $this->cleanupUploadedImage($cloudinary, $oldPublicId);
            }
        } catch (Throwable $exception) {
            $this->cleanupUploadedImage($cloudinary, $uploaded['public_id'] ?? null);
            report($exception);

            return back()
                ->withInput()
                ->withErrors(['image' => 'Không thể cập nhật banner hoặc tải ảnh lên Cloudinary.']);
        }

        return redirect()->route('admin.banners.index')->with('success', 'Đã cập nhật banner.');
    }

    public function destroy(string $slug, CloudinaryService $cloudinary): RedirectResponse
    {
        $banner = $this->findBySlug($slug);
        $publicId = $banner->image_public_id;
        $banner->delete();
        $this->cleanupUploadedImage($cloudinary, $publicId);

        return back()->with('success', 'Đã xóa banner.');
    }

    private function findBySlug(string $slug): Banner
    {
        return Banner::query()->where('slug', $slug)->firstOrFail();
    }

    public function destroyBulk(Request $request, CloudinaryService $cloudinary): RedirectResponse
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
            $publicId = $banner->image_public_id;
            $banner->delete();
            $this->cleanupUploadedImage($cloudinary, $publicId);
        }

        return back()->with('success', "Đã xóa {$banners->count()} banner đã chọn.");
    }

    public function destroyAll(CloudinaryService $cloudinary): RedirectResponse
    {
        $banners = Banner::query()->get();

        if ($banners->isEmpty()) {
            return back()->with('warning', 'Hiện chưa có banner nào để xóa.');
        }

        foreach ($banners as $banner) {
            $publicId = $banner->image_public_id;
            $banner->delete();
            $this->cleanupUploadedImage($cloudinary, $publicId);
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
            'image' => [$banner ? 'nullable' : 'required', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120', 'dimensions:max_width=6000,max_height=4000'],
            'link_url' => ['nullable', 'string', 'max:500', 'regex:/^(https?:\/\/|\/)[^<>"\']*$/', new PlainText()],
            'sort_order' => ['bail', 'required', 'integer', 'min:0', 'max:9999'],
            'status' => ['required', 'in:active,inactive'],
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

        unset($data['image']);

        return $data;
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

    private function cleanupUploadedImage(CloudinaryService $cloudinary, ?string $publicId): void
    {
        if (blank($publicId)) {
            return;
        }

        try {
            $cloudinary->deleteImage($publicId);
        } catch (Throwable $exception) {
            Log::warning('Cloudinary banner cleanup failed.', [
                'public_id' => $publicId,
                'exception' => $exception,
            ]);
        }
    }
}
