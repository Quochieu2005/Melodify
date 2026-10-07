<?php

namespace App\Http\Controllers\AdminController;

use App\Http\Controllers\Controller;
use App\Models\Banner;
use App\Rules\PlainText;
use App\Services\CloudinaryService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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
        $uploaded = null;

        try {
            $uploaded = $cloudinary->uploadImage(
                $request->file('image'),
                config('cloudinary.banner_folder', 'banner'),
            );

            Banner::query()->create([
                ...$data,
                'image_url' => $uploaded['secure_url'] ?? $uploaded['url'] ?? null,
                'image_public_id' => $uploaded['public_id'] ?? null,
            ]);
        } catch (Throwable $exception) {
            $this->cleanupUploadedImage($cloudinary, $uploaded['public_id'] ?? null);
            report($exception);

            return back()
                ->withInput()
                ->withErrors(['image' => 'Không thể tải ảnh banner lên Cloudinary. Vui lòng kiểm tra cấu hình và thử lại.']);
        }

        return redirect()->route('admin.banners.index')->with('success', 'Đã tạo banner thành công.');
    }

    public function edit(string $id): View
    {
        return view('Admin.banners.edit', [
            'item' => Banner::query()->findOrFail($id),
        ]);
    }

    public function update(Request $request, string $id, CloudinaryService $cloudinary): RedirectResponse
    {
        $banner = Banner::query()->findOrFail($id);
        $data = $this->validated($request, $banner);
        $oldPublicId = $banner->image_public_id;
        $uploaded = null;

        try {
            if ($request->hasFile('image')) {
                $uploaded = $cloudinary->uploadImage(
                    $request->file('image'),
                    config('cloudinary.banner_folder', 'banner'),
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

    public function destroy(string $id, CloudinaryService $cloudinary): RedirectResponse
    {
        $banner = Banner::query()->findOrFail($id);
        $publicId = $banner->image_public_id;
        $banner->delete();
        $this->cleanupUploadedImage($cloudinary, $publicId);

        return back()->with('success', 'Đã xóa banner.');
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, ?Banner $banner = null): array
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:160', new PlainText()],
            'slug' => ['nullable', 'string', 'max:180', 'regex:/^[a-zA-Z0-9_-]+$/', new PlainText()],
            'image' => [$banner ? 'nullable' : 'required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'link_url' => ['nullable', 'string', 'max:500', 'regex:/^(https?:\/\/|\/)[^<>"\']*$/', new PlainText()],
            'sort_order' => ['required', 'integer', 'min:0', 'max:999999'],
            'status' => ['required', 'in:active,inactive'],
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
