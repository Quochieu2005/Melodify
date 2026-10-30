<?php

namespace App\Models;

class TopicSong extends BaseModel
{
    protected $collection = 'topic_songs';

    protected $casts = ['position' => 'integer'];

    public function topic() { return $this->belongsTo(Topic::class, 'topic_id'); }
    public function song() { return $this->belongsTo(Song::class, 'song_id'); }
    public function addedByAdmin() { return $this->belongsTo(Admin::class, 'added_by_admin_id'); }
}
