<?php

namespace App\Models;

/**
 * One thing an account (or an anonymous visitor) opened recently: a song, playlist, album, artist or video.
 * Only the reference is stored; the title, image and the rest are read from the catalog when the list is asked for,
 * so the history can never show a name or a link the catalog does not have.
 */
class RecentItem extends BaseModel
{
    protected $collection = 'recent_items';

    protected $casts = [
        'played_at' => 'datetime',
    ];
}
