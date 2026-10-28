<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\PaymentDetail;
use App\Models\SubscriptionPlan;
use App\Services\Payments\VipPaymentGatewayService;
use App\Services\Payments\VipPaymentSettlementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class VipCheckoutController extends Controller
{
    public function methods(VipPaymentGatewayService $gateways): JsonResponse
    {
        return response()->json(['data' => $gateways->methods()]);
    }

    public function index(Request $request): JsonResponse
    {
        $payments = Payment::query()
            ->where('user_id', (string) $request->user()->getKey())
            ->with(['details.plan', 'transactions', 'subscription'])
            ->latest()
            ->paginate(10);

        return response()->json([
            'user' => [
                'id' => (string) $request->user()->getKey(),
                'name' => (string) ($request->user()->name ?? ''),
                'username' => (string) ($request->user()->username ?? ''),
                'email' => (string) ($request->user()->email ?? ''),
                'phone' => (string) ($request->user()->phone ?? ''),
                'is_premium' => $request->user()->hasPremiumAccess(),
                'vip_expires_at' => $request->user()->vip_expires_at?->toISOString(),
            ],
            'data' => $payments->getCollection()->map(function (Payment $payment): array {
                $detail = $payment->details->first();
                $transaction = $payment->transactions->sortByDesc('transaction_at')->first();

                return [
                    'id' => (string) $payment->getKey(),
                    'payment_code' => (string) ($payment->payment_code ?? ''),
                    'created_at' => $payment->created_at?->toISOString(),
                    'paid_at' => $payment->paid_at?->toISOString(),
                    'amount' => (float) ($payment->amount ?? 0),
                    'currency' => (string) ($payment->currency ?? 'VND'),
                    'method' => (string) ($payment->method ?? ''),
                    'status' => (string) ($payment->status ?? 'pending'),
                    'plan_name' => (string) ($detail?->item_name ?? $detail?->plan?->name ?? $payment->description ?? 'Gói VIP'),
                    'transaction_code' => (string) ($transaction?->transaction_code ?? ''),
                    'gateway' => (string) ($transaction?->gateway ?? $payment->method ?? ''),
                    'vip_expires_at' => $payment->subscription?->end_date?->toISOString(),
                ];
            })->values(),
            'meta' => [
                'current_page' => $payments->currentPage(),
                'last_page' => $payments->lastPage(),
                'total' => $payments->total(),
            ],
        ]);
    }

    public function show(Request $request, string $paymentCode): JsonResponse
    {
        $payment = Payment::query()
            ->where('payment_code', $paymentCode)
            ->where('user_id', (string) $request->user()->getKey())
            ->with(['details.plan', 'subscription'])
            ->firstOrFail();

        return response()->json(['data' => [
            'payment_code' => (string) $payment->payment_code,
            'status' => (string) $payment->status,
            'amount' => (float) $payment->amount,
            'currency' => (string) ($payment->currency ?? 'VND'),
            'method' => (string) $payment->method,
            'plan_name' => (string) ($payment->details->first()?->item_name ?? 'Gói VIP'),
            'paid_at' => $payment->paid_at?->toISOString(),
            'vip_expires_at' => $payment->subscription?->end_date?->toISOString(),
        ]]);
    }

    public function store(Request $request, VipPaymentGatewayService $gateways): JsonResponse
    {
        $validated = $request->validate([
            'plan_id' => ['required', 'string', 'max:120'],
            'method' => ['required', 'string', Rule::in(['momo', 'vnpay', 'zalopay'])],
        ]);

        if (! $gateways->isConfigured($validated['method'])) {
            return response()->json([
                'message' => 'Cổng thanh toán này chưa được cấu hình. Hãy thêm thông tin merchant và HTTPS callback vào Backend trước khi mở bán.',
                'code' => 'payment_gateway_unavailable',
            ], 503);
        }

        $plan = SubscriptionPlan::query()->find($validated['plan_id']);
        if (! $plan || ($plan->status ?? 'inactive') !== 'active') {
            return response()->json(['message' => 'Gói VIP không tồn tại hoặc đã tạm dừng.'], 404);
        }

        $amount = (int) round((float) $plan->price);
        if ($amount <= 0) {
            return response()->json(['message' => 'Gói VIP này chưa có giá thanh toán hợp lệ.'], 422);
        }

        do {
            $paymentCode = 'VIP'.Str::upper(Str::random(10));
        } while (Payment::query()->where('payment_code', $paymentCode)->exists());

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

        try {
            $checkout = $gateways->createCheckout($payment, $request->user());
            $payment->forceFill([
                'gateway_request_id' => $checkout['request_id'],
                'gateway_order_id' => $checkout['provider_order_id'],
            ])->save();
        } catch (Throwable $exception) {
            report($exception);

            return response()->json([
                'message' => 'Không tạo được phiên thanh toán. Vui lòng thử lại sau ít phút.',
                'code' => 'payment_checkout_failed',
                'payment_code' => $paymentCode,
            ], 503);
        }

        return response()->json([
            'message' => 'Đã tạo đơn hàng. Hãy hoàn tất thanh toán trên cổng được chọn.',
            'data' => [
                'payment_id' => (string) $payment->getKey(),
                'payment_code' => $paymentCode,
                'amount' => $amount,
                'currency' => 'VND',
                'method' => $validated['method'],
                'status' => 'pending',
                'checkout_url' => $checkout['checkout_url'],
                'plan' => ['id' => (string) $plan->getKey(), 'name' => (string) $plan->name],
            ],
        ], 201);
    }

    public function momoIpn(Request $request, VipPaymentGatewayService $gateways, VipPaymentSettlementService $settlements): Response
    {
        $payload = $request->all();
        if (! $gateways->verifyMomoCallback($payload)) {
            return response()->json(['message' => 'Chữ ký MoMo không hợp lệ.'], 403);
        }

        $payment = Payment::query()->where('payment_code', (string) ($payload['orderId'] ?? ''))->first();
        if (! $payment || $payment->method !== 'momo') {
            return response()->json(['message' => 'Không tìm thấy đơn thanh toán.'], 404);
        }
        if (filled($payment->gateway_request_id)
            && ! hash_equals((string) $payment->gateway_request_id, (string) ($payload['requestId'] ?? ''))) {
            return response()->json(['message' => 'Mã yêu cầu MoMo không khớp đơn hàng.'], 409);
        }
        if ((int) round((float) $payment->amount) !== (int) ($payload['amount'] ?? -1)) {
            return response()->json(['message' => 'Số tiền MoMo không khớp đơn hàng.'], 409);
        }

        if ((int) ($payload['resultCode'] ?? -1) === 0) {
            $settlements->markPaid($payment, (string) ($payload['transId'] ?? ''), $payload);
        } else {
            $status = (int) ($payload['resultCode'] ?? 0) === 1006 ? 'cancelled' : 'failed';
            $settlements->markFailed($payment, $status, (string) ($payload['transId'] ?? ''));
        }

        return response()->noContent();
    }

    public function momoReturn(Request $request, VipPaymentGatewayService $gateways): RedirectResponse
    {
        $payload = $request->query();
        abort_unless($gateways->verifyMomoCallback($payload), 400, 'Phản hồi MoMo không hợp lệ.');

        $payment = Payment::query()
            ->where('payment_code', (string) ($payload['orderId'] ?? ''))
            ->where('method', 'momo')
            ->firstOrFail();
        abort_unless(! filled($payment->gateway_request_id)
            || hash_equals((string) $payment->gateway_request_id, (string) ($payload['requestId'] ?? '')), 400, 'Mã yêu cầu MoMo không khớp.');
        abort_unless((int) round((float) $payment->amount) === (int) ($payload['amount'] ?? -1), 400, 'Số tiền MoMo không khớp.');

        return $this->redirectToResult((string) $payment->payment_code);
    }

    public function vnpayIpn(Request $request, VipPaymentGatewayService $gateways, VipPaymentSettlementService $settlements): JsonResponse
    {
        $payload = $request->query();
        if (! $gateways->verifyVnpayCallback($payload)) {
            return response()->json(['RspCode' => '97', 'Message' => 'Invalid signature']);
        }

        $payment = Payment::query()->where('payment_code', (string) ($payload['vnp_TxnRef'] ?? ''))->first();
        if (! $payment || $payment->method !== 'vnpay') {
            return response()->json(['RspCode' => '01', 'Message' => 'Order not found']);
        }
        if ((int) ($payload['vnp_Amount'] ?? -1) !== (int) round((float) $payment->amount) * 100) {
            return response()->json(['RspCode' => '04', 'Message' => 'Invalid amount']);
        }

        if (($payload['vnp_ResponseCode'] ?? '') === '00' && ($payload['vnp_TransactionStatus'] ?? '') === '00') {
            $settlements->markPaid($payment, (string) ($payload['vnp_TransactionNo'] ?? ''), $payload);
        } else {
            $settlements->markFailed($payment, 'failed', (string) ($payload['vnp_TransactionNo'] ?? ''));
        }

        return response()->json(['RspCode' => '00', 'Message' => 'Confirm Success']);
    }

    public function vnpayReturn(
        Request $request,
        VipPaymentGatewayService $gateways,
        VipPaymentSettlementService $settlements,
    ): RedirectResponse
    {
        $payload = $request->query();
        abort_unless($gateways->verifyVnpayCallback($payload), 400, 'Phản hồi VNPAY không hợp lệ.');

        $payment = Payment::query()
            ->where('payment_code', (string) ($payload['vnp_TxnRef'] ?? ''))
            ->where('method', 'vnpay')
            ->firstOrFail();
        abort_unless((int) ($payload['vnp_Amount'] ?? -1) === (int) round((float) $payment->amount) * 100, 400, 'Số tiền VNPAY không khớp.');

        $transactionCode = (string) ($payload['vnp_TransactionNo'] ?? '');
        if (($payload['vnp_ResponseCode'] ?? '') === '00'
            && ($payload['vnp_TransactionStatus'] ?? '') === '00') {
            // The signed browser return is a verified fallback for local setups
            // where VNPay cannot reach the merchant IPN URL (for example localhost).
            // Settlement is idempotent, so a later IPN will not grant VIP twice.
            $settlements->markPaid($payment, $transactionCode, $payload);
        } else {
            $status = (string) ($payload['vnp_ResponseCode'] ?? '') === '24' ? 'cancelled' : 'failed';
            $settlements->markFailed($payment, $status, $transactionCode);
        }

        return $this->redirectToResult((string) $payment->payment_code);
    }

    public function zalopayCallback(Request $request, VipPaymentGatewayService $gateways, VipPaymentSettlementService $settlements): JsonResponse
    {
        $payload = $request->all();
        if (! $gateways->verifyZaloPayCallback($payload)) {
            return response()->json(['return_code' => 2, 'return_message' => 'Invalid callback signature'], 403);
        }

        try {
            $callbackData = json_decode((string) ($payload['data'] ?? ''), true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return response()->json(['return_code' => 2, 'return_message' => 'Invalid callback data'], 400);
        }

        if (! is_array($callbackData)
            || (string) ($callbackData['app_id'] ?? '') !== (string) config('services.zalopay.app_id')) {
            return response()->json(['return_code' => 2, 'return_message' => 'Unknown application'], 403);
        }

        $payment = Payment::query()
            ->where('gateway_order_id', (string) ($callbackData['app_trans_id'] ?? ''))
            ->where('method', 'zalopay')
            ->first();
        if (! $payment) {
            return response()->json(['return_code' => 2, 'return_message' => 'Order not found'], 404);
        }
        if ((int) ($callbackData['amount'] ?? -1) !== (int) round((float) $payment->amount)) {
            return response()->json(['return_code' => 2, 'return_message' => 'Invalid amount'], 409);
        }

        $settlements->markPaid($payment, (string) ($callbackData['zp_trans_id'] ?? ''), $callbackData);

        return response()->json(['return_code' => 1, 'return_message' => 'success']);
    }

    private function redirectToResult(string $paymentCode): RedirectResponse
    {
        $base = (string) config('services.payments.return_url');
        $separator = str_contains($base, '?') ? '&' : '?';

        return redirect()->away($base.$separator.http_build_query(['payment_code' => $paymentCode]));
    }
}
