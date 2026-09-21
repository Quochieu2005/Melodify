<?php

namespace App\Models;

class SubscriptionPlan extends BaseModel
{
    protected $collection = 'subscription_plans';

    protected $casts = [
        'price' => 'decimal:2',
        'offline_download' => 'boolean',
        'ads_enabled' => 'boolean',
        'unlimited_skip' => 'boolean',
    ];

    public function subscriptions() { return $this->hasMany(Subscription::class, 'plan_id'); }
    public function payments() { return $this->hasMany(PaymentDetail::class, 'plan_id'); }
}
