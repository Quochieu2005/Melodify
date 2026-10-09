<?php

namespace App\Models;

class PhoneLoginChallenge extends BaseModel
{
    protected $collection = 'phone_login_challenges';

    protected $hidden = ['code_hash'];

    protected $casts = [
        'expires_at' => 'datetime',
        'verified_at' => 'datetime',
    ];
}
