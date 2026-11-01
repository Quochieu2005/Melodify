<?php

namespace App\Console\Commands;

use App\Models\Payment;
use App\Services\Payments\VipPaymentGatewayService;
use App\Services\Payments\VipPaymentSettlementService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Throwable;

class ExpireSePayPayments extends Command
{
    protected $signature = 'payments:expire-sepay';

    protected $description = 'Cancel unpaid SePay VIP orders after 10 minutes';

    public function handle(VipPaymentGatewayService $gateways, VipPaymentSettlementService $settlements): int
    {
        $payments = Payment::query()
            ->where('method', 'sepay')
            ->where('status', 'pending')
            ->where('created_at', '<=', now()->subMinutes(10))
            ->get();

        foreach ($payments as $payment) {
            try {
                if (! Cache::add('vip:sepay:expire:'.(string) $payment->getKey(), true, 60)) {
                    continue;
                }

                $order = $gateways->querySePayOrder($payment);
                $transactions = $order['transactions'] ?? [];
                $approved = collect(is_array($transactions) ? $transactions : [])->first(fn ($transaction) => is_array($transaction)
                    && ($transaction['transaction_status'] ?? '') === 'APPROVED'
                    && strtoupper((string) ($transaction['transaction_currency'] ?? '')) === 'VND'
                    && (int) round((float) ($transaction['transaction_amount'] ?? -1)) === (int) round((float) $payment->amount)
                    && filled($transaction['id'] ?? $transaction['transaction_id'] ?? null));

                if (is_array($order)
                    && hash_equals((string) $payment->payment_code, (string) ($order['order_invoice_number'] ?? ''))
                    && ($order['order_status'] ?? '') === 'CAPTURED'
                    && strtoupper((string) ($order['order_currency'] ?? '')) === 'VND'
                    && (int) round((float) ($order['order_amount'] ?? -1)) === (int) round((float) $payment->amount)
                    && is_array($approved)) {
                    $settlements->markPaid($payment, (string) ($approved['transaction_id'] ?? $approved['id']), $order);
                    continue;
                }

                if ($gateways->cancelSePayOrder($payment)) {
                    $settlements->markFailed($payment, 'failed');
                }
            } catch (Throwable $exception) {
                report($exception);
            }
        }

        return self::SUCCESS;
    }
}
