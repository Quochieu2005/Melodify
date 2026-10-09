<?php

namespace App\Http\Controllers\AdminController;

use App\Http\Controllers\Controller;
use App\Models\Artist;
use App\Models\Payment;
use App\Models\Song;
use App\Models\SongPlayEvent;
use App\Models\User;
use Illuminate\View\View;

class DashboardController extends Controller
{
    public function index(): View
    {
        $today = now()->startOfDay();
        $latestSongs = Song::query()
            ->with(['album', 'createdByArtist'])
            ->latest()
            ->limit(6)
            ->get();

        $playTrend = collect(range(6, 0))->map(function (int $daysAgo) use ($today): array {
            $day = $today->copy()->subDays($daysAgo);

            return [
                'label' => $daysAgo === 0 ? 'Hôm nay' : $day->format('d/m'),
                'value' => SongPlayEvent::query()
                    ->where('started_at', '>=', $day)
                    ->where('started_at', '<', $day->copy()->addDay())
                    ->count(),
            ];
        })->values();

        $successfulPaymentStatuses = ['success', 'paid', 'completed'];
        $paymentTrend = collect(range(6, 0))->map(function (int $daysAgo) use ($today, $successfulPaymentStatuses): array {
            $day = $today->copy()->subDays($daysAgo);
            $amount = Payment::query()
                ->whereIn('status', $successfulPaymentStatuses)
                ->where('paid_at', '>=', $day)
                ->where('paid_at', '<', $day->copy()->addDay())
                ->get(['amount'])
                ->sum(fn (Payment $payment): float => (float) ($payment->amount ?? 0));

            return [
                'label' => $daysAgo === 0 ? 'Hôm nay' : $day->format('d/m'),
                'value' => $amount,
            ];
        })->values();

        $userTrend = collect(range(6, 0))->map(function (int $daysAgo) use ($today): array {
            $day = $today->copy()->subDays($daysAgo);

            return [
                'label' => $daysAgo === 0 ? 'Hôm nay' : $day->format('d/m'),
                'value' => User::query()
                    ->where('created_at', '>=', $day)
                    ->where('created_at', '<', $day->copy()->addDay())
                    ->count(),
            ];
        })->values();

        $topSongs = $latestSongs->map(function (Song $song): array {
            return [
                'song' => $song,
                'plays' => SongPlayEvent::query()
                    ->where('song_id', (string) $song->getKey())
                    ->where('started_at', '>=', now()->subDays(30))
                    ->count(),
            ];
        })->sortByDesc('plays')->values();

        return view('Admin.dashboard', [
            'stats' => [
                'songs' => Song::query()->count(),
                'artists' => Artist::query()->count(),
                'users' => User::query()->count(),
                'playsToday' => SongPlayEvent::query()->where('started_at', '>=', $today)->count(),
                'paymentsToday' => $paymentTrend->last()['value'] ?? 0,
            ],
            'latestSongs' => $latestSongs,
            'playTrend' => $playTrend,
            'paymentTrend' => $paymentTrend,
            'userTrend' => $userTrend,
            'topSongs' => $topSongs,
        ]);
    }
}
