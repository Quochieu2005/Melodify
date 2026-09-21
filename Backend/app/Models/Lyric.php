<?php

namespace App\Models;

class Lyric extends BaseModel
{
    protected $collection = 'lyrics';

    protected $casts = ['is_synced' => 'boolean'];

    public function song() { return $this->belongsTo(Song::class, 'song_id'); }
}
