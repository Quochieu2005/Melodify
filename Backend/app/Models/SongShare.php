<?php

namespace App\Models;

class SongShare extends BaseModel
{
    protected $collection = 'song_shares';

    public function song() { return $this->belongsTo(Song::class, 'song_id'); }
}
