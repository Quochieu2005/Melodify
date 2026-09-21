<?php

namespace App\Models;

class ListeningHistory extends BaseModel
{
    protected $collection = 'listening_history';

    protected $casts = [
        'started_at' => 'datetime',
        'last_played_at' => 'datetime',
        'completed' => 'boolean',
    ];

    public function user() { return $this->belongsTo(User::class, 'user_id'); }
    public function song() { return $this->belongsTo(Song::class, 'song_id'); }
}
