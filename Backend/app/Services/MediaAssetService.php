<?php

namespace App\Services;

use App\Models\Admin;
use App\Models\MediaAsset;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class MediaAssetService
{
    public static function thumbnailUrl(?string $url, int $width = 160, int $height = 160): ?string
    {
        if (blank($url) || ! str_contains($url, 'res.cloudinary.com/') || ! str_contains($url, '/upload/')) {
            return $url;
        }

        return str_replace(
            '/upload/',
            "/upload/f_auto,q_auto,c_fill,w_{$width},h_{$height}/",
            $url,
        );
    }

    public function folder(?string $folder = null): string
    {
        return trim((string) ($folder ?? config('cloudinary.folder', 'melodify')), '/');
    }

    public function latest(int $limit = 36, ?string $folder = null)
    {
        return MediaAsset::query()
            ->where('folder', $this->folder($folder))
            ->latest()
            ->limit(min(max($limit, 1), 60))
            ->get();
    }

    public function upload(UploadedFile $file, Admin $admin, ?string $slug = null, ?string $folder = null): MediaAsset
    {
        $cloudinary = app(CloudinaryService::class);
        $assetFolder = $this->folder($folder);
        $fileSlug = $slug ?: pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);
        $result = $cloudinary->uploadImage(
            $file,
            $assetFolder,
            $cloudinary->datedPublicId(Str::slug($fileSlug)),
        );

        return MediaAsset::query()->updateOrCreate(
            ['public_id' => $result['public_id']],
            [
                'secure_url' => $result['secure_url'],
                'folder' => $assetFolder,
                'original_name' => $file->getClientOriginalName(),
                'width' => $result['width'] ?? null,
                'height' => $result['height'] ?? null,
                'created_by_admin_id' => (string) $admin->getKey(),
            ],
        );
    }

    public function resolve(
        Request $request,
        Admin $admin,
        ?string $currentUrl = null,
        ?string $currentPublicId = null,
        bool $required = false,
        ?string $slug = null,
        ?string $folder = null,
    ): array {
        if ($request->hasFile('image')) {
            $asset = $this->upload($request->file('image'), $admin, $slug, $folder);

            return [
                'url' => $asset->secure_url,
                'public_id' => $asset->public_id,
            ];
        }

        if ($request->filled('image_asset_id')) {
            $asset = MediaAsset::query()
                ->where('folder', $this->folder($folder))
                ->whereKey((string) $request->input('image_asset_id'))
                ->first();

            if (! $asset) {
                throw ValidationException::withMessages([
                    'image_asset_id' => 'Ảnh đã chọn không còn tồn tại trong kho ảnh.',
                ]);
            }

            return [
                'url' => $asset->secure_url,
                'public_id' => $asset->public_id,
            ];
        }

        if ($required && blank($currentUrl)) {
            throw ValidationException::withMessages([
                'image' => 'Vui lòng tải ảnh mới hoặc chọn một ảnh trong kho ảnh.',
            ]);
        }

        return [
            'url' => $currentUrl,
            'public_id' => $currentPublicId,
        ];
    }
}
