<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

class CloudinaryService
{
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

    public function deleteAudio(?string $publicId): void
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
