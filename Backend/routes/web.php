<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AdminController\DashboardController;
use App\Http\Controllers\AdminController\SongController;
use App\Http\Controllers\AdminController\AlbumController;
use App\Http\Controllers\AdminController\GenreController;
use App\Http\Controllers\AdminController\PlaylistController;
use App\Http\Controllers\AdminController\ArtistController;
use App\Http\Controllers\AdminController\UserController;
use App\Http\Controllers\AdminController\SubscriptionController;
use App\Http\Controllers\AdminController\PaymentController;
use App\Http\Controllers\AdminController\CommentController;
use App\Http\Controllers\AdminController\ReportController;
use App\Http\Controllers\AdminController\SettingController;

Route::get('/', function () {
    return redirect('/admin/dashboard');
});

Route::prefix('admin')->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('admin.dashboard');

    Route::get('/songs', [SongController::class, 'index'])->name('admin.songs.index');
    Route::get('/albums', [AlbumController::class, 'index'])->name('admin.albums.index');
    Route::get('/genres', [GenreController::class, 'index'])->name('admin.genres.index');
    Route::get('/playlists', [PlaylistController::class, 'index'])->name('admin.playlists.index');

    Route::get('/artists', [ArtistController::class, 'index'])->name('admin.artists.index');
    Route::get('/users', [UserController::class, 'index'])->name('admin.users.index');

    Route::get('/subscriptions', [SubscriptionController::class, 'index'])->name('admin.subscriptions.index');
    Route::get('/payments', [PaymentController::class, 'index'])->name('admin.payments.index');

    Route::get('/comments', [CommentController::class, 'index'])->name('admin.comments.index');
    Route::get('/reports', [ReportController::class, 'index'])->name('admin.reports.index');

    Route::get('/settings', [SettingController::class, 'index'])->name('admin.settings.index');
});
