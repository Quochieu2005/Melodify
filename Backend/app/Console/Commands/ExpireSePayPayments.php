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
            ->whereNotNull('gateway_checkout_at')
            ->where('gateway_checkout_at', '<=', now()->subMinutes(10))
            ->get();

        foreach ($payments as $payment) {
            try {
                if (! Cache::add('vip:sepay:expire:'.(string) $payment->getKey(), true, 60)) {
                    continue;
                }

                $order = $gateways->querySePayOrder($payment);
                if ($paid = $gateways->approvedSePayTransaction($payment, $order)) {
                    $settlements->markPaid($payment, $paid['transaction_id'], $order);

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
