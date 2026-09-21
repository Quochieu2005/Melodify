<?php

namespace App\Models;

class SongPlayEvent extends BaseModel
{
    protected $collection = 'song_play_events';

    protected $casts = [
        'started_at' => 'datetime',
        'completed' => 'boolean',
    ];

    public function user() { return $this->belongsTo(User::class, 'user_id'); }
    public function song() { return $this->belongsTo(Song::class, 'song_id'); }
    public function device() { return $this->belongsTo(Device::class, 'device_id'); }
}
