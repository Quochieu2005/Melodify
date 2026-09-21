<?php

namespace App\Models;

class Transaction extends BaseModel
{
    protected $collection = 'transactions';

    protected $casts = [
        'amount' => 'decimal:2',
        'transaction_at' => 'datetime',
    ];

    public function payment() { return $this->belongsTo(Payment::class, 'payment_id'); }
}
