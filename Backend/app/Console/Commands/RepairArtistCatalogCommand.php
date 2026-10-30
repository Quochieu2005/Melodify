<?php

namespace App\Console\Commands;

use App\Services\Music\SongImportService;
use Illuminate\Console\Command;

class RepairArtistCatalogCommand extends Command
{
    protected $signature = 'artists:repair-catalog';

    protected $description = 'Split combined artist names, reuse existing artists, and merge duplicate artist records';

    public function handle(SongImportService $songImportService): int
    {
        $stats = $songImportService->repairArtistCatalog();

        $this->info("Đã tách {$stats['split']} nghệ sĩ gộp, gộp {$stats['merged']} bản ghi trùng và cập nhật {$stats['credits']} liên kết bài hát.");

        return self::SUCCESS;
    }
}
