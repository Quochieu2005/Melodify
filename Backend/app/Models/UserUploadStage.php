<?php

namespace App\Models;

class UserUploadStage extends BaseModel
{
    protected $collection = 'user_upload_stages';

    protected $casts = [
        'duration_seconds' => 'integer',
        'expires_at' => 'datetime',
    ];
}
