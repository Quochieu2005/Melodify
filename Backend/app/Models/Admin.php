<?php

namespace App\Models;

use Illuminate\Auth\Passwords\CanResetPassword;
use Illuminate\Contracts\Auth\CanResetPassword as CanResetPasswordContract;
use Illuminate\Notifications\Notifiable;
use MongoDB\Laravel\Auth\User as Authenticatable;

class Admin extends Authenticatable implements CanResetPasswordContract
{
    use CanResetPassword, Notifiable;

    protected $connection = 'mongodb';

    protected $collection = 'admins';

    protected $fillable = ['name', 'email', 'slug', 'password', 'avatar', 'role', 'status', 'is_active'];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'is_active' => 'boolean',
            'email_verified_at' => 'datetime',
        ];
    }

    public function songs()
    {
        return $this->hasMany(Song::class, 'created_by_admin_id');
    }

    public function playlists()
    {
        return $this->hasMany(Playlist::class, 'created_by_admin_id');
    }

    public function logs()
    {
        return $this->hasMany(Log::class, 'admin_id');
    }

    public function reports()
    {
        return $this->hasMany(Report::class, 'reviewed_by_admin_id');
    }
}
