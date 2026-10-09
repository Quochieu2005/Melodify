<?php

namespace App\Http\Controllers\AdminController;

use App\Http\Controllers\Controller;
use App\Models\Artist;
use App\Models\Payment;
use App\Models\Song;
use App\Models\SongPlayEvent;
use App\Models\User;
use Carbon\Carbon;
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
        ]);
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
