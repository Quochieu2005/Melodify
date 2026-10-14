<?php

namespace App\Http\Controllers\AdminController;

use App\Http\Controllers\Controller;
use App\Models\Artist;
use App\Models\Favorite;
use App\Models\Payment;
use App\Models\Playlist;
use App\Models\PlaylistSong;
use App\Models\Song;
use App\Models\SongArtist;
use App\Models\SongPlayEvent;
use App\Models\SongShare;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\View\View;

class DashboardController extends Controller
{
    public function index(): View
    {
        $today = now()->startOfDay();
        $trendStart = $today->copy()->subDays(6);
        $recentPlayStart = $today->copy()->subDays(29);
        $latestSongs = Song::query()
            ->with(['album', 'createdByArtist'])
            ->latest()
            ->limit(6)
            ->get();

        // Read the time-series collections once instead of querying once per
        // day and once per song.
        $playEvents = SongPlayEvent::query()
            ->where('started_at', '>=', $recentPlayStart)
            ->get(['song_id', 'started_at']);
        $playCountByDay = $playEvents
            ->groupBy(fn (SongPlayEvent $event): string => $this->dayKey($event->started_at))
            ->map(fn ($events): int => $events->count());
        $playCountBySong = $playEvents
            ->groupBy(fn (SongPlayEvent $event): string => (string) $event->song_id)
            ->map(fn ($events): int => $events->count());

        $successfulPaymentStatuses = ['success', 'paid', 'completed'];
        $payments = Payment::query()
            ->whereIn('status', $successfulPaymentStatuses)
            ->where('paid_at', '>=', $trendStart)
            ->get(['amount', 'paid_at']);
        $paymentAmountByDay = $payments
            ->groupBy(fn (Payment $payment): string => $this->dayKey($payment->paid_at))
            ->map(fn ($items): float => (float) $items->sum(fn (Payment $payment): float => (float) ($payment->amount ?? 0)));

        $newUsers = User::query()
            ->where('created_at', '>=', $trendStart)
            ->get(['created_at']);
        $userCountByDay = $newUsers
            ->groupBy(fn (User $user): string => $this->dayKey($user->created_at))
            ->map(fn ($users): int => $users->count());

        $playTrend = collect(range(6, 0))->map(function (int $daysAgo) use ($today, $playCountByDay): array {
            $day = $today->copy()->subDays($daysAgo);

            return [
                'label' => $daysAgo === 0 ? 'Hôm nay' : $day->format('d/m'),
                'value' => $playCountByDay->get($day->format('Y-m-d'), 0),
            ];
        })->values();

        $paymentTrend = collect(range(6, 0))->map(function (int $daysAgo) use ($today, $paymentAmountByDay): array {
            $day = $today->copy()->subDays($daysAgo);

            return [
                'label' => $daysAgo === 0 ? 'Hôm nay' : $day->format('d/m'),
                'value' => $paymentAmountByDay->get($day->format('Y-m-d'), 0),
            ];
        })->values();

        $userTrend = collect(range(6, 0))->map(function (int $daysAgo) use ($today, $userCountByDay): array {
            $day = $today->copy()->subDays($daysAgo);

            return [
                'label' => $daysAgo === 0 ? 'Hôm nay' : $day->format('d/m'),
                'value' => $userCountByDay->get($day->format('Y-m-d'), 0),
            ];
        })->values();

        $topSongs = $latestSongs->map(function (Song $song) use ($playCountBySong): array {
            return [
                'song' => $song,
                'plays' => $playCountBySong->get((string) $song->getKey(), 0),
            ];
        })->sortByDesc('plays')->values();

        $engagementRankings = $this->engagementRankings($playCountBySong);

        return view('Admin.dashboard', [
            'stats' => [
                'songs' => Song::query()->count(),
                'artists' => Artist::query()->count(),
                'users' => User::query()->count(),
                'playsToday' => $playCountByDay->get($today->format('Y-m-d'), 0),
                'paymentsToday' => $paymentTrend->last()['value'] ?? 0,
            ],
            'latestSongs' => $latestSongs,
            'playTrend' => $playTrend,
            'paymentTrend' => $paymentTrend,
            'userTrend' => $userTrend,
            'topSongs' => $topSongs,
            'engagementRankings' => $engagementRankings,
        ]);
    }

