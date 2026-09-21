<?php

namespace App\Models;

class Payment extends BaseModel
{
    protected $collection = 'payments';

    protected $casts = [
        'amount' => 'decimal:2',
        'paid_at' => 'datetime',
    ];

    public function user() { return $this->belongsTo(User::class, 'user_id'); }
    public function subscription() { return $this->belongsTo(Subscription::class, 'subscription_id'); }
    public function transactions() { return $this->hasMany(Transaction::class, 'payment_id'); }
    public function details() { return $this->hasMany(PaymentDetail::class, 'payment_id'); }
}
