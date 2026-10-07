<?php

use App\Http\Controllers\AdminController\AdminManagementController;
use App\Http\Controllers\AdminController\AlbumController;
use App\Http\Controllers\AdminController\ArtistController;
use App\Http\Controllers\AdminController\AuthController;
use App\Http\Controllers\AdminController\BannerController;
use App\Http\Controllers\AdminController\CommentController;
use App\Http\Controllers\AdminController\DashboardController;
use App\Http\Controllers\AdminController\GenreController;
use App\Http\Controllers\AdminController\LogController;
use App\Http\Controllers\AdminController\PasswordResetController;
use App\Http\Controllers\AdminController\PaymentController;
use App\Http\Controllers\AdminController\PlaylistController;
use App\Http\Controllers\AdminController\ProfileController;
use App\Http\Controllers\AdminController\ReportController;
use App\Http\Controllers\AdminController\SettingController;
use App\Http\Controllers\AdminController\SongController;
use App\Http\Controllers\AdminController\SubscriptionController;
use App\Http\Controllers\AdminController\TopicController;
use App\Http\Controllers\AdminController\UserController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return redirect('/admin/dashboard');
});

Route::prefix('admin')->name('admin.')->group(function () {
    Route::middleware('guest:admin')->group(function () {
        Route::get('/login', [AuthController::class, 'create'])->name('login');
        Route::post('/login', [AuthController::class, 'store'])->middleware('throttle:5,1')->name('login.store');
        Route::get('/forgot-password', [PasswordResetController::class, 'request'])->name('password.request');
        Route::post('/forgot-password', [PasswordResetController::class, 'sendOtp'])->middleware('throttle:5,1')->name('password.email');
        Route::get('/forgot-password/verify', [PasswordResetController::class, 'otpForm'])->name('password.otp.form');
        Route::post('/forgot-password/verify', [PasswordResetController::class, 'verifyOtp'])->middleware('throttle:8,1')->name('password.otp.verify');
        Route::get('/forgot-password/reset', [PasswordResetController::class, 'resetForm'])->name('password.reset.form');
        Route::post('/forgot-password/reset', [PasswordResetController::class, 'resetPassword'])->middleware('throttle:5,1')->name('password.reset');
    });

    Route::middleware(['auth:admin', 'admin.idle', 'admin.audit'])->group(function () {
        Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
        Route::get('/logs', [LogController::class, 'index'])->name('logs.index');
        Route::post('/logout', [AuthController::class, 'destroy'])->name('logout');
        Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
        Route::get('/account-settings', [ProfileController::class, 'settings'])->name('profile.settings');
        Route::put('/profile', [ProfileController::class, 'update'])->name('profile.update');
        Route::delete('/profile/avatar', [ProfileController::class, 'removeAvatar'])->name('profile.avatar.destroy');
        Route::put('/profile/password', [ProfileController::class, 'password'])->name('profile.password');
        Route::put('/account-settings/notifications', [ProfileController::class, 'notifications'])->name('profile.notifications');
        Route::put('/account-settings/appearance', [ProfileController::class, 'appearance'])->name('profile.appearance');
        Route::get('/admins', [AdminManagementController::class, 'index'])->name('admins.index');
          Route::resource('admins', AdminManagementController::class)->only(['edit', 'update']);
        Route::patch('/admins/{admin}/status', [AdminManagementController::class, 'toggleStatus'])->name('admins.status');

        Route::middleware('admin.permission:banners.manage')->group(function () {
            Route::delete('/banners/bulk', [BannerController::class, 'destroyBulk'])->name('banners.bulk-destroy');
            Route::delete('/banners/all', [BannerController::class, 'destroyAll'])->name('banners.destroy-all');
            Route::resource('banners', BannerController::class)->except('show');
        });

        Route::middleware('admin.permission:content.manage')->group(function () {
            Route::resource('songs', SongController::class)->except('show');
            Route::resource('albums', AlbumController::class)->except('show');
            Route::patch('/topics/{topic}/status', [TopicController::class, 'toggleStatus'])->name('topics.status');
            Route::resource('topics', TopicController::class)->except('show');
            Route::patch('/genres/{genre}/status', [GenreController::class, 'toggleStatus'])->name('genres.status');
            Route::resource('genres', GenreController::class)->except('show');
            Route::patch('/playlists/{playlist}/status', [PlaylistController::class, 'toggleStatus'])->name('playlists.status');
            Route::resource('playlists', PlaylistController::class)->except('show');
            Route::resource('artists', ArtistController::class)->except('show');
        });

        Route::middleware('admin.permission:users.manage')->group(function () {
              Route::resource('users', UserController::class)->except(['show', 'create', 'store']);
        });

        Route::middleware('admin.permission:billing.manage')->group(function () {
            Route::resource('subscriptions', SubscriptionController::class)->except('show');
            Route::get('/payments', [PaymentController::class, 'index'])->name('payments.index');
        });

        Route::middleware('admin.permission:moderation.manage')->group(function () {
            Route::get('/comments', [CommentController::class, 'index'])->name('comments.index');
            Route::patch('/comments/{comment}', [CommentController::class, 'update'])->name('comments.update');
            Route::delete('/comments/{comment}', [CommentController::class, 'destroy'])->name('comments.destroy');
            Route::get('/reports', [ReportController::class, 'index'])->name('reports.index');
            Route::patch('/reports/{report}', [ReportController::class, 'update'])->name('reports.update');
        });
    });

    Route::middleware(['auth:admin', 'admin.idle', 'admin.audit', 'admin.super'])->group(function () {
        Route::post('/admins/credentials/bulk', [AdminManagementController::class, 'sendCredentialsBulk'])
            ->middleware('throttle:10,1')
            ->name('admins.credentials.bulk');
        Route::post('/admins/{admin}/credentials', [AdminManagementController::class, 'sendCredentials'])->name('admins.credentials');
        Route::resource('admins', AdminManagementController::class)->only(['create', 'store', 'destroy']);
        Route::get('/settings', [SettingController::class, 'index'])->name('settings.index');
    });
});
