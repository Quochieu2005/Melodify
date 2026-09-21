<?php

namespace App\Models;

class Artist extends BaseModel
{
    protected $collection = 'artists';

    protected $casts = ['verified' => 'boolean'];

    public function user() { return $this->belongsTo(User::class, 'user_id'); }
    public function followers() { return $this->hasMany(ArtistFollower::class, 'artist_id'); }
    public function albums() { return $this->hasMany(Album::class, 'artist_id'); }
    public function songs() { return $this->hasMany(SongArtist::class, 'artist_id'); }
    public function createdSongs() { return $this->hasMany(Song::class, 'created_by_artist_id'); }
}
