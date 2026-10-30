<?php

namespace App\Models;

class Genre extends BaseModel
{
    protected $collection = 'genres';

    protected $casts = [
        'sort_order' => 'integer',
    ];

    public function songs() { return $this->hasMany(SongGenre::class, 'genre_id'); }
}
