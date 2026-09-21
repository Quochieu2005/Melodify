<?php

namespace App\Models;

class Genre extends BaseModel
{
    protected $collection = 'genres';

    public function songs() { return $this->hasMany(SongGenre::class, 'genre_id'); }
}
