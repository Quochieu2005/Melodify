<?php

namespace App\Models;

use Database\Factories\VideoFavoriteFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class VideoFavorite extends BaseModel
{
    /** @use HasFactory<VideoFavoriteFactory> */
    use HasFactory;

    protected $collection = 'video_favorites';
}
