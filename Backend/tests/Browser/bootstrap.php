<?php

use App\Services\CloudinaryService;
use Illuminate\Cache\RateLimiter;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Mail\Events\MessageSent;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;

// Test-only entry point. Never included by public/index.php or production routes.
require dirname(__DIR__, 2).'/vendor/autoload.php';

$testId = getenv('MELODIFY_BROWSER_TEST_ID');
if (! is_string($testId) || ! preg_match('/^[a-f0-9]{16}$/', $testId)) {
    throw new RuntimeException('A unique browser test ID is required.');
}

$app = require dirname(__DIR__, 2).'/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
$testDirectory = storage_path('framework/testing/browser-'.$testId);
foreach ([$testDirectory, $testDirectory.'/cache', $testDirectory.'/sessions', $testDirectory.'/files'] as $directory) {
    if (! is_dir($directory)) {
        mkdir($directory, 0777, true);
    }
}
config([
    'app.env' => 'testing',
    'app.url' => 'http://127.0.0.1:8001',
    // Existing Mongo credentials may only permit one database. Prefix every
    // collection instead, just like the project's isolated feature tests.
    'database.connections.mongodb.prefix' => 'test_browser_'.$testId.'_',
    'cache.default' => 'file',
    'cache.stores.file.path' => $testDirectory.'/cache',
    'cache.stores.file.lock_path' => $testDirectory.'/cache',
    'session.driver' => 'file',
    'session.files' => $testDirectory.'/sessions',
    'session.cookie' => 'melodify_browser_'.$testId,
    'mail.default' => 'array',
]);
DB::purge('mongodb');
app('cache')->forgetDriver('file');
$app->forgetInstance('cache.store');
$app->forgetInstance(RateLimiter::class);
Http::preventStrayRequests();
// Capture the array mail transport only in this guarded test server, so the
// browser can complete OTP without sending real email or exposing production OTP.
Event::listen(MessageSent::class, function ($event) use ($testDirectory): void {
    $message = $event->sent->getOriginalMessage();
    if (str_contains((string) $message->getSubject(), 'OTP') && preg_match('/\b([0-9]{6})\b/', strip_tags((string) $message->getHtmlBody()), $matches)) {
        file_put_contents($testDirectory.'/otp.txt', $matches[1]);
    }
});

$app->singleton(CloudinaryService::class, fn () => new class($testDirectory) extends CloudinaryService
{
    public function __construct(private string $directory) {}

    public function uploadImageContents(string $contents, string $filename, ?string $folder = null, ?string $publicId = null): array
    {
        return $this->saveFixture($contents, $filename);
    }

    public function uploadAudioContents(string $contents, string $filename, ?string $folder = null, ?string $publicId = null): array
    {
        return [...$this->saveFixture($contents, $filename), 'duration' => 12];
    }

    public function uploadVideoContents(string $contents, string $filename, ?string $folder = null, ?string $publicId = null): array
    {
        return $this->saveFixture($contents, $filename);
    }

    private function saveFixture(string $contents, string $filename): array
    {
        $name = bin2hex(random_bytes(8)).'.'.pathinfo($filename, PATHINFO_EXTENSION);
        file_put_contents($this->directory.'/files/'.$name, $contents);

        return ['secure_url' => 'http://127.0.0.1:8001/_browser/files/'.$name, 'public_id' => 'browser/'.$name];
    }

    public function deleteAudio(?string $publicId): void {}

    public function deleteImage(?string $publicId): void {}

    public function deleteVideo(?string $publicId): void {}
});

return $app;
