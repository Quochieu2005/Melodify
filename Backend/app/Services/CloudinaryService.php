<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

class CloudinaryService
{
    /**
     * Create a short-lived signed upload payload so the browser can send a video
     * straight to Cloudinary instead of relaying the whole file through PHP.
     *
     * @return array{cloud_name: string, api_key: string, timestamp: int, folder: string, public_id: string, signature: string}
     */
    public function createSignedVideoUpload(string $title): array
    {
        $cloudName = (string) config('cloudinary.cloud_name');
        $apiKey = (string) config('cloudinary.api_key');
        $apiSecret = (string) config('cloudinary.api_secret');

        if ($cloudName === '' || $apiKey === '' || $apiSecret === '') {
            throw new RuntimeException('Cloudinary chưa được cấu hình đầy đủ. Kiểm tra CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY và CLOUDINARY_API_SECRET.');
        }

        $folder = trim((string) config('cloudinary.video_folder', 'melodify/videos'), '/');
        $publicId = (Str::slug($title) ?: 'video').'-'.Str::lower(Str::random(16));
        $timestamp = time();
        $parameters = [
            'folder' => $folder,
            'public_id' => $publicId,
            'timestamp' => $timestamp,
        ];

        return [
            'cloud_name' => $cloudName,
            'api_key' => $apiKey,
            ...$parameters,
            'signature' => $this->signature($parameters, $apiSecret),
        ];
    }

    /**
     * Verify Cloudinary's signed upload response and build a delivery URL from
     * the verified asset identity rather than trusting a URL supplied by JS.
     */
    public function verifySignedVideoUpload(string $publicId, string $expectedPublicId, int $version, string $responseSignature, string $format): array
    {
        $apiSecret = (string) config('cloudinary.api_secret');
        $cloudName = (string) config('cloudinary.cloud_name');
        $folder = trim((string) config('cloudinary.video_folder', 'melodify/videos'), '/');
        $publicId = trim($publicId, '/');
        $format = strtolower(trim($format));

        if ($apiSecret === '' || $cloudName === '') {
            throw new RuntimeException('Cloudinary chưa được cấu hình đầy đủ.');
        }

        if ($version < 1 || ! preg_match('/^[a-f0-9]{40}$/i', $responseSignature)) {
            throw new RuntimeException('Cloudinary trả về thông tin video không hợp lệ.');
        }

        if (! in_array($format, ['mp4', 'mov', 'm4v', 'webm', 'avi', 'mkv', 'mpeg', 'mpg', 'ogv', '3gp'], true)) {
            throw new RuntimeException('Cloudinary trả về định dạng video không được hỗ trợ.');
        }

        $publicIdMatchesAuthorization = $publicId === $expectedPublicId
            || ($folder !== '' && $publicId === $folder.'/'.$expectedPublicId);
        if (! $publicIdMatchesAuthorization) {
            throw new RuntimeException('Video upload không nằm trong thư mục Cloudinary được cấp quyền.');
        }

        $expectedSignature = sha1("public_id={$publicId}&version={$version}".$apiSecret);
        if (! hash_equals($expectedSignature, strtolower($responseSignature))) {
            throw new RuntimeException('Không xác thực được kết quả upload từ Cloudinary.');
        }

        return [
            'secure_url' => "https://res.cloudinary.com/{$cloudName}/video/upload/v{$version}/{$publicId}.{$format}",
            'public_id' => $publicId,
        ];
    }

    public function datedPublicId(?string $slug): string
    {
        $base = Str::slug(trim((string) $slug)) ?: 'image';

        return $base.'-'.now()->format('Y-m-d');
    }

    public function uploadImage(UploadedFile $file, ?string $folder = null, ?string $publicId = null): array
    {
        return $this->uploadImageContents(
            $file->get(),
            $file->getClientOriginalName(),
            $folder,
            $publicId,
        );
    }

    public function uploadImageContents(string $contents, string $filename, ?string $folder = null, ?string $publicId = null): array
    {
        return $this->uploadMediaContents($contents, $filename, 'image', $folder, $publicId);
    }

