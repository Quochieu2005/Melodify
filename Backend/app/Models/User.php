<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use MongoDB\Laravel\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use Notifiable;

    protected $connection = 'mongodb';

    protected $collection = 'users';

    protected $guarded = [];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'date_of_birth' => 'date',
            'last_login_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function artist() { return $this->hasOne(Artist::class, 'user_id'); }
    public function artistFollowers() { return $this->hasMany(ArtistFollower::class, 'user_id'); }
    public function playlists() { return $this->hasMany(Playlist::class, 'user_id'); }
    public function favorites() { return $this->hasMany(Favorite::class, 'user_id'); }
    public function listeningHistory() { return $this->hasMany(ListeningHistory::class, 'user_id'); }
    public function devices() { return $this->hasMany(Device::class, 'user_id'); }
    public function playEvents() { return $this->hasMany(SongPlayEvent::class, 'user_id'); }
    public function comments() { return $this->hasMany(Comment::class, 'user_id'); }
    public function commentLikes() { return $this->hasMany(CommentLike::class, 'user_id'); }
    public function notifications() { return $this->hasMany(Notification::class, 'user_id'); }
    public function subscriptions() { return $this->hasMany(Subscription::class, 'user_id'); }
    public function payments() { return $this->hasMany(Payment::class, 'user_id'); }
    public function reports() { return $this->hasMany(Report::class, 'reporter_user_id'); }
    public function recommendations() { return $this->hasMany(Recommendation::class, 'user_id'); }
}
