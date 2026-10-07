<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MediaAsset extends BaseModel
{
    protected $collection = 'media_assets';

    protected $casts = [
        'width' => 'integer',
        'height' => 'integer',
    ];

    public function createdByAdmin(): BelongsTo
    {
        return $this->belongsTo(Admin::class, 'created_by_admin_id');
    }
}