    public function uploadAudio(UploadedFile $file, ?string $folder = null, ?string $publicId = null): array
    {
        return $this->uploadAudioContents(
            $file->get(),
            $file->getClientOriginalName(),
            $folder,
            $publicId,
        );
    }

    public function uploadAudioContents(string $contents, string $filename, ?string $folder = null, ?string $publicId = null): array
    {
        return $this->uploadMediaContents($contents, $filename, 'video', $folder, $publicId);
    }

    public function uploadVideo(UploadedFile $file, ?string $folder = null, ?string $publicId = null): array
    {
        if (! $file->isValid()) {
            throw new RuntimeException('Không đọc được file video: '.$file->getErrorMessage());
        }

        $cloudName = config('cloudinary.cloud_name');
        $apiKey = config('cloudinary.api_key');
        $apiSecret = config('cloudinary.api_secret');

        if (! $cloudName || ! $apiKey || ! $apiSecret) {
            throw new RuntimeException('Cloudinary chưa được cấu hình đầy đủ. Kiểm tra CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY và CLOUDINARY_API_SECRET.');
        }

        $path = $file->getRealPath();
        $totalSize = (int) $file->getSize();

        $maxSize = max(1, (int) config('cloudinary.video_max_bytes', 104857600));
        if ($totalSize > $maxSize) {
            $maxSizeMiB = number_format($maxSize / 1048576, 1, ',', '.');
            throw new RuntimeException("Video vượt giới hạn Cloudinary hiện tại ({$maxSizeMiB} MiB). Hãy nén video xuống dưới giới hạn hoặc tăng CLOUDINARY_VIDEO_MAX_BYTES khi gói Cloudinary cho phép.");
        }

        $stream = $path ? fopen($path, 'rb') : false;

        if ($stream === false || $totalSize < 1) {
            throw new RuntimeException('Không mở được file video hoặc file rỗng.');
        }

        $timestamp = time();
        $folder = trim($folder ?: config('cloudinary.folder'), '/');
        $signedParameters = ['folder' => $folder, 'timestamp' => $timestamp];
        if (filled($publicId)) {
            $signedParameters['public_id'] = trim($publicId, '/');
        }
        $parameters = [
            'api_key' => $apiKey,
            ...$signedParameters,
            'signature' => $this->signature($signedParameters, $apiSecret),
        ];
        $endpoint = "https://api.cloudinary.com/v1_1/{$cloudName}/video/upload";
        $uploadId = (string) Str::uuid();
        $chunkSize = 20 * 1024 * 1024;
        $chunkCount = (int) ceil($totalSize / $chunkSize);
        $offset = 0;
        $chunkNumber = 0;
        $result = null;

        try {
            if ($totalSize <= 100 * 1000 * 1000) {
                $response = Http::connectTimeout(15)
                    ->timeout(300)
                    ->attach('file', $stream, $file->getClientOriginalName())
                    ->post($endpoint, $parameters);

                if ($response->failed()) {
                    $cloudinaryMessage = data_get($response->json(), 'error.message');
                    $message = filled($cloudinaryMessage)
                        ? (string) $cloudinaryMessage
                        : 'Cloudinary trả về lỗi không có nội dung chi tiết.';

                    throw new RuntimeException("Cloudinary từ chối video (HTTP {$response->status()}): {$message}");
                }

                $result = $response->json();
            } else {
                while ($offset < $totalSize) {
                    $chunk = fread($stream, min($chunkSize, $totalSize - $offset));
                    if ($chunk === false || $chunk === '') {
                        throw new RuntimeException('Không đọc được phần tiếp theo của file video.');
                    }

                    $chunkNumber++;
                    $end = $offset + strlen($chunk) - 1;
                    $response = Http::connectTimeout(15)
                        ->timeout(180)
                        ->withHeaders([
                            'Content-Range' => "bytes {$offset}-{$end}/{$totalSize}",
                            'X-Unique-Upload-Id' => $uploadId,
                        ])
                        ->attach('file', $chunk, $file->getClientOriginalName())
                        ->post($endpoint, $parameters);

                    if ($response->failed()) {
                        $cloudinaryMessage = data_get($response->json(), 'error.message');
                        $message = filled($cloudinaryMessage)
                            ? (string) $cloudinaryMessage
                            : 'Cloudinary trả về lỗi không có nội dung chi tiết.';

                        throw new RuntimeException("Cloudinary từ chối phần {$chunkNumber}/{$chunkCount} (HTTP {$response->status()}): {$message}");
                    }

                    $result = $response->json();
                    $offset = $end + 1;
                }
            }
        } catch (RuntimeException $exception) {
            throw $exception;
        } catch (\Throwable $exception) {
            throw new RuntimeException("Không gửi được phần {$chunkNumber}/{$chunkCount} lên Cloudinary: ".$exception->getMessage(), previous: $exception);
        } finally {
            if (is_resource($stream)) {
                fclose($stream);
            }
        }

        if (! is_array($result)) {
            throw new RuntimeException('Cloudinary không trả về kết quả upload video.');
        }

        return $result;
    }

