<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class CloudinaryService
{
    public function uploadImage(UploadedFile $file, ?string $folder = null): array
    {
        $cloudName = config('cloudinary.cloud_name');
        $apiKey = config('cloudinary.api_key');
        $apiSecret = config('cloudinary.api_secret');

        if (! $cloudName || ! $apiKey || ! $apiSecret) {
            throw new RuntimeException('Cloudinary chưa được cấu hình đầy đủ.');
        }

        $timestamp = time();
        $folder = trim($folder ?: config('cloudinary.folder'), '/');
        $signedParameters = ['folder' => $folder, 'timestamp' => $timestamp];
        $signature = sha1(http_build_query($signedParameters, '', '&', PHP_QUERY_RFC3986).$apiSecret);
        $endpoint = "https://api.cloudinary.com/v1_1/{$cloudName}/image/upload";

        $response = Http::attach('file', fopen($file->getRealPath(), 'r'), $file->getClientOriginalName())
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
        $signature = sha1(http_build_query($signedParameters, '', '&', PHP_QUERY_RFC3986).$apiSecret);

        Http::asForm()->post("https://api.cloudinary.com/v1_1/{$cloudName}/image/destroy", [
            'api_key' => $apiKey,
            ...$signedParameters,
            'signature' => $signature,
        ])->throw();
    }
}
