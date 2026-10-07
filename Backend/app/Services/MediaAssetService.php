<?php

namespace App\Services;

use App\Models\Admin;
use App\Models\MediaAsset;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;

class MediaAssetService
{
    public function folder(): string
    {
        return trim((string) config('cloudinary.folder', 'melodify'), '/');
    }

    public function latest(int $limit = 36)
    {
        return MediaAsset::query()
            ->where('folder', $this->folder())
            ->latest()
            ->limit(min(max($limit, 1), 60))
            ->get();
    }

    public function upload(UploadedFile $file, Admin $admin): MediaAsset
    {
        $result = app(CloudinaryService::class)->uploadImage($file, $this->folder());

        return MediaAsset::query()->updateOrCreate(
            ['public_id' => $result['public_id']],
            [
                'secure_url' => $result['secure_url'],
                'folder' => $this->folder(),
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
    ): array {
        if ($request->hasFile('image')) {
            $asset = $this->upload($request->file('image'), $admin);

            return [
                'url' => $asset->secure_url,
                'public_id' => $asset->public_id,
            ];
        }

        if ($request->filled('image_asset_id')) {
            $asset = MediaAsset::query()
                ->where('folder', $this->folder())
                ->find($request->input('image_asset_id'));

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
