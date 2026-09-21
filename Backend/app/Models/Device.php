<?php

namespace App\Models;

class Device extends BaseModel
{
    protected $collection = 'devices';

    protected $casts = ['last_active_at' => 'datetime'];

    public function user() { return $this->belongsTo(User::class, 'user_id'); }
    public function playEvents() { return $this->hasMany(SongPlayEvent::class, 'device_id'); }
}
