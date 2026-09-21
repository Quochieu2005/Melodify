<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class CloudinaryService
{
    public function uploadImage(UploadedFile $file): array
    {
        $cloudName = config('cloudinary.cloud_name');
        $apiKey = config('cloudinary.api_key');
        $apiSecret = config('cloudinary.api_secret');

        if (! $cloudName || ! $apiKey || ! $apiSecret) {
            throw new RuntimeException('Cloudinary chưa được cấu hình đầy đủ.');
        }

        $timestamp = time();
        $folder = config('cloudinary.folder');
        $signature = sha1("folder={$folder}&timestamp={$timestamp}{$apiSecret}");
        $endpoint = "https://api.cloudinary.com/v1_1/{$cloudName}/image/upload";

        $response = Http::attach('file', fopen($file->getRealPath(), 'r'), $file->getClientOriginalName())
            ->post($endpoint, [
                'api_key' => $apiKey,
                'timestamp' => $timestamp,
                'folder' => $folder,
                'signature' => $signature,
            ]);

        $response->throw();
        return $response->json();
    }
}
