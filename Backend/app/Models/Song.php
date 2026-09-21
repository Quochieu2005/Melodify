<?php

namespace App\Models;

class Song extends BaseModel
{
    protected $collection = 'songs';

    protected $casts = [
        'release_date' => 'date',
        'explicit' => 'boolean',
    ];

    public function album() { return $this->belongsTo(Album::class, 'album_id'); }
    public function artistCredits() { return $this->hasMany(SongArtist::class, 'song_id'); }
    public function genreLinks() { return $this->hasMany(SongGenre::class, 'song_id'); }
    public function audioFiles() { return $this->hasMany(SongAudioFile::class, 'song_id'); }
    public function lyrics() { return $this->hasMany(Lyric::class, 'song_id'); }
    public function playlistSongs() { return $this->hasMany(PlaylistSong::class, 'song_id'); }
    public function favorites() { return $this->hasMany(Favorite::class, 'song_id'); }
    public function listeningHistory() { return $this->hasMany(ListeningHistory::class, 'song_id'); }
    public function playEvents() { return $this->hasMany(SongPlayEvent::class, 'song_id'); }
    public function comments() { return $this->hasMany(Comment::class, 'song_id'); }
    public function recommendations() { return $this->hasMany(Recommendation::class, 'song_id'); }
    public function createdByArtist() { return $this->belongsTo(Artist::class, 'created_by_artist_id'); }
    public function createdByAdmin() { return $this->belongsTo(Admin::class, 'created_by_admin_id'); }
}
