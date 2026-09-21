<?php

namespace App\Models;

class Album extends BaseModel
{
    protected $collection = 'albums';

    protected $casts = ['release_date' => 'date'];

    public function artist() { return $this->belongsTo(Artist::class, 'artist_id'); }
    public function songs() { return $this->hasMany(Song::class, 'album_id'); }
}
