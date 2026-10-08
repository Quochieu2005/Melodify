<?php

namespace App\Models;

class Topic extends BaseModel
{
    protected $collection = 'topics';

    protected $casts = [
        'sort_order' => 'integer',
    ];
}
