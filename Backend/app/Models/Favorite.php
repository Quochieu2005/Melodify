<?php

namespace App\Models;

class Favorite extends BaseModel
{
    protected $collection = 'favorites';

    public function user() { return $this->belongsTo(User::class, 'user_id'); }
    public function song() { return $this->belongsTo(Song::class, 'song_id'); }
}
