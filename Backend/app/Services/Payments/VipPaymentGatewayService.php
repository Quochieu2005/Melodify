<?php

namespace App\Services\Payments;

use App\Models\Payment;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

class VipPaymentGatewayService
{
    public function methods(): array
    {
        return [
            ['id' => 'momo', 'label' => 'MoMo', 'enabled' => $this->isConfigured('momo')],
            ['id' => 'vnpay', 'label' => 'VNPAY', 'enabled' => $this->isConfigured('vnpay')],
            ['id' => 'zalopay', 'label' => 'Ví ZaloPay', 'enabled' => $this->isConfigured('zalopay')],
        ];
    }

    public function isConfigured(string $gateway): bool
    {
        $settings = config("services.{$gateway}", []);
        $payments = config('services.payments', []);
        $required = match ($gateway) {
            'momo' => ['partner_code', 'access_key', 'secret_key', 'api_url', 'ipn_url', 'redirect_url'],
            'vnpay' => ['tmn_code', 'hash_secret', 'payment_url', 'return_url', 'ipn_url'],
            'zalopay' => ['app_id', 'key1', 'key2', 'create_url', 'query_url', 'callback_url'],
            default => [],
        };

        if ($required === []) {
            return false;
        }

        foreach ($required as $key) {
            if (blank($settings[$key] ?? null)) {
                return false;
            }
        }

        if (blank($payments['return_url'] ?? null)) {
            return false;
        }

        // ZaloPay sends its payment result server-to-server over HTTPS.
        if ($gateway === 'zalopay'
            && parse_url((string) ($settings['callback_url'] ?? ''), PHP_URL_SCHEME) !== 'https') {
            return false;
        }

        if (app()->environment('production')) {
            $callbackUrls = match ($gateway) {
                'momo' => [$settings['redirect_url'] ?? '', $settings['ipn_url'] ?? ''],
                'vnpay' => [$settings['return_url'] ?? '', $settings['ipn_url'] ?? ''],
                'zalopay' => [$settings['callback_url'] ?? ''],
            };
            $providerUrl = match ($gateway) {
                'momo' => $settings['api_url'] ?? '',
                'vnpay' => $settings['payment_url'] ?? '',
                'zalopay' => $settings['create_url'] ?? '',
                default => $settings['create_url'] ?? '',
            };
            $providerUrls = $gateway === 'zalopay'
                ? [$providerUrl, $settings['query_url'] ?? '']
                : [$providerUrl];
            foreach ([...$callbackUrls, $payments['return_url'], ...$providerUrls] as $url) {
                if (parse_url((string) $url, PHP_URL_SCHEME) !== 'https') {
                    return false;
                }
            }
        }

        return true;
    }

    /** @return array{checkout_url:string,request_id:string,provider_order_id:string} */
    public function createCheckout(Payment $payment, User $user): array
    {
        return match ($payment->method) {
            'momo' => $this->createMomoCheckout($payment),
            'vnpay' => $this->createVnpayCheckout($payment),
            'zalopay' => $this->createZaloPayCheckout($payment, $user),
            default => throw new RuntimeException('Phương thức thanh toán không được hỗ trợ.'),
        };
    }

