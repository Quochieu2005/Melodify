<?php

namespace App\Models;

class Log extends BaseModel
{
    protected $collection = 'logs';

    protected $fillable = [
        'user_id',
        'admin_id',
        'admin_name',
        'admin_email',
        'admin_role',
        'action',
        'description',
        'target_type',
        'target_id',
        'metadata',
        'ip_address',
        'user_agent',
        'method',
        'route_name',
        'status_code',
    ];

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'status_code' => 'integer',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function admin()
    {
        return $this->belongsTo(Admin::class, 'admin_id');
    }
}
