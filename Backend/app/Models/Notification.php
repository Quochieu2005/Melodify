<?php

namespace App\Models;

class Notification extends BaseModel
{
    protected $collection = 'notifications';

    protected $casts = [
        'is_read' => 'boolean',
        'created_at' => 'datetime',
        'read_at' => 'datetime',
    ];

    public function user() { return $this->belongsTo(User::class, 'user_id'); }
}
