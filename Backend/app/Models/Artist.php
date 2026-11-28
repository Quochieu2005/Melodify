<?php

namespace App\Models;

use App\Support\ArtistKey;

class Artist extends BaseModel
{
    protected $collection = 'artists';

    protected $casts = ['verified' => 'boolean'];

    protected static function booted(): void
    {
        // name_key lets imports find an artist by name with one indexed query instead of loading every artist.
        static::saving(function (Artist $artist): void {
            if ($artist->isDirty('name') || blank($artist->name_key)) {
                $artist->name_key = ArtistKey::make((string) $artist->name);
            }
        });
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function followers()
    {
        return $this->hasMany(ArtistFollower::class, 'artist_id');
    }

    public function albums()
    {
        return $this->hasMany(Album::class, 'artist_id');
    }

    public function songs()
    {
        return $this->hasMany(SongArtist::class, 'artist_id');
    }

    public function createdSongs()
    {
        return $this->hasMany(Song::class, 'created_by_artist_id');
    }
}
