<?php

namespace App\Models;

class SubscriptionPlan extends BaseModel
{
    protected $collection = 'subscription_plans';

    protected $attributes = [
        'billing_cycle' => 'monthly',
        'billing_months' => 1,
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'billing_months' => 'integer',
        'offline_download' => 'boolean',
        'ads_enabled' => 'boolean',
        'unlimited_skip' => 'boolean',
    ];

    public function subscriptions() { return $this->hasMany(Subscription::class, 'plan_id'); }
    public function payments() { return $this->hasMany(PaymentDetail::class, 'plan_id'); }
}
