<?php

namespace App\Models;

class CommentLike extends BaseModel
{
    protected $collection = 'comment_likes';

    public function user() { return $this->belongsTo(User::class, 'user_id'); }
    public function comment() { return $this->belongsTo(Comment::class, 'comment_id'); }
}
