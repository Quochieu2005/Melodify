<?php

namespace App\Models;

class Topic extends BaseModel
{
    protected $collection = 'topics';

    protected $casts = [
        'sort_order' => 'integer',
    ];

    public function songs() { return $this->hasMany(TopicSong::class, 'topic_id'); }
}
