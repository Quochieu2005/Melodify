<?php

namespace App\Models;

use Illuminate\Notifications\Notifiable;
use MongoDB\Laravel\Auth\User as Authenticatable;

class Admin extends Authenticatable
{
    use Notifiable;

    protected $connection = 'mongodb';

    protected $collection = 'admins';

    protected $fillable = ['email', 'name', 'password', 'status', 'username'];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return ['password' => 'hashed'];
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
