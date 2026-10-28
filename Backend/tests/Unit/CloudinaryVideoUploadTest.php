<?php

namespace Tests\Unit;

use App\Services\CloudinaryService;
use GuzzleHttp\Promise\PromiseInterface;
use Illuminate\Http\Client\Factory;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class CloudinaryVideoUploadTest extends TestCase
{
    public function test_signed_browser_video_upload_is_verified_before_building_delivery_url(): void
    {
        config([
            'cloudinary.cloud_name' => 'test-cloud',
            'cloudinary.api_key' => 'test-key',
            'cloudinary.api_secret' => 'test-secret',
            'cloudinary.video_folder' => 'melodify/videos',
        ]);

        $cloudinary = app(CloudinaryService::class);
        $authorization = $cloudinary->createSignedVideoUpload('Váy Cưới');

        $parameters = [
            'folder' => 'melodify/videos',
            'public_id' => $authorization['public_id'],
            'timestamp' => $authorization['timestamp'],
        ];
        ksort($parameters);
        $signatureInput = str_replace('%2F', '/', http_build_query($parameters, '', '&', PHP_QUERY_RFC3986));

        $this->assertSame(sha1($signatureInput.'test-secret'), $authorization['signature']);
        $actualPublicId = 'melodify/videos/'.$authorization['public_id'];
        $responseSignature = sha1('public_id='.$actualPublicId.'&version=123456test-secret');
        $verified = $cloudinary->verifySignedVideoUpload(
            $actualPublicId,
            $authorization['public_id'],
            123456,
            $responseSignature,
            'mp4',
        );

        $this->assertSame(
            "https://res.cloudinary.com/test-cloud/video/upload/v123456/{$actualPublicId}.mp4",
            $verified['secure_url'],
        );
    }

    public function test_tampered_browser_video_upload_response_is_rejected(): void
    {
        config([
            'cloudinary.cloud_name' => 'test-cloud',
            'cloudinary.api_secret' => 'test-secret',
            'cloudinary.video_folder' => 'melodify/videos',
        ]);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Không xác thực được kết quả upload từ Cloudinary.');

        app(CloudinaryService::class)->verifySignedVideoUpload(
            'melodify/videos/forged',
            'melodify/videos/forged',
            123456,
            str_repeat('0', 40),
            'mp4',
        );
    }

    public function test_video_within_cloudinary_limit_uploads_in_one_request(): void
    {
        config([
            'cloudinary.cloud_name' => 'test-cloud',
            'cloudinary.api_key' => 'test-key',
            'cloudinary.api_secret' => 'test-secret',
            'cloudinary.folder' => 'melodify',
            'cloudinary.video_max_bytes' => 100 * 1024 * 1024,
        ]);

        Http::fake([
            'https://api.cloudinary.com/v1_1/test-cloud/video/upload' => Http::response([
                'secure_url' => 'https://res.cloudinary.com/test-cloud/video/upload/test-clip.mp4',
                'public_id' => 'melodify/videos/test-clip',
                'duration' => 12,
            ]),
        ]);

        $path = tempnam(sys_get_temp_dir(), 'melodify-video-');
        file_put_contents($path, 'small-video-content');

        try {
            $file = new UploadedFile($path, 'test-clip.mp4', 'video/mp4', UPLOAD_ERR_OK, true);
            $result = app(CloudinaryService::class)->uploadVideo($file, 'melodify/videos', 'test-clip');
        } finally {
            @unlink($path);
        }

        $this->assertSame('https://res.cloudinary.com/test-cloud/video/upload/test-clip.mp4', $result['secure_url']);
        Http::assertSentCount(1);
    }

    public function test_large_video_is_sent_to_cloudinary_in_sequential_chunks(): void
    {
        config([
            'cloudinary.cloud_name' => 'test-cloud',
            'cloudinary.api_key' => 'test-key',
            'cloudinary.api_secret' => 'test-secret',
            'cloudinary.folder' => 'melodify',
            'cloudinary.video_max_bytes' => 150 * 1024 * 1024,
        ]);

        $path = tempnam(sys_get_temp_dir(), 'melodify-video-');
        $stream = fopen($path, 'wb');
        $totalSize = 100 * 1024 * 1024 + 17;
        ftruncate($stream, $totalSize);
        fclose($stream);

        $ranges = [];
        $uploadIds = [];

        Http::fake(function (HttpRequest $request) use (&$ranges, &$uploadIds): PromiseInterface {
            $ranges[] = $request->header('Content-Range')[0] ?? null;
            $uploadIds[] = $request->header('X-Unique-Upload-Id')[0] ?? null;

            return Factory::response([
                'secure_url' => 'https://res.cloudinary.com/test-cloud/video/upload/test-video.mp4',
                'public_id' => 'melodify/videos/test-video',
                'duration' => 223,
            ]);
        });

        try {
            $file = new UploadedFile($path, 'Vay-Cuoi.mp4', 'video/mp4', UPLOAD_ERR_OK, true);
            $result = app(CloudinaryService::class)->uploadVideo($file, 'melodify/videos', 'test-video');
        } finally {
            @unlink($path);
        }

        $this->assertSame('https://res.cloudinary.com/test-cloud/video/upload/test-video.mp4', $result['secure_url']);
        $this->assertSame([
            'bytes 0-20971519/104857617',
            'bytes 20971520-41943039/104857617',
            'bytes 41943040-62914559/104857617',
            'bytes 62914560-83886079/104857617',
            'bytes 83886080-104857599/104857617',
            'bytes 104857600-104857616/104857617',
        ], $ranges);
        $this->assertCount(1, array_unique($uploadIds));
        $this->assertNotEmpty($uploadIds[0]);
        Http::assertSentCount(6);
    }

    public function test_video_over_configured_cloudinary_limit_is_rejected_before_network_upload(): void
    {
        config([
            'cloudinary.cloud_name' => 'test-cloud',
            'cloudinary.api_key' => 'test-key',
            'cloudinary.api_secret' => 'test-secret',
            'cloudinary.video_max_bytes' => 100 * 1024 * 1024,
        ]);

        $path = tempnam(sys_get_temp_dir(), 'melodify-video-');
        $stream = fopen($path, 'wb');
        ftruncate($stream, 100 * 1024 * 1024 + 1);
        fclose($stream);

        Http::fake();

        try {
            $file = new UploadedFile($path, 'oversized-video.mp4', 'video/mp4', UPLOAD_ERR_OK, true);

            try {
                app(CloudinaryService::class)->uploadVideo($file);
                $this->fail('Expected the Cloudinary size limit to reject the file.');
            } catch (\RuntimeException $exception) {
                $this->assertStringContainsString('100,0 MiB', $exception->getMessage());
                $this->assertStringContainsString('CLOUDINARY_VIDEO_MAX_BYTES', $exception->getMessage());
            }
        } finally {
            @unlink($path);
        }

        Http::assertNothingSent();
    }
}