    private function createMomoCheckout(Payment $payment): array
    {
        abort_unless($this->isConfigured('momo'), 503, 'MoMo chưa được cấu hình trên máy chủ.');

        $settings = config('services.momo');
        $amount = (int) round((float) $payment->amount);
        if ($amount < 1000 || $amount > 50_000_000) {
            throw new RuntimeException('Số tiền gói VIP không nằm trong giới hạn thanh toán MoMo.');
        }

        $requestId = 'R'.str_replace('-', '', (string) Str::uuid());
        $orderId = (string) $payment->payment_code;
        $orderInfo = 'Melodify VIP '.$orderId;
        $redirectUrl = (string) $settings['redirect_url'];
        $extraData = base64_encode(json_encode(['payment_id' => (string) $payment->getKey()], JSON_THROW_ON_ERROR));

        $payload = [
            'partnerCode' => (string) $settings['partner_code'],
            'requestId' => $requestId,
            'amount' => $amount,
            'orderId' => $orderId,
            'orderInfo' => $orderInfo,
            'redirectUrl' => $redirectUrl,
            'ipnUrl' => (string) $settings['ipn_url'],
            'requestType' => (string) ($settings['request_type'] ?? 'captureWallet'),
            'extraData' => $extraData,
            'lang' => 'vi',
        ];
        $payload['signature'] = $this->signMomoCreate($payload, (string) $settings['access_key'], (string) $settings['secret_key']);

        // MoMo's captureWallet integration recommends a minimum 30-second timeout.
        $response = Http::asJson()->acceptJson()->connectTimeout(5)->timeout(35)
            ->post((string) $settings['api_url'], $payload);
        $body = $response->json();
        if (! $response->successful() || ! is_array($body) || (int) ($body['resultCode'] ?? -1) !== 0) {
            throw new RuntimeException('MoMo hiện không thể tạo giao dịch thanh toán.');
        }

        $checkoutUrl = (string) ($body['payUrl'] ?? '');
        $host = strtolower((string) parse_url($checkoutUrl, PHP_URL_HOST));
        $allowedHosts = array_filter(array_map('trim', explode(',', (string) ($settings['pay_url_hosts'] ?? 'test-payment.momo.vn,payment.momo.vn'))));
        if (parse_url($checkoutUrl, PHP_URL_SCHEME) !== 'https' || ! in_array($host, $allowedHosts, true)) {
            throw new RuntimeException('MoMo trả về địa chỉ thanh toán không hợp lệ.');
        }

        return ['checkout_url' => $checkoutUrl, 'request_id' => $requestId, 'provider_order_id' => $orderId];
    }

    private function createVnpayCheckout(Payment $payment): array
    {
        abort_unless($this->isConfigured('vnpay'), 503, 'VNPAY chưa được cấu hình trên máy chủ.');

        $settings = config('services.vnpay');
        $amount = (int) round((float) $payment->amount);
        if ($amount < 5000 || $amount > 999_999_999) {
            throw new RuntimeException('Số tiền gói VIP không nằm trong giới hạn thanh toán VNPAY.');
        }

        $now = now('Asia/Ho_Chi_Minh');
        $requestId = 'R'.str_replace('-', '', (string) Str::uuid());
        $params = [
            'vnp_Version' => '2.1.0',
            'vnp_Command' => 'pay',
            'vnp_TmnCode' => (string) $settings['tmn_code'],
            'vnp_Amount' => $amount * 100,
            'vnp_CreateDate' => $now->format('YmdHis'),
            'vnp_CurrCode' => 'VND',
            'vnp_IpAddr' => request()->ip() ?: '127.0.0.1',
            'vnp_Locale' => 'vn',
            'vnp_OrderInfo' => 'Melodify VIP '.$payment->payment_code,
            'vnp_OrderType' => 'other',
            'vnp_ReturnUrl' => (string) $settings['return_url'],
            'vnp_TxnRef' => (string) $payment->payment_code,
            'vnp_ExpireDate' => $now->copy()->addMinutes(15)->format('YmdHis'),
        ];
        $bankCode = trim((string) ($settings['bank_code'] ?? ''));
        if ($bankCode !== '') {
            $params['vnp_BankCode'] = $bankCode;
        }
        ksort($params, SORT_STRING);
        $query = http_build_query($params, '', '&', PHP_QUERY_RFC1738);
        $signature = hash_hmac('sha512', $query, (string) $settings['hash_secret']);
        $checkoutUrl = (string) $settings['payment_url'].'?'.$query.'&vnp_SecureHash='.$signature;

        return ['checkout_url' => $checkoutUrl, 'request_id' => $requestId, 'provider_order_id' => (string) $payment->payment_code];
    }

