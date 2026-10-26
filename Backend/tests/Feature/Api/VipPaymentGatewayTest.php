<?php

namespace Tests\Feature\Api;

use App\Models\Payment;
use App\Models\PaymentDetail;
use App\Models\Subscription;
use App\Models\SubscriptionPlan;
use App\Models\Transaction;
use App\Models\User;
use App\Models\UserApiToken;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Tests\TestCase;

class VipPaymentGatewayTest extends TestCase
{
    private string $prefix;

    private User $user;

    private SubscriptionPlan $plan;

    private array $headers;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prefix = 'test_vip_payment_'.bin2hex(random_bytes(6)).'_';
        config(['database.connections.mongodb.prefix' => $this->prefix]);
        DB::purge('mongodb');
        Http::preventStrayRequests();
        config([
            'services.payments.return_url' => 'https://frontend.example.test/mua-vip/ket-qua',
            'services.momo.partner_code' => 'MOMO_TEST_PARTNER',
            'services.momo.access_key' => 'momo-test-access',
            'services.momo.secret_key' => 'momo-test-secret',
            'services.momo.api_url' => 'https://momo.example.test/v2/gateway/api/create',
            'services.momo.redirect_url' => 'https://api.example.test/api/v1/vip/payments/momo/return',
            'services.momo.ipn_url' => 'https://api.example.test/api/v1/vip/payments/momo/ipn',
            'services.momo.pay_url_hosts' => 'test-payment.momo.vn,payment.momo.vn',
            'services.momo.request_type' => 'captureWallet',
            'services.vnpay.tmn_code' => 'VNPAYTEST',
            'services.vnpay.hash_secret' => 'vnpay-test-secret',
            'services.vnpay.payment_url' => 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
            'services.vnpay.return_url' => 'https://api.example.test/api/v1/vip/payments/vnpay/return',
            'services.vnpay.ipn_url' => 'https://api.example.test/api/v1/vip/payments/vnpay/ipn',
            'services.zalopay.app_id' => '12345',
            'services.zalopay.key1' => 'zalopay-test-key1',
            'services.zalopay.key2' => 'zalopay-test-key2',
            'services.zalopay.create_url' => 'https://sb-openapi.zalopay.vn/v2/create',
            'services.zalopay.callback_url' => 'https://api.example.test/api/v1/vip/payments/zalopay/callback',
        ]);

        $this->user = User::query()->create([
            'name' => 'VIP Buyer',
            'username' => 'vip-buyer',
            'email' => 'vip-buyer@example.test',
            'password' => 'not-a-real-password',
            'status' => 'active',
            'is_premium' => 0,
        ]);
        $plainToken = Str::random(64);
        UserApiToken::query()->create([
            'user_id' => (string) $this->user->getKey(),
            'token_hash' => hash('sha256', $plainToken),
            'expires_at' => now()->addHour(),
        ]);
        $this->headers = ['Authorization' => 'Bearer '.$plainToken];

