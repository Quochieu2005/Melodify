<?php

namespace App\Http\Controllers\AdminController;

use App\Http\Controllers\Controller;
use App\Models\Artist;
use App\Models\Song;
use App\Models\SongPlayEvent;
use App\Models\User;
use Illuminate\View\View;

class DashboardController extends Controller
{
    public function index(): View
    {
        return view('Admin.dashboard', [
            'stats' => [
                'songs' => Song::query()->count(),
                'artists' => Artist::query()->count(),
                'users' => User::query()->count(),
                'playsToday' => SongPlayEvent::query()->where('started_at', '>=', now()->startOfDay())->count(),
            ],
            'latestSongs' => Song::query()->with(['album', 'createdByArtist'])->latest()->limit(5)->get(),
        ]);
    }
}
