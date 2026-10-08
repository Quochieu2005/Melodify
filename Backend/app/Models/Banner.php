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
    ];

    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
        ];
    }
}
