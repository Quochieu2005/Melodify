<?php

use App\Http\Controllers\Admin\AdminLoginController;
use App\Http\Controllers\Admin\UserManagementController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::prefix('admin')->name('admin.')->group(function (): void {
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