        $this->plan = SubscriptionPlan::query()->create([
            'name' => 'VIP 1 tháng',
            'slug' => 'vip-one-month',
            'price' => 12000,
            'billing_months' => 1,
            'status' => 'active',
        ]);
    }

    protected function tearDown(): void
    {
        try {
            $connection = DB::connection('mongodb');
            if ($connection->getTablePrefix() === $this->prefix && preg_match('/^test_vip_payment_[a-f0-9]{12}_$/', $this->prefix)) {
                foreach (['payments', 'payment_details', 'transactions', 'subscriptions', 'subscription_plans', 'users', 'user_api_tokens'] as $collection) {
                    $connection->getCollection($collection)->drop();
                }
            }
            DB::purge('mongodb');
        } finally {
            parent::tearDown();
        }
    }

    public function test_gateway_list_reports_real_configuration_and_checkout_rejects_unconfigured_provider(): void
    {
        $this->getJson('/api/v1/vip/payment-methods')
            ->assertOk()
            ->assertJsonPath('data.0.id', 'momo')
            ->assertJsonPath('data.0.enabled', true)
            ->assertJsonPath('data.1.id', 'vnpay')
            ->assertJsonPath('data.1.label', 'VNPAY QR')
            ->assertJsonPath('data.1.enabled', true)
            ->assertJsonPath('data.2.id', 'zalopay')
            ->assertJsonPath('data.2.enabled', true);

        config(['services.vnpay.return_url' => '']);
        $this->getJson('/api/v1/vip/payment-methods')
            ->assertOk()
            ->assertJsonPath('data.1.enabled', false);

        config(['services.zalopay.key2' => '']);
        $this->getJson('/api/v1/vip/payment-methods')
            ->assertOk()
            ->assertJsonPath('data.2.enabled', false);

        config([
            'services.zalopay.key2' => 'zalopay-test-key2',
            'services.zalopay.callback_url' => 'http://localhost/api/v1/vip/payments/zalopay/callback',
        ]);
        $this->getJson('/api/v1/vip/payment-methods')
            ->assertOk()
            ->assertJsonPath('data.2.enabled', false);

        config(['services.zalopay.callback_url' => 'https://api.example.test/api/v1/vip/payments/zalopay/callback']);
        $originalEnvironment = $this->app->environment();
        $this->app['env'] = 'production';
        $this->getJson('/api/v1/vip/payment-methods')
            ->assertOk()
            ->assertJsonPath('data.2.enabled', true);
        config(['services.zalopay.callback_url' => 'http://api.example.test/api/v1/vip/payments/zalopay/callback']);
        $this->getJson('/api/v1/vip/payment-methods')
            ->assertOk()
            ->assertJsonPath('data.2.enabled', false);
        $this->app['env'] = $originalEnvironment;

        config(['services.vnpay.hash_secret' => '']);
        $this->withHeaders($this->headers)->postJson('/api/v1/vip/checkout', [
            'plan_id' => (string) $this->plan->getKey(),
            'method' => 'vnpay',
        ])->assertStatus(503)->assertJsonPath('code', 'payment_gateway_unavailable');

        $this->assertSame(0, Payment::query()->count());
    }

    public function test_momo_checkout_creates_signed_provider_request_and_returns_a_trusted_https_pay_url(): void
    {
        Http::fake([
            'https://momo.example.test/v2/gateway/api/create' => Http::response([
                'resultCode' => 0,
                'payUrl' => 'https://test-payment.momo.vn/gateway/pay?token=test',
            ]),
        ]);

        $response = $this->withHeaders($this->headers)->postJson('/api/v1/vip/checkout', [
            'plan_id' => (string) $this->plan->getKey(),
            'method' => 'momo',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.method', 'momo')
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.checkout_url', 'https://test-payment.momo.vn/gateway/pay?token=test');

        Http::assertSent(function (HttpRequest $request): bool {
            $payload = $request->data();
            $canonical = 'accessKey=momo-test-access'
                .'&amount=12000'
                .'&extraData='.$payload['extraData']
                .'&ipnUrl=https://api.example.test/api/v1/vip/payments/momo/ipn'
                .'&orderId='.$payload['orderId']
                .'&orderInfo=Melodify VIP '.$payload['orderId']
                .'&partnerCode=MOMO_TEST_PARTNER'
                .'&redirectUrl=https://api.example.test/api/v1/vip/payments/momo/return'
                .'&requestId='.$payload['requestId']
                .'&requestType=captureWallet';

            return $request->url() === 'https://momo.example.test/v2/gateway/api/create'
                && $payload['signature'] === hash_hmac('sha256', $canonical, 'momo-test-secret');
        });
    }

    public function test_momo_ipn_verifies_signature_amount_and_grants_vip_only_once(): void
    {
        $payment = $this->pendingPayment('momo');
        $payload = $this->signedMomoCallback($payment, 0, 'MOMO-TRANS-123');

        $this->postJson('/api/v1/vip/payments/momo/ipn', array_replace($payload, ['signature' => str_repeat('0', 64)]))
            ->assertForbidden();
        $this->assertSame('pending', $payment->fresh()->status);
        $this->assertFalse($this->user->fresh()->hasPremiumAccess());

        $this->postJson('/api/v1/vip/payments/momo/ipn', $payload)->assertNoContent();
        $this->postJson('/api/v1/vip/payments/momo/ipn', $payload)->assertNoContent();

        $payment->refresh();
        $this->assertSame('success', $payment->status);
        $this->assertTrue($this->user->fresh()->hasPremiumAccess());
        $this->assertSame(1, Subscription::query()->where('payment_id', (string) $payment->getKey())->count());
        $this->assertSame(1, Transaction::query()->where('payment_id', (string) $payment->getKey())->count());

        $this->withHeaders($this->headers)
            ->getJson('/api/v1/vip/transactions/'.$payment->payment_code)
            ->assertOk()
            ->assertJsonPath('data.status', 'success')
            ->assertJsonPath('data.method', 'momo');
    }

    public function test_vnpay_ipn_checks_signature_and_amount_before_settlement(): void
    {
        $payment = $this->pendingPayment('vnpay');
        $payload = $this->signedVnpayCallback($payment);

        $this->getJson('/api/v1/vip/payments/vnpay/ipn?'.http_build_query(array_replace($payload, ['vnp_SecureHash' => str_repeat('0', 128)])))
            ->assertOk()->assertJsonPath('RspCode', '97');
        $this->assertSame('pending', $payment->fresh()->status);

        $this->getJson('/api/v1/vip/payments/vnpay/ipn?'.http_build_query($payload))
            ->assertOk()->assertJsonPath('RspCode', '00');
        $this->assertSame('success', $payment->fresh()->status);
        $this->assertTrue($this->user->fresh()->hasPremiumAccess());
    }

    public function test_vnpay_checkout_forces_the_qr_payment_method(): void
    {
        $response = $this->withHeaders($this->headers)->postJson('/api/v1/vip/checkout', [
            'plan_id' => (string) $this->plan->getKey(),
            'method' => 'vnpay',
        ]);

        $response->assertCreated()->assertJsonPath('data.method', 'vnpay');
        parse_str((string) parse_url((string) $response->json('data.checkout_url'), PHP_URL_QUERY), $query);
        $this->assertSame('VNPAYQR', $query['vnp_BankCode'] ?? null);
    }

    public function test_zalopay_checkout_creates_a_signed_wallet_only_order(): void
    {
        Http::fake([
            'https://sb-openapi.zalopay.vn/v2/create' => Http::response([
                'return_code' => 1,
                'order_url' => 'https://gateway.zalopay.vn/openinapp?order=test-token',
                'qr_code' => 'test-qr-payload',
            ]),
        ]);

        $response = $this->withHeaders($this->headers)->postJson('/api/v1/vip/checkout', [
            'plan_id' => (string) $this->plan->getKey(),
            'method' => 'zalopay',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.method', 'zalopay')
            ->assertJsonPath('data.checkout_url', 'https://gateway.zalopay.vn/openinapp?order=test-token');

        Http::assertSent(function (HttpRequest $request): bool {
            $payload = $request->data();
            $embedData = json_decode((string) $payload['embed_data'], true);
            $signatureData = implode('|', [
                (string) $payload['app_id'],
                (string) $payload['app_trans_id'],
                (string) $payload['app_user'],
                (string) $payload['amount'],
                (string) $payload['app_time'],
                (string) $payload['embed_data'],
                (string) $payload['item'],
            ]);

            return $request->url() === 'https://sb-openapi.zalopay.vn/v2/create'
                && $payload['callback_url'] === 'https://api.example.test/api/v1/vip/payments/zalopay/callback'
                && ($embedData['preferred_payment_method'] ?? null) === ['zalopay_wallet']
                && $payload['mac'] === hash_hmac('sha256', $signatureData, 'zalopay-test-key1');
        });
    }

    public function test_zalopay_callback_verifies_signature_order_amount_and_grants_vip_once(): void
    {
        $payment = $this->pendingPayment('zalopay');
        $payload = $this->signedZaloPayCallback($payment);

        $this->postJson('/api/v1/vip/payments/zalopay/callback', array_replace($payload, ['mac' => str_repeat('0', 64)]))
            ->assertForbidden();
        $this->assertSame('pending', $payment->fresh()->status);
        $this->assertFalse($this->user->fresh()->hasPremiumAccess());

        $wrongAmount = $this->signedZaloPayCallback($payment, 11000);
        $this->postJson('/api/v1/vip/payments/zalopay/callback', $wrongAmount)->assertStatus(409);
        $this->assertSame('pending', $payment->fresh()->status);

        $this->postJson('/api/v1/vip/payments/zalopay/callback', $payload)
            ->assertOk()
            ->assertJsonPath('return_code', 1);
        $this->postJson('/api/v1/vip/payments/zalopay/callback', $payload)
            ->assertOk()
            ->assertJsonPath('return_code', 1);

        $this->assertSame('success', $payment->fresh()->status);
        $this->assertTrue($this->user->fresh()->hasPremiumAccess());
        $this->assertSame(1, Subscription::query()->where('payment_id', (string) $payment->getKey())->count());
        $this->assertSame(1, Transaction::query()->where('payment_id', (string) $payment->getKey())->count());
    }

    public function test_momo_failed_result_does_not_activate_premium(): void
    {
        $payment = $this->pendingPayment('momo');
        $payload = $this->signedMomoCallback($payment, 1006, 'MOMO-CANCEL-1');

        $this->postJson('/api/v1/vip/payments/momo/ipn', $payload)->assertNoContent();

        $this->assertSame('cancelled', $payment->fresh()->status);
        $this->assertFalse($this->user->fresh()->hasPremiumAccess());
        $this->assertSame(0, Subscription::query()->count());
    }

    private function pendingPayment(string $method): Payment
    {
        $paymentCode = 'VIP'.Str::upper(Str::random(10));
        $payment = Payment::query()->create([
            'user_id' => (string) $this->user->getKey(),
            'payment_code' => $paymentCode,
            'amount' => 12000,
            'currency' => 'VND',
            'method' => $method,
            'status' => 'pending',
            'gateway_request_id' => $method === 'momo' ? 'REQ-TEST-123' : null,
            'gateway_order_id' => $method === 'zalopay' ? now('Asia/Ho_Chi_Minh')->format('ymd').'_'.$paymentCode : null,
        ]);
        PaymentDetail::query()->create([
            'payment_id' => (string) $payment->getKey(),
            'plan_id' => (string) $this->plan->getKey(),
            'item_name' => $this->plan->name,
            'unit_price' => 12000,
            'quantity' => 1,
            'subtotal' => 12000,
            'discount_amount' => 0,
            'tax_amount' => 0,
            'total_amount' => 12000,
        ]);

        return $payment;
    }

    private function signedMomoCallback(Payment $payment, int $resultCode, string $transactionCode): array
    {
        $payload = [
            'partnerCode' => 'MOMO_TEST_PARTNER',
            'orderId' => (string) $payment->payment_code,
            'requestId' => 'REQ-TEST-123',
            'amount' => '12000',
            'orderInfo' => 'Melodify VIP '.$payment->payment_code,
            'orderType' => 'momo_wallet',
            'transId' => $transactionCode,
            'resultCode' => (string) $resultCode,
            'message' => $resultCode === 0 ? 'Successful.' : 'User cancelled.',
            'payType' => 'qr',
            'responseTime' => (string) now()->valueOf(),
            'extraData' => '',
        ];
        $payload['signature'] = $this->momoSignature($payload);

        return $payload;
    }

    private function momoSignature(array $payload): string
    {
        $fields = [
            'accessKey' => 'momo-test-access',
            'amount' => $payload['amount'],
            'extraData' => $payload['extraData'],
            'message' => $payload['message'],
            'orderId' => $payload['orderId'],
            'orderInfo' => $payload['orderInfo'],
            'orderType' => $payload['orderType'],
            'partnerCode' => $payload['partnerCode'],
            'payType' => $payload['payType'],
            'requestId' => $payload['requestId'],
            'responseTime' => $payload['responseTime'],
            'resultCode' => $payload['resultCode'],
            'transId' => $payload['transId'],
        ];

        return hash_hmac('sha256', implode('&', array_map(
            static fn (string $key, string $value): string => $key.'='.$value,
            array_keys($fields),
            array_values($fields),
        )), 'momo-test-secret');
    }

    private function signedZaloPayCallback(Payment $payment, int $amount = 12000): array
    {
        $data = json_encode([
            'app_id' => 12345,
            'app_trans_id' => (string) $payment->gateway_order_id,
            'app_time' => now()->valueOf(),
            'app_user' => 'vip-buyer',
            'amount' => $amount,
            'embed_data' => '{}',
            'item' => '[]',
            'zp_trans_id' => 987654321,
        ], JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);

        return [
            'data' => $data,
            'mac' => hash_hmac('sha256', $data, 'zalopay-test-key2'),
            'type' => 1,
        ];
    }

    private function signedVnpayCallback(Payment $payment): array
    {
        $payload = [
            'vnp_Amount' => '1200000',
            'vnp_BankCode' => 'NCB',
            'vnp_OrderInfo' => 'Melodify VIP '.$payment->payment_code,
            'vnp_ResponseCode' => '00',
            'vnp_TmnCode' => 'VNPAYTEST',
            'vnp_TransactionNo' => 'VNP-TRANS-123',
            'vnp_TransactionStatus' => '00',
            'vnp_TxnRef' => (string) $payment->payment_code,
        ];
        ksort($payload, SORT_STRING);
        $payload['vnp_SecureHash'] = hash_hmac('sha512', http_build_query($payload, '', '&', PHP_QUERY_RFC1738), 'vnpay-test-secret');

        return $payload;
    }
}
