<?php

namespace App\Models;

class Subscription extends BaseModel
{
    protected $collection = 'subscriptions';

    protected $casts = [
        'start_date' => 'datetime',
        'end_date' => 'datetime',
        'auto_renew' => 'boolean',
        'cancelled_at' => 'datetime',
    ];

    public function user() { return $this->belongsTo(User::class, 'user_id'); }
    public function plan() { return $this->belongsTo(SubscriptionPlan::class, 'plan_id'); }
    public function payments() { return $this->hasMany(Payment::class, 'subscription_id'); }
}
