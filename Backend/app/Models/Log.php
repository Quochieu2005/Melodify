<?php

namespace App\Models;

class Log extends BaseModel
{
    protected $collection = 'logs';

    public function user() { return $this->belongsTo(User::class, 'user_id'); }
    public function admin() { return $this->belongsTo(Admin::class, 'admin_id'); }
}
