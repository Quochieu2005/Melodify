<?php

namespace Tests\Feature;

use App\Services\Music\NhacCuaTuiClient;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class NhacCuaTuiQualityTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Http::preventStrayRequests();
    }

    public function test_song_normalization_keeps_available_regular_and_vip_quality_options(): void
    {
        Http::fake([
            '*song/detail/Abcd1234' => Http::response([
                'code' => 0,
                'data' => [
                    'key' => 'Abcd1234',
                    'name' => 'Test Song',
                    'artist' => ['name' => 'Test Artist'],
                    'streamURL' => [
                        ['value' => 128, 'type' => 'mp3', 'stream' => 'https://audio.test/128', 'download' => 'https://audio.test/dl128', 'onlyVIP' => false, 'status' => 1],
                        ['value' => 320, 'type' => 'mp3', 'stream' => 'https://audio.test/320', 'download' => 'https://audio.test/dl320', 'onlyVIP' => false, 'status' => 1],
                        ['value' => 999, 'type' => 'flac', 'stream' => 'https://audio.test/lossless', 'download' => 'https://audio.test/dllossless', 'onlyVIP' => true, 'status' => 1],
                        ['value' => 500, 'type' => 'mp3', 'stream' => 'https://audio.test/unavailable', 'onlyVIP' => false, 'status' => 0],
                    ],
                ],
            ]),
        ]);

        $track = app(NhacCuaTuiClient::class)->getSong('Abcd1234', includeCountry: false);

        $this->assertSame('https://audio.test/320', $track['streamUrl']);
        $this->assertSame('https://audio.test/dl320', $track['downloadUrl']);
        $this->assertCount(3, $track['streamOptions']);
        $this->assertSame(['Lossless', '320 kbps', '128 kbps'], array_column($track['streamOptions'], 'label'));
        $this->assertTrue($track['streamOptions'][0]['premiumOnly']);
        $this->assertSame('https://audio.test/lossless', $track['streamOptions'][0]['streamUrl']);
    }

    public function test_vip_lossless_with_status_zero_retains_its_supplied_stream_and_download_urls(): void
    {
        Http::fake([
            '*song/detail/VipSong123' => Http::response([
                'code' => 0,
                'data' => [
                    'key' => 'VipSong123',
                    'name' => 'VIP Song',
                    'qualityDownload' => [
                        ['key' => '128', 'name' => '128 kbps', 'onlyVIP' => false, 'status' => 1, 'value' => 128],
                        ['key' => '320', 'name' => '320 kbps', 'onlyVIP' => false, 'status' => 1, 'value' => 320],
                        ['key' => 'lossless', 'name' => 'Lossless', 'onlyVIP' => true, 'status' => 0, 'value' => 512],
                    ],
                    'streamURL' => [
                        ['type' => '128', 'typeUI' => '128kbps', 'stream' => 'https://audio.test/128', 'onlyVIP' => false, 'status' => 1],
                        ['type' => '320', 'typeUI' => '320kbps', 'stream' => 'https://audio.test/320', 'onlyVIP' => false, 'status' => 1],
                        ['type' => 'lossless', 'typeUI' => 'lossless', 'stream' => 'https://audio.test/lossless.flac', 'download' => 'https://audio.test/download-lossless.flac', 'onlyVIP' => true, 'status' => 0],
                    ],
                ],
            ]),
        ]);

        $track = app(NhacCuaTuiClient::class)->getSong('VipSong123', includeCountry: false);
        $lossless = collect($track['streamOptions'])->firstWhere('label', 'Lossless');

        $this->assertNotNull($lossless);
        $this->assertTrue($lossless['premiumOnly']);
        $this->assertTrue($lossless['available']);
        $this->assertSame('https://audio.test/lossless.flac', $lossless['streamUrl']);
        $this->assertSame('https://audio.test/download-lossless.flac', $lossless['downloadUrl']);
        $this->assertSame('https://audio.test/320', $track['streamUrl']);
        $this->assertSame(['Lossless', '320 kbps', '128 kbps'], array_column($track['streamOptions'], 'label'));
    }

    public function test_vip_quality_without_a_stream_stays_unavailable_and_is_not_replaced_with_regular_audio(): void
    {
        Http::fake([
            '*song/detail/MissingVip123' => Http::response([
                'code' => 0,
                'data' => [
                    'key' => 'MissingVip123',
                    'qualityDownload' => [
                        ['key' => 'lossless', 'name' => 'Lossless', 'onlyVIP' => true, 'status' => 0, 'value' => 512],
                    ],
                    'streamURL' => [
                        ['type' => '320', 'stream' => 'https://audio.test/320', 'onlyVIP' => false, 'status' => 1],
                    ],
                ],
            ]),
        ]);

        $track = app(NhacCuaTuiClient::class)->getSong('MissingVip123', includeCountry: false);
        $lossless = collect($track['streamOptions'])->firstWhere('label', 'Lossless');

        $this->assertNotNull($lossless);
        $this->assertTrue($lossless['premiumOnly']);
        $this->assertFalse($lossless['available']);
        $this->assertNull($lossless['streamUrl']);
        $this->assertNull($lossless['downloadUrl']);
        $this->assertSame('https://audio.test/320', $track['streamUrl']);
    }

    public function test_vip_flag_from_quality_metadata_is_preserved_for_a_status_zero_stream(): void
    {
        Http::fake([
            '*song/detail/MetadataVip123' => Http::response([
                'code' => 0,
                'data' => [
                    'key' => 'MetadataVip123',
                    'qualityDownload' => [
                        ['key' => 'lossless', 'name' => 'Lossless', 'onlyVIP' => true, 'value' => 512],
                    ],
                    'streamURL' => [
                        ['type' => 'lossless', 'stream' => 'https://audio.test/lossless.flac', 'status' => 0],
                    ],
                ],
            ]),
        ]);

        $track = app(NhacCuaTuiClient::class)->getSong('MetadataVip123', includeCountry: false);
        $this->assertCount(1, $track['streamOptions']);
        $this->assertTrue($track['streamOptions'][0]['premiumOnly']);
        $this->assertTrue($track['streamOptions'][0]['available']);
        $this->assertSame('https://audio.test/lossless.flac', $track['streamOptions'][0]['streamUrl']);
        $this->assertNull($track['streamUrl']);
        $this->assertNull($track['downloadUrl']);
    }
}
