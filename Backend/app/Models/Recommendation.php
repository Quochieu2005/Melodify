<?php

namespace App\Models;

class Recommendation extends BaseModel
{
    protected $collection = 'recommendations';

    protected $casts = [
        'score' => 'decimal:4',
        'generated_at' => 'datetime',
        'expires_at' => 'datetime',
    ];

    public function user() { return $this->belongsTo(User::class, 'user_id'); }
    public function song() { return $this->belongsTo(Song::class, 'song_id'); }
}
