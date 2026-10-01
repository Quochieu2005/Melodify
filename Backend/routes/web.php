<?php

use App\Http\Controllers\Admin\AdminLoginController;
use App\Http\Controllers\Admin\UserManagementController;
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

Route::prefix('admin')->name('admin.')->group(function (): void {
    Route::get('/preview/users', [UserManagementController::class, 'preview'])->name('users.preview');

    Route::middleware('guest:admin')->group(function (): void {
        Route::get('/login', [AdminLoginController::class, 'create'])->name('login');
        Route::post('/login', [AdminLoginController::class, 'store'])
            ->middleware('throttle:admin-login')
            ->name('login.store');
    });

    Route::middleware('auth:admin')->group(function (): void {
        Route::get('/users', [UserManagementController::class, 'index'])->name('users.index');
        Route::post('/logout', [AdminLoginController::class, 'destroy'])->name('logout');
    });
});
