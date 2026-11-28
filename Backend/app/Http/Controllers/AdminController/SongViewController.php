<?php

namespace App\Http\Controllers\AdminController;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AdminResourceRequest;
use App\Models\Artist;
use App\Models\Favorite;
use App\Models\Lyric;
use App\Models\Song;
use App\Models\SongArtist;
use App\Models\SongAudioFile;
use App\Models\SongPlayEvent;
use App\Models\SongShare;
use App\Rules\PlainText;
use App\Services\Analytics\EventCounts;
use App\Services\CloudinaryService;
use App\Services\Music\LyricsClient;
use App\Services\Music\NhacCuaTuiClient;
use App\Support\CatalogRevision;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\View\View;
use Throwable;

class SongViewController extends Controller
{
    public function lyricsIndex(Request $request): View
    {
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:100', new PlainText],
        ], [
            'q.max' => 'Từ khóa tìm kiếm không được dài hơn 100 ký tự.',
        ]);
        $search = trim((string) ($filters['q'] ?? ''));
        $songQuery = Song::query()->whereIn('status', ['published', 'draft']);

        if ($search !== '') {
            $songQuery->where(function ($query) use ($search): void {
                $query
                    ->where('title', 'like', "%{$search}%")
                    ->orWhere('artist_name', 'like', "%{$search}%");
            });
        }

        $songs = $songQuery
            ->orderBy('title')
            ->paginate(20)
            ->withQueryString();
        $songIds = $songs->map(fn (Song $song): string => (string) $song->getKey())->values()->all();
        $lyricsBySong = $songIds === []
            ? collect()
            : Lyric::query()->whereIn('song_id', $songIds)->get()->keyBy(fn (Lyric $lyric): string => (string) $lyric->song_id);
        $audioBySong = $songIds === []
            ? collect()
            : SongAudioFile::query()
                ->whereIn('song_id', $songIds)
                ->where('file_type', 'full')
                ->where('status', 'active')
                ->get()
                ->keyBy(fn (SongAudioFile $audio): string => (string) $audio->song_id);

        $items = $songs->setCollection(
            $songs->getCollection()->map(function (Song $song) use ($lyricsBySong, $audioBySong): array {
                $songId = (string) $song->getKey();
                $lyric = $lyricsBySong->get($songId);
                $audio = $audioBySong->get($songId);

                return [
                    'song' => $song,
                    'lyric' => $lyric,
                    'has_plain_lyrics' => filled($lyric?->plain_lyrics) || (blank($lyric?->synced_lyrics) && filled($lyric?->content)),
                    'has_synced_lyrics' => $this->hasTimedLyrics($lyric),
                    'has_full_audio' => $audio !== null,
                    'has_audio' => $audio !== null || filled($song->preview_url),
                ];
            })
        );

        return view('Admin.songs.lyrics-index', [
            'items' => $items,
            'search' => $search,
        ]);
    }

    public function showLyrics(string $id, NhacCuaTuiClient $nhaccuatui): View
    {
        $song = Song::query()->findOrFail($id);
        $lyric = Lyric::query()->where('song_id', (string) $song->getKey())->first();
        $audioFile = SongAudioFile::query()
            ->where('song_id', (string) $song->getKey())
            ->where('status', 'active')
            ->where('file_type', 'full')
            ->first();

        $audioExternalId = null;
        if ($song->external_source === 'nhaccuatui'
            && ($audioFile?->source === 'nhaccuatui' || blank($audioFile?->source))) {
            $audioExternalId = $audioFile?->external_id ?: $song->external_id;
        }
        $lyricsExternalId = $song->external_source === 'nhaccuatui'
            ? $song->external_id
            : $audioFile?->external_id;

        $hasLocalAudioOverride = $audioFile
            && $audioFile->source !== 'nhaccuatui'
            && blank($audioFile->external_id);

        if (filled($audioExternalId) && ! $hasLocalAudioOverride) {
            try {
                $externalTrack = $nhaccuatui->getSong((string) $audioExternalId);
                if (filled($externalTrack['streamUrl'] ?? null) || ! empty($externalTrack['streamOptions'])) {
                    $audioFile ??= new SongAudioFile;
                    $audioFile->song_id = (string) $song->getKey();
                    $audioFile->file_type = 'full';
                    $audioFile->file_url = $externalTrack['streamUrl'] ?? null;
                    $audioFile->stream_options = $externalTrack['streamOptions'] ?? [];
                    $audioFile->external_id = (string) ($externalTrack['trackId'] ?? $audioExternalId);
                    $audioFile->source = 'nhaccuatui';
                    $audioFile->duration_seconds = isset($externalTrack['trackTimeMillis'])
                        ? (int) round(((int) $externalTrack['trackTimeMillis']) / 1000)
                        : $audioFile->duration_seconds;
                    $audioFile->premium_only = (bool) ($audioFile->premium_only ?? false);
                    $audioFile->refreshed_at = now();
                    $audioFile->status = 'active';
                    $audioFile->save();
                }
            } catch (Throwable) {
                // Keep the last signed URL when NhacCuaTui is temporarily unavailable.
            }
        }

        $audioQualities = ($audioFile?->source === 'nhaccuatui')
            ? collect($audioFile->stream_options ?? [])
                ->filter(fn ($option): bool => is_array($option))
                ->map(function (array $option) use ($song): ?array {
                    $qualityId = trim((string) ($option['qualityId'] ?? $option['quality_id'] ?? ''));
                    if ($qualityId === '') {
                        return null;
                    }

                    $available = (bool) ($option['available'] ?? filled($option['streamUrl'] ?? $option['stream_url'] ?? null));

                    return [
                        'quality_id' => $qualityId,
                        'label' => (string) ($option['label'] ?? 'Chất lượng audio'),
                        'bitrate' => $option['bitrate'] ?? null,
                        'premium_only' => (bool) ($option['premiumOnly'] ?? $option['premium_only'] ?? false),
                        'available' => $available,
                        'url' => $available
                            ? route('admin.songs.audio', ['song' => $song->getKey(), 'quality_id' => $qualityId])
                            : null,
                    ];
                })
                ->filter()
                ->values()
                ->all()
            : [];

        if (filled($lyricsExternalId) && (! $lyric || blank($lyric->plain_lyrics) || blank($lyric->synced_lyrics))) {
            try {
                $externalLyrics = $nhaccuatui->getLyrics((string) $lyricsExternalId);
                if ($externalLyrics && (filled($externalLyrics['plainLyrics'] ?? null) || filled($externalLyrics['syncedLyrics'] ?? null))) {
                    $lyric ??= new Lyric([
                        'song_id' => (string) $song->getKey(),
                        'language' => 'unknown',
                    ]);
                    $lyric->plain_lyrics = $lyric->plain_lyrics ?: ($externalLyrics['plainLyrics'] ?? null);
                    $lyric->synced_lyrics = $lyric->synced_lyrics ?: ($externalLyrics['syncedLyrics'] ?? null);
                    $lyric->is_synced = $this->hasTimedLyrics($lyric);
                    $lyric->content = $lyric->plain_lyrics ?: $lyric->synced_lyrics;
                    $lyric->source = 'NhacCuaTui';
                    $lyric->save();
                }
            } catch (Throwable) {
                // Keep the saved lyrics when the upstream lyric service is unavailable.
            }
        }

        return view('Admin.songs.lyrics', [
            'song' => $song,
            'lyric' => $lyric,
            'hasTimedLyrics' => $this->hasTimedLyrics($lyric),
            'audioFile' => $audioFile,
            'audioUrl' => $audioFile?->source === 'nhaccuatui'
                ? route('admin.songs.audio', $song->getKey())
                : ($audioFile?->file_url ?: $song->preview_url),
            'audioLabel' => filled($audioFile?->file_url) ? 'Bản đầy đủ' : 'Bản nghe thử',
            'audioQualities' => $audioQualities,
        ]);
    }

    public function syncFromSources(string $id, NhacCuaTuiClient $nhaccuatui, LyricsClient $lyricsClient): RedirectResponse
    {
        $song = Song::query()->findOrFail($id);
        $audioFile = SongAudioFile::query()
            ->where('song_id', (string) $song->getKey())
            ->where('status', 'active')
            ->where('file_type', 'full')
            ->first();
        $lyric = Lyric::query()->where('song_id', (string) $song->getKey())->first()
            ?: new Lyric([
                'song_id' => (string) $song->getKey(),
                'language' => 'unknown',
            ]);
        $externalId = $audioFile?->external_id;
        if (blank($externalId) && $song->external_source === 'nhaccuatui') {
            $externalId = $song->external_id;
        }

        $syncedLyrics = null;
        $plainLyrics = null;
        $source = null;

        if (filled($externalId)) {
            try {
                $externalLyrics = $nhaccuatui->getLyrics((string) $externalId);
                $syncedLyrics = trim((string) ($externalLyrics['syncedLyrics'] ?? '')) ?: null;
                $plainLyrics = trim((string) ($externalLyrics['plainLyrics'] ?? '')) ?: null;
                $source = $syncedLyrics ? 'NhacCuaTui' : null;
            } catch (Throwable) {
                // Try the provider-independent fallback below.
            }
        }

        if (blank($syncedLyrics) || blank($plainLyrics)) {
            try {
                $externalLyrics = $lyricsClient->find(
                    (string) $song->title,
                    (string) $song->artist_name,
                    $song->album?->title,
                    (int) ($audioFile?->duration_seconds ?: $song->duration_seconds ?: 0),
                );
                $providerSyncedLyrics = trim((string) data_get($externalLyrics, 'syncedLyrics', data_get($externalLyrics, 'synced_lyrics', ''))) ?: null;
                $providerPlainLyrics = trim((string) data_get($externalLyrics, 'plainLyrics', data_get($externalLyrics, 'plain_lyrics', ''))) ?: null;
                $plainLyrics ??= $providerPlainLyrics;
                $syncedLyrics ??= $providerSyncedLyrics;
                $source = $syncedLyrics && blank($source) ? 'LRCLIB' : $source;
            } catch (Throwable) {
                // Report the user-facing failure below instead of breaking the lyrics page.
            }
        }

        if (blank($syncedLyrics) || preg_match('/\[\d+:\d+(?:\.\d+)?\]/', (string) $syncedLyrics) !== 1) {
            return back()->withErrors([
                'synced_lyrics' => 'Nguồn lời hiện chỉ có lời thường hoặc chưa có LRC đồng bộ. Lời thường không thể tự khớp chính xác theo giọng hát; hãy nhập LRC có mốc thời gian hoặc chỉnh từng mốc thủ công.',
            ]);
        }

        $lyric->content = $plainLyrics ?: ($lyric->plain_lyrics ?: $syncedLyrics);
        $lyric->plain_lyrics = $plainLyrics ?: $lyric->plain_lyrics;
        $lyric->synced_lyrics = $syncedLyrics;
        $lyric->is_synced = true;
        $lyric->source = $source ?: 'External';
        $lyric->save();
        $this->bumpCatalogContentRevision();

        return redirect()->route('admin.songs.lyrics', $song->getKey())
            ->with('success', 'Đã tải lời LRC đồng bộ thật từ '.($source ?: 'nguồn bên ngoài').'.');
    }

    public function updateLyrics(Request $request, string $id, CloudinaryService $cloudinary): RedirectResponse
    {
        $song = Song::query()->findOrFail($id);
        $data = $request->validate([
            'plain_lyrics' => ['nullable', 'string', 'max:50000', new PlainText],
            'synced_lyrics' => ['nullable', 'string', 'max:80000', new PlainText],
            'audio_file' => AdminResourceRequest::audioFileRules(),
            'audio_url' => ['nullable', 'url:http,https', 'max:500', new PlainText],
            'remove_audio' => ['nullable', 'boolean'],
        ]);
        $plainLyrics = trim((string) ($data['plain_lyrics'] ?? ''));
        $syncedLyrics = trim((string) ($data['synced_lyrics'] ?? ''));
        if ($syncedLyrics !== '' && preg_match('/\[\d+:\d+(?:\.\d+)?\]/', $syncedLyrics) !== 1) {
            return back()->withErrors([
                'synced_lyrics' => 'Lời đồng bộ phải là LRC có mốc thời gian, ví dụ [00:12.50]Dòng lời.',
            ])->withInput();
        }
        $songId = (string) $song->getKey();
        $fullAudio = SongAudioFile::query()
            ->where('song_id', $songId)
            ->where('file_type', 'full')
            ->first();

        try {
            if ($request->hasFile('audio_file')) {
                $uploaded = $cloudinary->uploadAudio(
                    $request->file('audio_file'),
                    config('cloudinary.audio_folder', 'melodify/audio'),
                    $cloudinary->datedPublicId($song->slug.'-full-audio'),
                );
                $this->saveFullAudio($song, [
                    'file_url' => $uploaded['secure_url'] ?? $uploaded['url'] ?? null,
                    'public_id' => $uploaded['public_id'] ?? null,
                    'duration_seconds' => isset($uploaded['duration']) ? (int) round((float) $uploaded['duration']) : null,
                    'source' => 'cloudinary',
                ]);
            } elseif ($request->boolean('remove_audio') && $fullAudio) {
                if ($fullAudio->source === 'cloudinary' && filled($fullAudio->public_id)) {
                    $cloudinary->deleteAudio($fullAudio->public_id);
                }
                $fullAudio->delete();
            } elseif (filled($data['audio_url'] ?? null)) {
                $this->saveFullAudio($song, [
                    'file_url' => $data['audio_url'],
                    'public_id' => null,
                    'duration_seconds' => null,
                    'source' => 'admin_url',
                ]);
            }
        } catch (Throwable $exception) {
            report($exception);

            return back()->withErrors([
                'audio_file' => 'Không thể lưu file audio đầy đủ. Kiểm tra Cloudinary hoặc URL audio rồi thử lại.',
            ])->withInput();
        }

        if ($plainLyrics === '' && $syncedLyrics === '') {
            Lyric::query()->where('song_id', $songId)->delete();
            $this->bumpCatalogContentRevision();

            return redirect()->route('admin.songs.lyrics', $song->getKey())
                ->with('success', 'Đã xóa lời bài hát.');
        }

        $lyric = Lyric::query()->firstOrNew([
            'song_id' => $songId,
            'language' => 'unknown',
        ]);
        $lyric->content = $plainLyrics !== '' ? $plainLyrics : $syncedLyrics;
        $lyric->plain_lyrics = $plainLyrics !== '' ? $plainLyrics : null;
        $lyric->synced_lyrics = $syncedLyrics !== '' ? $syncedLyrics : null;
        $lyric->is_synced = $this->hasTimedLyrics($lyric);
        $lyric->source = 'Admin';
        $lyric->save();
        $this->bumpCatalogContentRevision();

        return redirect()->route('admin.songs.lyrics', $song->getKey())
            ->with('success', 'Đã lưu lời bài hát.');
    }

    private function saveFullAudio(Song $song, array $data): void
    {
        if (blank($data['file_url'] ?? null)) {
            throw new \RuntimeException('Cloudinary không trả về URL audio.');
        }

        $audio = SongAudioFile::query()
            ->where('song_id', (string) $song->getKey())
            ->where('file_type', 'full')
            ->first() ?: new SongAudioFile;
        $oldSource = (string) ($audio->source ?? '');
        $oldPublicId = (string) ($audio->public_id ?? '');
        $audio->song_id = (string) $song->getKey();
        $audio->file_type = 'full';
        $audio->file_url = $data['file_url'];
        $audio->public_id = $data['public_id'] ?? null;
        $audio->duration_seconds = $data['duration_seconds'] ?: $song->duration_seconds;
        $audio->external_id = ($data['source'] ?? 'admin') === 'nhaccuatui'
            ? ($data['external_id'] ?? null)
            : null;
        $audio->premium_only = false;
        $audio->stream_options = ($data['source'] ?? 'admin') === 'nhaccuatui'
            ? ($data['stream_options'] ?? null)
            : null;
        $audio->status = 'active';
        $audio->source = $data['source'] ?? 'admin';

        try {
            $audio->save();
        } catch (Throwable $exception) {
            // The new file was never attached to the song, so it would stay on Cloudinary forever.
            if (($data['source'] ?? '') === 'cloudinary' && filled($data['public_id'] ?? null)) {
                try {
                    app(CloudinaryService::class)->deleteAudio((string) $data['public_id']);
                } catch (Throwable $cleanup) {
                    report($cleanup);
                }
            }

            throw $exception;
        }

        if (($data['duration_seconds'] ?? 0) > 0 && (int) $song->duration_seconds !== (int) $data['duration_seconds']) {
            $song->duration_seconds = (int) $data['duration_seconds'];
            $song->save();
        }

        if ($oldSource === 'cloudinary' && $oldPublicId !== '' && $oldPublicId !== (string) ($data['public_id'] ?? '')) {
            try {
                app(CloudinaryService::class)->deleteAudio($oldPublicId);
            } catch (Throwable $exception) {
                report($exception);
            }
        }
    }

    private function hasTimedLyrics(?Lyric $lyric): bool
    {
        return filled($lyric?->synced_lyrics)
            && preg_match('/\[\d+:\d+(?:\.\d+)?\]/', (string) $lyric->synced_lyrics) === 1;
    }

    private function bumpCatalogContentRevision(): void
    {
        CatalogRevision::bump();
    }

    public function index(Request $request): View
    {
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:100', new PlainText],
            'period' => ['nullable', 'in:all,7,30'],
            'sort' => ['nullable', 'in:views,favorites,shares'],
        ], [
            'q.max' => 'Từ khóa tìm kiếm không được dài hơn 100 ký tự.',
            'period.in' => 'Khoảng thời gian không hợp lệ.',
            'sort.in' => 'Kiểu xếp hạng không hợp lệ.',
        ]);

        $search = trim((string) ($filters['q'] ?? ''));
        $period = (string) ($filters['period'] ?? 'all');
        $sort = (string) ($filters['sort'] ?? 'views');
        $from = $period === 'all' ? null : now()->subDays((int) $period)->startOfDay();
        $songQuery = Song::query()->whereIn('status', ['published', 'draft']);

        if ($search !== '') {
            $songQuery->where(function ($query) use ($search): void {
                $query
                    ->where('title', 'like', "%{$search}%")
                    ->orWhere('artist_name', 'like', "%{$search}%");
            });
        }

        // Only the columns the list and the ranking read: this page ranks every song, so a full document per song
        // (and every lyric text, audio file and artist link) grows with the catalog.
        $songs = $songQuery->get(['title', 'slug', 'status', 'artist_name', 'cover_url', 'duration_seconds']);
        $songIds = $songs->map(fn (Song $song): string => (string) $song->getKey())->values()->all();

        // Counted inside MongoDB: a play event is stored per listen, so loading them all grows without limit.
        $viewsBySong = $songIds === [] ? collect() : collect(EventCounts::by(SongPlayEvent::class, 'song_id', 'started_at', $from));
        $favoritesBySong = $songIds === [] ? collect() : collect(EventCounts::by(Favorite::class, 'song_id', 'created_at', $from));
        $sharesBySong = $songIds === [] ? collect() : collect(EventCounts::by(SongShare::class, 'song_id', 'created_at', $from));
        // Which songs have lyrics, without downloading the lyric texts.
        $withLyrics = $songIds === [] ? [] : EventCounts::by(Lyric::class, 'song_id');

        $allItems = $songs
            ->map(function (Song $song) use ($viewsBySong, $favoritesBySong, $sharesBySong, $withLyrics): array {
                $songId = (string) $song->getKey();

                return [
                    'song' => $song,
                    'artist' => $song->artist_name,
                    'views' => $viewsBySong->get($songId, 0),
                    'favorites' => $favoritesBySong->get($songId, 0),
                    'shares' => $sharesBySong->get($songId, 0),
                    'has_lyrics' => isset($withLyrics[$songId]),
                ];
            })
            ->sort(function (array $left, array $right) use ($sort): int {
                $score = $right[$sort] <=> $left[$sort];

                return $score !== 0
                    ? $score
                    : strcasecmp((string) $left['song']->title, (string) $right['song']->title);
            })
            ->values();

        $page = LengthAwarePaginator::resolveCurrentPage();
        $pageItems = $allItems->forPage($page, 20)->values();

        // Songs without a written artist name show the name of their linked artist: looked up for this page only.
        $needArtist = $pageItems->filter(fn (array $item): bool => blank($item['artist']))->map(fn (array $item): string => (string) $item['song']->getKey())->values()->all();
        if ($needArtist !== []) {
            $links = SongArtist::query()->whereIn('song_id', $needArtist)->get()
                ->sortBy(fn (SongArtist $link): int => mb_strtolower(trim((string) ($link->artist_role ?? ''))) === 'primary' ? 0 : 1)
                ->groupBy(fn (SongArtist $link): string => (string) $link->song_id)
                ->map(fn ($group): SongArtist => $group->first());
            $artistNames = Artist::query()->whereIn('_id', $links->pluck('artist_id')->filter()->map(fn ($id): string => (string) $id)->unique()->values()->all())->get(['name'])
                ->mapWithKeys(fn (Artist $artist): array => [(string) $artist->getKey() => $artist->name]);
            $pageItems = $pageItems->map(function (array $item) use ($links, $artistNames): array {
                if (blank($item['artist'])) {
                    $item['artist'] = $artistNames->get((string) $links->get((string) $item['song']->getKey())?->artist_id);
                }

                return $item;
            });
        }

        $items = new LengthAwarePaginator(
            $pageItems,
            $allItems->count(),
            20,
            $page,
            ['path' => $request->url(), 'query' => $request->query()],
        );

        return view('Admin.analytics.song-views', [
            'items' => $items,
            'search' => $search,
            'period' => $period,
            'sort' => $sort,
            'sortLabel' => [
                'views' => 'lượt xem',
                'favorites' => 'lượt yêu thích',
                'shares' => 'lượt chia sẻ',
            ][$sort],
            'totalViews' => $allItems->sum('views'),
            'totalFavorites' => $allItems->sum('favorites'),
            'totalShares' => $allItems->sum('shares'),
            'songsWithViews' => $allItems->where('views', '>', 0)->count(),
            'songsWithLyrics' => $allItems->where('has_lyrics', true)->count(),
        ]);
    }
}
