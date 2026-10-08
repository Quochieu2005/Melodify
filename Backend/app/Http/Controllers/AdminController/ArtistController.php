<?php

namespace App\Http\Controllers\AdminController;

use App\Http\Requests\Admin\AdminResourceRequest;
use App\Models\Artist;
use App\Models\User;
use App\Services\CloudinaryService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\UploadedFile;
use Throwable;

class ArtistController extends CrudResourceController
{
    protected string $model = Artist::class;

    protected string $resource = 'artists';

    protected string $title = 'nghệ sĩ';

    protected string $viewDirectory = 'Admin.artists';

    protected array $columns = [
        'avatar_url' => 'Ảnh',
        'name' => 'Tên nghệ sĩ',
        'verified' => 'Xác minh',
        'status' => 'Trạng thái',
    ];

    protected array $fields = [
        'name' => ['label' => 'Tên nghệ sĩ', 'required' => true],
        'slug' => ['label' => 'Slug', 'required' => true],
        'user_id' => ['label' => 'Tài khoản liên kết', 'type' => 'select', 'placeholder' => 'Không liên kết tài khoản', 'option_model' => User::class, 'option_label' => 'email'],
        'bio' => ['label' => 'Giới thiệu', 'type' => 'textarea'],
        'avatar_url' => ['label' => 'URL ảnh đại diện', 'type' => 'url'],
        'verified' => ['label' => 'Đã xác minh', 'type' => 'checkbox'],
        'status' => ['label' => 'Trạng thái', 'type' => 'select', 'required' => true, 'options' => ['active' => 'Hoạt động', 'inactive' => 'Tạm ẩn', 'blocked' => 'Đã chặn']],
    ];

    public function store(AdminResourceRequest $request): RedirectResponse
    {
        $cloudinary = app(CloudinaryService::class);
        $validated = $request->validated();
        $avatarFile = $request->file('avatar_file');
        unset($validated['avatar_file'], $validated['remove_avatar']);

        $data = $this->normalize($validated);
        $uploaded = null;

        try {
            if ($avatarFile instanceof UploadedFile) {
                $uploaded = $this->uploadAvatar($cloudinary, $avatarFile, (string) $data['slug']);
                $data['avatar_url'] = $uploaded['secure_url'] ?? $uploaded['url'] ?? null;
                $data['avatar_public_id'] = $uploaded['public_id'] ?? null;
            } elseif (blank($data['avatar_url'] ?? null)) {
                unset($data['avatar_url']);
            } else {
                $data['avatar_public_id'] = null;
            }

            Artist::query()->create($data);
        } catch (Throwable $exception) {
            $this->cleanupAvatar($cloudinary, $uploaded['public_id'] ?? null);
            report($exception);

            return back()->withInput()->withErrors([
                'avatar_file' => 'Không thể tải ảnh đại diện lên Cloudinary. Vui lòng kiểm tra cấu hình và thử lại.',
            ]);
        }

        return redirect()->route('admin.artists.index')->with('success', 'Đã tạo nghệ sĩ thành công.');
    }

    public function update(AdminResourceRequest $request, string $id): RedirectResponse
    {
        $cloudinary = app(CloudinaryService::class);
        $artist = Artist::query()->findOrFail($id);
        $validated = $request->validated();
        $avatarFile = $request->file('avatar_file');
        $removeAvatar = $request->boolean('remove_avatar');
        $submittedAvatarUrl = trim((string) $request->input('avatar_url', ''));
        unset($validated['avatar_file'], $validated['remove_avatar']);

        $data = $this->normalize($validated, $id);
        $oldPublicId = $artist->avatar_public_id;
        $uploaded = null;

        try {
            if ($avatarFile instanceof UploadedFile) {
                $uploaded = $this->uploadAvatar($cloudinary, $avatarFile, (string) $data['slug']);
                $data['avatar_url'] = $uploaded['secure_url'] ?? $uploaded['url'] ?? null;
                $data['avatar_public_id'] = $uploaded['public_id'] ?? null;
            } elseif ($removeAvatar) {
                $data['avatar_url'] = null;
                $data['avatar_public_id'] = null;
            } elseif (filled($submittedAvatarUrl) && $submittedAvatarUrl !== (string) $artist->avatar_url) {
                $data['avatar_url'] = $submittedAvatarUrl;
                $data['avatar_public_id'] = null;
            } else {
                unset($data['avatar_url']);
            }

            $artist->update($data);

            if ($oldPublicId && (($data['avatar_public_id'] ?? $oldPublicId) !== $oldPublicId)) {
                $this->cleanupAvatar($cloudinary, $oldPublicId);
            }
        } catch (Throwable $exception) {
            $this->cleanupAvatar($cloudinary, $uploaded['public_id'] ?? null);
            report($exception);

            return back()->withInput()->withErrors([
                'avatar_file' => 'Không thể cập nhật ảnh đại diện. Vui lòng kiểm tra cấu hình Cloudinary.',
            ]);
        }

        return redirect()->route('admin.artists.index')->with('success', 'Đã cập nhật nghệ sĩ.');
    }

    private function uploadAvatar(CloudinaryService $cloudinary, UploadedFile $file, string $slug): array
    {
        $publicId = $cloudinary->datedPublicId($slug);
        $uploaded = $cloudinary->uploadImage(
            $file,
            config('cloudinary.artist_folder', 'melodify/artists'),
            $publicId,
        );
        $imageUrl = $uploaded['secure_url'] ?? $uploaded['url'] ?? null;

        if (blank($imageUrl)) {
            throw new \RuntimeException('Cloudinary không trả về URL ảnh đại diện.');
        }

        return $uploaded;
    }

    private function cleanupAvatar(CloudinaryService $cloudinary, ?string $publicId): void
    {
        if (blank($publicId)) {
            return;
        }

        try {
            $cloudinary->deleteImage($publicId);
        } catch (Throwable $exception) {
            report($exception);
        }
    }
}
