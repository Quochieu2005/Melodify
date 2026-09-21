<?php

namespace App\Models;

class Playlist extends BaseModel
{
    protected $collection = 'playlists';

    protected $casts = ['is_system' => 'boolean'];

    public function user() { return $this->belongsTo(User::class, 'user_id'); }
    public function songs() { return $this->hasMany(PlaylistSong::class, 'playlist_id'); }
    public function createdByAdmin() { return $this->belongsTo(Admin::class, 'created_by_admin_id'); }
}
