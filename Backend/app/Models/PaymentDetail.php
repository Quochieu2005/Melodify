<?php

namespace App\Models;

class PaymentDetail extends BaseModel
{
    protected $collection = 'payment_details';

    protected $casts = [
        'unit_price' => 'decimal:2',
        'subtotal' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
    ];

    public function payment() { return $this->belongsTo(Payment::class, 'payment_id'); }
    public function plan() { return $this->belongsTo(SubscriptionPlan::class, 'plan_id'); }
}
