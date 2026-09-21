<?php

namespace App\Models;

class SongGenre extends BaseModel
{
    protected $collection = 'song_genres';

    public function song() { return $this->belongsTo(Song::class, 'song_id'); }
    public function genre() { return $this->belongsTo(Genre::class, 'genre_id'); }
}
