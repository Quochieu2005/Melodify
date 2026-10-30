<?php

namespace App\Services\Payments;

use App\Models\Payment;
use App\Models\Subscription;
use App\Models\SubscriptionPlan;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Support\Carbon;
use RuntimeException;

class VipPaymentSettlementService
{
    public function markPaid(Payment $payment, string $transactionCode, array $callback): bool
    {
        if (in_array((string) $payment->status, ['success', 'paid', 'completed'], true)) {
            return true;
        }

        // Claim the pending payment atomically so repeated IPNs cannot grant VIP twice.
        $claimed = Payment::query()
            ->where('_id', (string) $payment->getKey())
            ->where('status', 'pending')
            ->update(['status' => 'processing']);

        if ($claimed === 0) {
            $payment->refresh();

            return in_array((string) $payment->status, ['success', 'paid', 'completed'], true);
        }

        try {
            $payment->refresh();
            $detail = $payment->details()->first();
            $plan = $detail?->plan ?? SubscriptionPlan::query()->find((string) ($detail?->plan_id ?? ''));
            $user = User::query()->find((string) $payment->user_id);
            if (! $plan || ! $user) {
                throw new RuntimeException('Không tìm thấy gói VIP hoặc tài khoản của giao dịch.');
            }

            $now = now();
            $existing = Subscription::query()->where('payment_id', (string) $payment->getKey())->first();
            if (! $existing) {
                $latestActive = Subscription::query()
                    ->where('user_id', (string) $user->getKey())
                    ->where('status', 'active')
                    ->where('end_date', '>', $now)
                    ->orderByDesc('end_date')
                    ->first();
                $start = $latestActive?->end_date && $latestActive->end_date->greaterThan($now)
                    ? $latestActive->end_date->copy()
                    : $now->copy();
                $months = max(1, (int) ($plan->billing_months ?: 1));
                $existing = Subscription::query()->create([
                    'user_id' => (string) $user->getKey(),
                    'plan_id' => (string) $plan->getKey(),
                    'payment_id' => (string) $payment->getKey(),
                    'start_date' => $start,
                    'end_date' => $start->copy()->addMonths($months),
                    'status' => 'active',
                    'auto_renew' => false,
                    'amount' => (float) $payment->amount,
                ]);
            }

            $expiresAt = $existing->end_date instanceof Carbon
                ? $existing->end_date
                : Carbon::parse($existing->end_date);
            $user->forceFill([
                'is_premium' => 1,
                'vip_expires_at' => $expiresAt,
            ])->save();

            $payment->forceFill([
                'subscription_id' => (string) $existing->getKey(),
                'status' => 'success',
                'paid_at' => $now,
                'gateway_transaction_id' => $transactionCode,
            ])->save();

            $existingTransaction = Transaction::query()
                ->where('payment_id', (string) $payment->getKey())
                ->first();
            if (! $existingTransaction) {
                Transaction::query()->create([
                    'payment_id' => (string) $payment->getKey(),
                    'transaction_code' => $transactionCode !== '' ? $transactionCode : (string) $payment->payment_code,
                    'gateway' => (string) $payment->method,
                    'amount' => (float) $payment->amount,
                    'currency' => (string) ($payment->currency ?? 'VND'),
                    'status' => 'success',
                    'transaction_at' => $now,
                ]);
            }

            return true;
        } catch (\Throwable $exception) {
            Payment::query()->where('_id', (string) $payment->getKey())
                ->where('status', 'processing')->update(['status' => 'pending']);

            throw $exception;
        }
    }

    public function markFailed(Payment $payment, string $status, string $transactionCode = ''): void
    {
        if (! in_array($status, ['failed', 'cancelled'], true)) {
            return;
        }

        Payment::query()->where('_id', (string) $payment->getKey())
            ->where('status', 'pending')
            ->update(['status' => $status]);

        if ($transactionCode !== '') {
            $alreadyRecorded = Transaction::query()
                ->where('payment_id', (string) $payment->getKey())
                ->where('transaction_code', $transactionCode)
                ->exists();
            if (! $alreadyRecorded) {
                Transaction::query()->create([
                    'payment_id' => (string) $payment->getKey(),
                    'transaction_code' => $transactionCode,
                    'gateway' => (string) $payment->method,
                    'amount' => (float) $payment->amount,
                    'currency' => (string) ($payment->currency ?? 'VND'),
                    'status' => $status,
                    'transaction_at' => now(),
                ]);
            }
        }
    }
}
