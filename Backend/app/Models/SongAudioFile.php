<?php

namespace App\Models;

class SongAudioFile extends BaseModel
{
    protected $collection = 'song_audio_files';

    protected $casts = ['premium_only' => 'boolean'];

    public function song() { return $this->belongsTo(Song::class, 'song_id'); }
}
