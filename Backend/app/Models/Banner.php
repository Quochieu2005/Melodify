<?php

namespace App\Models;

class Banner extends BaseModel
{
    protected $collection = 'banners';

    protected $fillable = [
        'title',
        'slug',
        'image_url',
        'image_public_id',
        'link_url',
        'sort_order',
        'status',
        'artist_ids',
        'genre_ids',
        'topic_ids',
        'playlist_ids',
    ];

    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
            'artist_ids' => 'array',
            'genre_ids' => 'array',
            'topic_ids' => 'array',
            'playlist_ids' => 'array',
        ];
    }
}
