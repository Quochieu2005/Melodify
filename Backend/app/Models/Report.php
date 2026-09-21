<?php

namespace App\Models;

class Report extends BaseModel
{
    protected $collection = 'reports';

    protected $casts = [
        'reviewed_at' => 'datetime',
    ];

    public function reporter() { return $this->belongsTo(User::class, 'reporter_user_id'); }
    public function reviewedBy() { return $this->belongsTo(Admin::class, 'reviewed_by_admin_id'); }
}