    /** @return array{checkout_url:string,request_id:string,provider_order_id:string} */
    private function createZaloPayCheckout(Payment $payment, User $user): array
    {
        abort_unless($this->isConfigured('zalopay'), 503, 'ZaloPay chưa được cấu hình trên máy chủ.');

        $settings = config('services.zalopay');
        $amount = (int) round((float) $payment->amount);
        if ($amount <= 0) {
            throw new RuntimeException('Số tiền gói VIP không hợp lệ cho ZaloPay.');
        }

        $now = now('Asia/Ho_Chi_Minh');
        $appTransId = $now->format('ymd').'_'.(string) $payment->payment_code;
        $appTime = (int) floor(microtime(true) * 1000);
        $item = '[]';
        $redirectUrl = $this->appendQueryParameters((string) config('services.payments.return_url'), [
            'payment_code' => (string) $payment->payment_code,
        ]);
        $embedData = json_encode([
            'preferred_payment_method' => ['zalopay_wallet'],
            'redirecturl' => $redirectUrl,
        ], JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
        $callbackUrl = (string) $settings['callback_url'];
        $appUser = mb_substr((string) $user->getKey(), 0, 50);
        $signatureData = implode('|', [
            (string) $settings['app_id'],
            $appTransId,
            $appUser,
            (string) $amount,
            (string) $appTime,
            $embedData,
            $item,
        ]);
        $payload = [
            'app_id' => (int) $settings['app_id'],
            'app_user' => $appUser,
            'app_trans_id' => $appTransId,
            'app_time' => $appTime,
            'expire_duration_seconds' => 900,
            'amount' => $amount,
            'description' => 'Melodify VIP '.$payment->payment_code,
            'callback_url' => $callbackUrl,
            'item' => $item,
            'embed_data' => $embedData,
            'bank_code' => '',
            'mac' => hash_hmac('sha256', $signatureData, (string) $settings['key1']),
        ];

        $response = Http::asJson()->acceptJson()->connectTimeout(5)->timeout(15)
            ->post((string) $settings['create_url'], $payload);
        $body = $response->json();
        if (! $response->successful() || ! is_array($body) || (int) ($body['return_code'] ?? 0) !== 1) {
            throw new RuntimeException('ZaloPay hiện không thể tạo giao dịch thanh toán.');
        }

        $checkoutUrl = (string) ($body['order_url'] ?? '');
        $host = strtolower((string) parse_url($checkoutUrl, PHP_URL_HOST));
        $trustedHost = preg_match('/(^|\.)zalopay\.(vn|com\.vn)$/', $host) === 1;
        if (parse_url($checkoutUrl, PHP_URL_SCHEME) !== 'https' || ! $trustedHost) {
            throw new RuntimeException('ZaloPay trả về địa chỉ thanh toán không hợp lệ.');
        }

        return [
            'checkout_url' => $checkoutUrl,
            'request_id' => $appTransId,
            'provider_order_id' => $appTransId,
        ];
    }

    public function verifyMomoCallback(array $payload): bool
    {
        $settings = config('services.momo');
        $provided = (string) ($payload['signature'] ?? '');
        if ($provided === '' || ! $this->isConfigured('momo')) {
            return false;
        }

        $fields = [
            'accessKey' => (string) $settings['access_key'],
            'amount' => (string) ($payload['amount'] ?? ''),
            'extraData' => (string) ($payload['extraData'] ?? ''),
            'message' => (string) ($payload['message'] ?? ''),
            'orderId' => (string) ($payload['orderId'] ?? ''),
            'orderInfo' => (string) ($payload['orderInfo'] ?? ''),
            'orderType' => (string) ($payload['orderType'] ?? ''),
            'partnerCode' => (string) ($payload['partnerCode'] ?? ''),
            'payType' => (string) ($payload['payType'] ?? ''),
            'requestId' => (string) ($payload['requestId'] ?? ''),
            'responseTime' => (string) ($payload['responseTime'] ?? ''),
            'resultCode' => (string) ($payload['resultCode'] ?? ''),
            'transId' => (string) ($payload['transId'] ?? ''),
        ];
        $canonical = implode('&', array_map(static fn (string $key, string $value): string => $key.'='.$value, array_keys($fields), array_values($fields)));
        $expected = hash_hmac('sha256', $canonical, (string) $settings['secret_key']);

        return hash_equals($expected, $provided)
            && hash_equals((string) $settings['partner_code'], (string) ($payload['partnerCode'] ?? ''));
    }

    public function verifyVnpayCallback(array $payload): bool
    {
        $settings = config('services.vnpay');
        $provided = strtolower((string) ($payload['vnp_SecureHash'] ?? ''));
        if ($provided === '' || ! $this->isConfigured('vnpay')) {
            return false;
        }

        $params = array_filter($payload, static fn ($value, $key): bool => str_starts_with((string) $key, 'vnp_')
            && ! in_array($key, ['vnp_SecureHash', 'vnp_SecureHashType'], true), ARRAY_FILTER_USE_BOTH);
        ksort($params, SORT_STRING);
        $query = http_build_query($params, '', '&', PHP_QUERY_RFC1738);
        $expected = strtolower(hash_hmac('sha512', $query, (string) $settings['hash_secret']));

        return hash_equals($expected, $provided)
            && hash_equals((string) $settings['tmn_code'], (string) ($payload['vnp_TmnCode'] ?? ''));
    }

    public function verifyZaloPayCallback(array $payload): bool
    {
        $settings = config('services.zalopay');
        $provided = strtolower((string) ($payload['mac'] ?? ''));
        $data = (string) ($payload['data'] ?? '');
        if ($provided === '' || $data === '' || ! $this->isConfigured('zalopay')) {
            return false;
        }

        return hash_equals(hash_hmac('sha256', $data, (string) $settings['key2']), $provided);
    }

    /**
     * Query the provider's canonical order status. A browser redirect alone is
     * never treated as proof of payment; only a signed callback or this server
     * to server result may settle a ZaloPay order.
     *
     * @return array<string, mixed>|null
     */
    public function queryZaloPayOrder(Payment $payment): ?array
    {
        if ($payment->method !== 'zalopay'
            || blank($payment->gateway_order_id)
            || ! $this->isConfigured('zalopay')) {
            return null;
        }

        $settings = config('services.zalopay');
        $appId = (string) $settings['app_id'];
        $appTransId = (string) $payment->gateway_order_id;
        $signatureData = implode('|', [$appId, $appTransId, (string) $settings['key1']]);
        $payload = [
            'app_id' => (int) $settings['app_id'],
            'app_trans_id' => $appTransId,
            'mac' => hash_hmac('sha256', $signatureData, (string) $settings['key1']),
        ];

        $response = Http::asJson()->acceptJson()->connectTimeout(4)->timeout(10)
            ->post((string) $settings['query_url'], $payload);
        $body = $response->json();

        return $response->successful() && is_array($body) ? $body : null;
    }

    private function signMomoCreate(array $payload, string $accessKey, string $secretKey): string
    {
        $fields = [
            'accessKey' => $accessKey,
            'amount' => (string) $payload['amount'],
            'extraData' => (string) $payload['extraData'],
            'ipnUrl' => (string) $payload['ipnUrl'],
            'orderId' => (string) $payload['orderId'],
            'orderInfo' => (string) $payload['orderInfo'],
            'partnerCode' => (string) $payload['partnerCode'],
            'redirectUrl' => (string) $payload['redirectUrl'],
            'requestId' => (string) $payload['requestId'],
            'requestType' => (string) $payload['requestType'],
        ];
        $canonical = implode('&', array_map(static fn (string $key, string $value): string => $key.'='.$value, array_keys($fields), array_values($fields)));

        return hash_hmac('sha256', $canonical, $secretKey);
    }

    /** @param array<string, string> $parameters */
    private function appendQueryParameters(string $url, array $parameters): string
    {
        return $url.(str_contains($url, '?') ? '&' : '?').http_build_query($parameters);
    }
}
