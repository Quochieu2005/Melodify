<?php

namespace App\Models;

class SongArtist extends BaseModel
{
    protected $collection = 'song_artists';

    public function song() { return $this->belongsTo(Song::class, 'song_id'); }
    public function artist() { return $this->belongsTo(Artist::class, 'artist_id'); }
}
