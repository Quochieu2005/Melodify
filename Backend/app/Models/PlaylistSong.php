<?php

namespace App\Models;

class PlaylistSong extends BaseModel
{
    protected $collection = 'playlist_songs';

    public function playlist() { return $this->belongsTo(Playlist::class, 'playlist_id'); }
    public function song() { return $this->belongsTo(Song::class, 'song_id'); }
    public function addedByUser() { return $this->belongsTo(User::class, 'added_by_user_id'); }
    public function addedByAdmin() { return $this->belongsTo(Admin::class, 'added_by_admin_id'); }
}