    public function uploadVideoContents(string $contents, string $filename, ?string $folder = null, ?string $publicId = null): array
    {
        return $this->uploadMediaContents($contents, $filename, 'video', $folder, $publicId);
    }

    public function deleteAudio(?string $publicId): void
    {
        $this->deleteAsset($publicId, 'video');
    }

    public function deleteVideo(?string $publicId): void
    {
        $this->deleteAsset($publicId, 'video');
    }

    private function uploadMediaContents(
        string $contents,
        string $filename,
        string $resourceType,
        ?string $folder = null,
        ?string $publicId = null,
    ): array {
        $cloudName = config('cloudinary.cloud_name');
        $apiKey = config('cloudinary.api_key');
        $apiSecret = config('cloudinary.api_secret');

        if (! $cloudName || ! $apiKey || ! $apiSecret) {
            throw new RuntimeException('Cloudinary chưa được cấu hình đầy đủ.');
        }
        if ($contents === '') {
            throw new RuntimeException('Nội dung file rỗng.');
        }

        $timestamp = time();
        $folder = trim($folder ?: config('cloudinary.folder'), '/');
        $signedParameters = ['folder' => $folder, 'timestamp' => $timestamp];
        if (filled($publicId)) {
            $signedParameters['public_id'] = trim($publicId, '/');
        }
        $signature = $this->signature($signedParameters, $apiSecret);
        $endpoint = "https://api.cloudinary.com/v1_1/{$cloudName}/{$resourceType}/upload";

        $response = Http::attach('file', $contents, $filename)
            ->post($endpoint, [
                'api_key' => $apiKey,
                'timestamp' => $timestamp,
                ...$signedParameters,
                'signature' => $signature,
            ]);

        $response->throw();

        return $response->json();
    }

    public function deleteImage(?string $publicId): void
    {
        $this->deleteAsset($publicId, 'image');
    }

    private function deleteAsset(?string $publicId, string $resourceType): void
    {
        if (blank($publicId)) {
            return;
        }

        $cloudName = config('cloudinary.cloud_name');
        $apiKey = config('cloudinary.api_key');
        $apiSecret = config('cloudinary.api_secret');

        if (! $cloudName || ! $apiKey || ! $apiSecret) {
            throw new RuntimeException('Cloudinary chưa được cấu hình đầy đủ.');
        }

        $signedParameters = [
            'invalidate' => 'true',
            'public_id' => $publicId,
            'timestamp' => time(),
        ];
        $signature = $this->signature($signedParameters, $apiSecret);

        Http::asForm()->post("https://api.cloudinary.com/v1_1/{$cloudName}/{$resourceType}/destroy", [
            'api_key' => $apiKey,
            ...$signedParameters,
            'signature' => $signature,
        ])->throw();
    }

    private function signature(array $parameters, string $apiSecret): string
    {
        ksort($parameters);

        // Cloudinary keeps folder separators as slashes in its string-to-sign.
        $query = str_replace('%2F', '/', http_build_query($parameters, '', '&', PHP_QUERY_RFC3986));

        return sha1($query.$apiSecret);
    }
}
