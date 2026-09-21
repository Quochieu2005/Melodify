<?php

namespace App\Models;

class Admin extends BaseModel
{
    protected $collection = 'admins';

    public function songs() { return $this->hasMany(Song::class, 'created_by_admin_id'); }
    public function playlists() { return $this->hasMany(Playlist::class, 'created_by_admin_id'); }
    public function logs() { return $this->hasMany(Log::class, 'admin_id'); }
    public function reports() { return $this->hasMany(Report::class, 'reviewed_by_admin_id'); }
}
