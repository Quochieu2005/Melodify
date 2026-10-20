<?php

namespace App\Models;

class ArtistViewEvent extends BaseModel
{
    protected $collection = 'artist_view_events';

    protected $casts = ['viewed_at' => 'datetime'];
}
