<?php

namespace App\Models;

class Comment extends BaseModel
{
    protected $collection = 'comments';

    public function user() { return $this->belongsTo(User::class, 'user_id'); }
    public function song() { return $this->belongsTo(Song::class, 'song_id'); }
    public function parent() { return $this->belongsTo(Comment::class, 'parent_id'); }
    public function replies() { return $this->hasMany(Comment::class, 'parent_id'); }
    public function likes() { return $this->hasMany(CommentLike::class, 'comment_id'); }
}
