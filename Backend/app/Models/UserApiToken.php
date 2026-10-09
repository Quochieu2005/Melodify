<?php

namespace App\Models;

class UserApiToken extends BaseModel
{
    protected $collection = 'user_api_tokens';

    protected $hidden = ['token_hash'];

    protected $casts = [
        'last_used_at' => 'datetime',
        'expires_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
