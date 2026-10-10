<?php

namespace App\Models;

class SongVideo extends BaseModel
{
    protected $collection = 'song_videos';

    protected $casts = [
        'duration_seconds' => 'integer',
        'sort_order' => 'integer',
        'artist_ids' => 'array',
        'artists' => 'array',
    ];

    public function song()
    {
        return $this->belongsTo(Song::class, 'song_id');
    }
}
