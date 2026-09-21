<?php

namespace App\Models;

class ArtistFollower extends BaseModel
{
    protected $collection = 'artist_followers';

    public function user() { return $this->belongsTo(User::class, 'user_id'); }
    public function artist() { return $this->belongsTo(Artist::class, 'artist_id'); }
}
