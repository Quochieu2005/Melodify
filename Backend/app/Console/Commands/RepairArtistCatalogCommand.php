<?php

namespace App\Console\Commands;

use App\Services\Music\SongImportService;
use Illuminate\Console\Command;

class RepairArtistCatalogCommand extends Command
{
    protected $signature = 'artists:repair-catalog {--dry-run : Show what would change without saving anything}';

    protected $description = 'Split combined artist names, reuse existing artists, and merge duplicate artist records (moving credits, followers, albums, playlists, banners and videos)';

    public function handle(SongImportService $songImportService): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $stats = $songImportService->repairArtistCatalog(null, $dryRun);
        $prefix = $dryRun ? '[dry-run] Sẽ' : 'Đã';

        $this->info("{$prefix} tách {$stats['split']} nghệ sĩ gộp, gộp {$stats['merged']} bản ghi trùng, cập nhật {$stats['credits']} liên kết bài hát và {$stats['references']} liên kết khác (người theo dõi, album, playlist, banner, video).");

        return self::SUCCESS;
    }
}