    /** @return array{playlists: array<string, Collection>, artists: array<string, Collection>} */
    private function engagementRankings(Collection $playCounts): array
    {
        $favoriteCounts = Favorite::query()
            ->get(['song_id'])
            ->groupBy(fn (Favorite $favorite): string => (string) $favorite->song_id)
            ->map(fn (Collection $items): int => $items->count());
        $shareCounts = SongShare::query()
            ->get(['song_id'])
            ->groupBy(fn (SongShare $share): string => (string) $share->song_id)
            ->map(fn (Collection $items): int => $items->count());

        $playlistLinks = PlaylistSong::query()
            ->get(['playlist_id', 'song_id'])
            ->groupBy(fn (PlaylistSong $link): string => (string) $link->playlist_id);
        $playlistIds = $playlistLinks->keys()->map(fn ($id): string => (string) $id)->values()->all();
        $playlistKey = (new Playlist())->getKeyName();
        $playlists = $playlistIds === []
            ? collect()
            : Playlist::query()->whereIn($playlistKey, $playlistIds)->get();

        $playlistCards = $playlists->map(function (Playlist $playlist) use ($playlistLinks, $playCounts, $favoriteCounts, $shareCounts): array {
            $songIds = $playlistLinks
                ->get((string) $playlist->getKey(), collect())
                ->pluck('song_id')
                ->map(fn ($id): string => (string) $id);

            return $this->engagementCard(
                $playlist->name ?: 'Playlist chưa đặt tên',
                $playlist->type_custom ?: config('playlists.types.'.($playlist->type ?? ''), 'Playlist'),
                $playlist->cover_url ?? null,
                $songIds,
                $playCounts,
                $favoriteCounts,
                $shareCounts,
            );
        });

        $artistLinks = SongArtist::query()
            ->get(['artist_id', 'song_id'])
            ->groupBy(fn (SongArtist $link): string => (string) $link->artist_id);
        $artistIds = $artistLinks->keys()->map(fn ($id): string => (string) $id)->values()->all();
        $artistKey = (new Artist())->getKeyName();
        $artists = $artistIds === []
            ? collect()
            : Artist::query()->whereIn($artistKey, $artistIds)->get();

        $artistCards = $artists->map(function (Artist $artist) use ($artistLinks, $playCounts, $favoriteCounts, $shareCounts): array {
            $songIds = $artistLinks
                ->get((string) $artist->getKey(), collect())
                ->pluck('song_id')
                ->map(fn ($id): string => (string) $id);

            return $this->engagementCard(
                $artist->name ?: 'Nghệ sĩ chưa đặt tên',
                'Tổng hợp từ các bài hát của nghệ sĩ',
                $artist->avatar_url ?? $artist->image_url ?? null,
                $songIds,
                $playCounts,
                $favoriteCounts,
                $shareCounts,
            );
        });

        return [
            'playlists' => [
                'plays' => $this->rankEngagementCards($playlistCards, 'plays'),
                'favorites' => $this->rankEngagementCards($playlistCards, 'favorites'),
                'shares' => $this->rankEngagementCards($playlistCards, 'shares'),
            ],
            'artists' => [
                'plays' => $this->rankEngagementCards($artistCards, 'plays'),
                'favorites' => $this->rankEngagementCards($artistCards, 'favorites'),
                'shares' => $this->rankEngagementCards($artistCards, 'shares'),
            ],
        ];
    }

    /** @param Collection<int, string> $songIds */
    private function engagementCard(
        string $name,
        string $subtitle,
        ?string $imageUrl,
        Collection $songIds,
        Collection $playCounts,
        Collection $favoriteCounts,
        Collection $shareCounts,
    ): array {
        return [
            'name' => $name,
            'subtitle' => $subtitle,
            'image_url' => $imageUrl,
            'plays' => $songIds->sum(fn (string $id): int => (int) $playCounts->get($id, 0)),
            'favorites' => $songIds->sum(fn (string $id): int => (int) $favoriteCounts->get($id, 0)),
            'shares' => $songIds->sum(fn (string $id): int => (int) $shareCounts->get($id, 0)),
        ];
    }

    /** @param Collection<int, array<string, mixed>> $cards */
    private function rankEngagementCards(Collection $cards, string $metric): Collection
    {
        return $cards
            ->filter(fn (array $card): bool => (int) ($card[$metric] ?? 0) > 0)
            ->sortByDesc($metric)
            ->take(5)
            ->values();
    }

    private function dayKey(mixed $value): string
    {
        if (! $value instanceof \DateTimeInterface) {
            return '';
        }

        return Carbon::instance($value)
            ->setTimezone(config('app.timezone'))
            ->format('Y-m-d');
    }
}
