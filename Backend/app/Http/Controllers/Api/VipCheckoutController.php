<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\PaymentDetail;
use App\Models\SubscriptionPlan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class VipCheckoutController extends Controller
{
    private const PAYMENT_METHODS = [
        'card', 'shopeepay', 'atm', 'momo', 'zalopay', 'vnpay', 'viettelpay',
    ];

    public function index(Request $request): JsonResponse
    {
        $payments = Payment::query()
            ->where('user_id', (string) $request->user()->getKey())
            ->with(['details.plan', 'transactions'])
            ->latest()
            ->paginate(10);

        return response()->json([
            'user' => [
                'id' => (string) $request->user()->getKey(),
                'name' => (string) ($request->user()->name ?? ''),
                'username' => (string) ($request->user()->username ?? ''),
                'email' => (string) ($request->user()->email ?? ''),
                'phone' => (string) ($request->user()->phone ?? ''),
            ],
            'data' => $payments->getCollection()->map(function (Payment $payment): array {
                $detail = $payment->details->first();
                $transaction = $payment->transactions->sortByDesc('transaction_at')->first();

                return [
                    'id' => (string) $payment->getKey(),
                    'payment_code' => (string) ($payment->payment_code ?? ''),
                    'created_at' => $payment->created_at?->toISOString(),
                    'amount' => (float) ($payment->amount ?? 0),
                    'currency' => (string) ($payment->currency ?? 'VND'),
                    'method' => (string) ($payment->method ?? ''),
                    'status' => (string) ($payment->status ?? 'pending'),
                    'plan_name' => (string) ($detail?->item_name ?? $detail?->plan?->name ?? $payment->description ?? 'Gói VIP'),
                    'transaction_code' => (string) ($transaction?->transaction_code ?? ''),
                    'gateway' => (string) ($transaction?->gateway ?? ''),
                ];
            })->values(),
            'meta' => [
                'current_page' => $payments->currentPage(),
                'last_page' => $payments->lastPage(),
                'total' => $payments->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'plan_id' => ['required', 'string', 'max:120'],
            'method' => ['required', 'string', Rule::in(self::PAYMENT_METHODS)],
        ]);

        $plan = SubscriptionPlan::query()->find($validated['plan_id']);

        if (! $plan || ($plan->status ?? 'inactive') !== 'active') {
            return response()->json(['message' => 'Gói VIP không tồn tại hoặc đã tạm dừng.'], 404);
        }

        do {
            $paymentCode = 'VIP'.Str::upper(Str::random(10));
        } while (Payment::query()->where('payment_code', $paymentCode)->exists());

        $amount = (float) $plan->price;
        $payment = Payment::query()->create([
            'user_id' => (string) $request->user()->getKey(),
            'payment_code' => $paymentCode,
            'amount' => $amount,
            'currency' => 'VND',
            'method' => $validated['method'],
            'status' => 'pending',
            'description' => 'Đăng ký gói VIP: '.$plan->name,
        ]);

        PaymentDetail::query()->create([
            'payment_id' => (string) $payment->getKey(),
            'plan_id' => (string) $plan->getKey(),
            'item_name' => $plan->name,
            'unit_price' => $amount,
            'quantity' => 1,
            'subtotal' => $amount,
            'discount_amount' => 0,
            'tax_amount' => 0,
            'total_amount' => $amount,
        ]);

        return response()->json([
            'message' => 'Đã tạo yêu cầu thanh toán. Giao dịch đang chờ xác nhận.',
            'data' => [
                'payment_id' => (string) $payment->getKey(),
                'payment_code' => $paymentCode,
                'amount' => $amount,
                'currency' => 'VND',
                'method' => $validated['method'],
                'status' => 'pending',
                'plan' => [
                    'id' => (string) $plan->getKey(),
                    'name' => (string) $plan->name,
                ],
                'requires_gateway_confirmation' => true,
            ],
        ], 201);
    }
}
