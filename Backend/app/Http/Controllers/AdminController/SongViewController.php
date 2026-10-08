<?php

namespace App\Http\Controllers\AdminController;

use App\Http\Controllers\Controller;
use App\Models\Artist;
use App\Models\Favorite;
use App\Models\Lyric;
use App\Models\Song;
use App\Models\SongAudioFile;
use App\Models\SongPlayEvent;
use App\Models\SongArtist;
use App\Models\SongShare;
use App\Rules\PlainText;
use App\Services\CloudinaryService;
use App\Services\Music\NhacCuaTuiClient;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\View\View;
use Throwable;

class SongViewController extends Controller
{
    public function lyricsIndex(Request $request): View
    {
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:100', new PlainText()],
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

        $items = $songQuery
            ->limit(500)
            ->get()
            ->map(function (Song $song): array {
                $songId = (string) $song->getKey();
                $lyric = Lyric::query()->where('song_id', $songId)->first();
                $audio = SongAudioFile::query()
                    ->where('song_id', $songId)
                    ->where('file_type', 'full')
                    ->where('status', 'active')
                    ->first();

                return [
                    'song' => $song,
                    'lyric' => $lyric,
                    'has_plain_lyrics' => filled($lyric?->plain_lyrics) || (blank($lyric?->synced_lyrics) && filled($lyric?->content)),
                    'has_synced_lyrics' => filled($lyric?->synced_lyrics),
                    'has_full_audio' => $audio !== null,
                    'has_audio' => $audio !== null || filled($song->preview_url),
                ];
            })
            ->sort(fn (array $left, array $right): int => strcasecmp((string) $left['song']->title, (string) $right['song']->title))
            ->values();

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

        $externalId = $audioFile?->external_id;
        if (blank($externalId) && $song->external_source === 'nhaccuatui') {
            $externalId = $song->external_id;
        }

        if (filled($externalId)) {
            try {
                $externalTrack = $nhaccuatui->getSong((string) $externalId);
                if (filled($externalTrack['streamUrl'] ?? null)) {
                    $audioFile ??= new SongAudioFile();
                    $audioFile->song_id = (string) $song->getKey();
                    $audioFile->file_type = 'full';
                    $audioFile->file_url = $externalTrack['streamUrl'];
                    $audioFile->external_id = (string) ($externalTrack['trackId'] ?? $externalId);
                    $audioFile->source = 'nhaccuatui';
                    $audioFile->duration_seconds = isset($externalTrack['trackTimeMillis'])
                        ? (int) round(((int) $externalTrack['trackTimeMillis']) / 1000)
                        : $audioFile->duration_seconds;
                    $audioFile->premium_only = false;
                    $audioFile->status = 'active';
                    $audioFile->save();
                }
            } catch (Throwable) {
                // Keep the last signed URL when NhacCuaTui is temporarily unavailable.
            }
        }

        if ($lyric && $song->external_source === 'nhaccuatui'
            && (blank($lyric->synced_lyrics) || preg_match('#^https?://.+\.lrc(?:\?.*)?$#i', (string) $lyric->synced_lyrics) === 1)
            && filled($song->external_id)) {
            try {
                $externalLyrics = $nhaccuatui->getLyrics((string) $song->external_id);
                if (filled($externalLyrics['syncedLyrics'] ?? null)) {
                    $lyric->synced_lyrics = $externalLyrics['syncedLyrics'];
                    $lyric->is_synced = true;
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
            'audioFile' => $audioFile,
            'audioUrl' => $audioFile?->source === 'nhaccuatui'
                ? route('admin.songs.audio', $song->getKey())
                : ($audioFile?->file_url ?: $song->preview_url),
            'audioLabel' => filled($audioFile?->file_url) ? 'Bản đầy đủ' : 'Bản nghe thử',
        ]);
    }

    public function updateLyrics(Request $request, string $id, CloudinaryService $cloudinary): RedirectResponse
    {
        $song = Song::query()->findOrFail($id);
        $data = $request->validate([
            'plain_lyrics' => ['nullable', 'string', 'max:50000', new PlainText()],
            'synced_lyrics' => ['nullable', 'string', 'max:80000', new PlainText()],
            'audio_file' => ['nullable', 'file', 'mimes:mp3,wav,ogg,m4a,aac,webm', 'max:102400'],
            'audio_url' => ['nullable', 'url:http,https', 'max:500', new PlainText()],
            'remove_audio' => ['nullable', 'boolean'],
        ]);
        $plainLyrics = trim((string) ($data['plain_lyrics'] ?? ''));
        $syncedLyrics = trim((string) ($data['synced_lyrics'] ?? ''));
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
        $lyric->is_synced = $syncedLyrics !== '';
        $lyric->source = 'Admin';
        $lyric->save();

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
            ->first() ?: new SongAudioFile();
        $audio->song_id = (string) $song->getKey();
        $audio->file_type = 'full';
        $audio->file_url = $data['file_url'];
        $audio->public_id = $data['public_id'] ?? null;
        $audio->duration_seconds = $data['duration_seconds'] ?: $song->duration_seconds;
        $audio->premium_only = false;
        $audio->status = 'active';
        $audio->source = $data['source'] ?? 'admin';
        $audio->save();
    }

    public function index(Request $request): View
    {
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:100', new PlainText()],
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

        $items = $songQuery
            ->limit(500)
            ->get()
            ->map(function (Song $song) use ($from): array {
                $songId = (string) $song->getKey();
                $artistLink = SongArtist::query()->where('song_id', $songId)->first();
                $artist = $artistLink ? Artist::query()->find($artistLink->artist_id) : null;
                $views = SongPlayEvent::query()->where('song_id', $songId);
                $favorites = Favorite::query()->where('song_id', $songId);
                $shares = SongShare::query()->where('song_id', $songId);
                $lyric = Lyric::query()->where('song_id', $songId)->first();
                $hasFullAudio = SongAudioFile::query()
                    ->where('song_id', $songId)
                    ->where('file_type', 'full')
                    ->where('status', 'active')
                    ->exists();

                if ($from !== null) {
                    $views->where('started_at', '>=', $from);
                    $favorites->where('created_at', '>=', $from);
                    $shares->where('created_at', '>=', $from);
                }

                return [
                    'song' => $song,
                    'artist' => $song->artist_name ?: $artist?->name,
                    'views' => $views->count(),
                    'favorites' => $favorites->count(),
                    'shares' => $shares->count(),
                    'has_lyrics' => $lyric !== null,
                    'has_plain_lyrics' => filled($lyric?->plain_lyrics) || (blank($lyric?->synced_lyrics) && filled($lyric?->content)),
                    'has_synced_lyrics' => filled($lyric?->synced_lyrics),
                    'has_audio' => $hasFullAudio || filled($song->preview_url),
                    'has_full_audio' => $hasFullAudio,
                ];
            })
            ->sort(function (array $left, array $right) use ($sort): int {
                $score = $right[$sort] <=> $left[$sort];

                return $score !== 0
                    ? $score
                    : strcasecmp((string) $left['song']->title, (string) $right['song']->title);
            })
            ->values();

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
            'totalViews' => $items->sum('views'),
            'totalFavorites' => $items->sum('favorites'),
            'totalShares' => $items->sum('shares'),
            'songsWithViews' => $items->where('views', '>', 0)->count(),
            'songsWithLyrics' => $items->where('has_lyrics', true)->count(),
        ]);
    }
}
