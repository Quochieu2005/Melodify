<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Resend, Postmark, AWS, and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'oauth' => [
        'web_redirect_origins' => array_values(array_filter(array_map(
            'trim',
            explode(',', (string) env('OAUTH_WEB_REDIRECT_ORIGINS', '')),
        ))),
    ],

    'google' => [
        'guzzle' => ['connect_timeout' => 3, 'timeout' => 8],
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => env('GOOGLE_REDIRECT_URI') ?: rtrim((string) env('APP_URL', 'http://localhost'), '/').'/auth/google/callback',
        'mobile_client_ids' => env('GOOGLE_MOBILE_CLIENT_IDS', ''),
        'mobile_redirect' => env('GOOGLE_MOBILE_REDIRECT_URI') ?: 'mobile://oauth/callback',
    ],

    'facebook' => [
        'guzzle' => ['connect_timeout' => 3, 'timeout' => 8],
        'client_id' => env('FACEBOOK_CLIENT_ID'),
        'client_secret' => env('FACEBOOK_CLIENT_SECRET'),
        'redirect' => env('FACEBOOK_REDIRECT_URI') ?: rtrim((string) env('APP_URL', 'http://localhost'), '/').'/auth/facebook/callback',
        'mobile_redirect' => env('FACEBOOK_MOBILE_REDIRECT_URI') ?: 'mobile://oauth/callback',
        'graph_version' => env('FACEBOOK_GRAPH_VERSION', 'v23.0'),
    ],

    'payments' => [
        'return_url' => env('PAYMENT_RETURN_URL', 'http://localhost:3000/mua-vip/ket-qua'),
    ],

    'momo' => [
        'partner_code' => env('MOMO_PARTNER_CODE'),
        'access_key' => env('MOMO_ACCESS_KEY'),
        'secret_key' => env('MOMO_SECRET_KEY'),
        'api_url' => env('MOMO_API_URL', 'https://test-payment.momo.vn/v2/gateway/api/create'),
        'request_type' => env('MOMO_REQUEST_TYPE', 'captureWallet'),
        'redirect_url' => env('MOMO_REDIRECT_URL') ?: rtrim((string) env('APP_URL', 'http://localhost'), '/').'/api/v1/vip/payments/momo/return',
        'ipn_url' => env('MOMO_IPN_URL') ?: rtrim((string) env('APP_URL', 'http://localhost'), '/').'/api/v1/vip/payments/momo/ipn',
        'pay_url_hosts' => env('MOMO_PAY_URL_HOSTS', 'test-payment.momo.vn,payment.momo.vn'),
    ],

    'vnpay' => [
        'tmn_code' => env('VNPAY_TMN_CODE'),
        'hash_secret' => env('VNPAY_HASH_SECRET'),
        'payment_url' => env('VNPAY_PAYMENT_URL', 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html'),
        'bank_code' => env('VNPAY_BANK_CODE', ''),
        'return_url' => env('VNPAY_RETURN_URL') ?: rtrim((string) env('APP_URL', 'http://localhost'), '/').'/api/v1/vip/payments/vnpay/return',
        'ipn_url' => env('VNPAY_IPN_URL') ?: rtrim((string) env('APP_URL', 'http://localhost'), '/').'/api/v1/vip/payments/vnpay/ipn',
    ],

    'zalopay' => [
        'app_id' => env('ZALOPAY_APP_ID'),
        'key1' => env('ZALOPAY_KEY1'),
        'key2' => env('ZALOPAY_KEY2'),
        'create_url' => env('ZALOPAY_CREATE_URL', 'https://sb-openapi.zalopay.vn/v2/create'),
        'query_url' => env('ZALOPAY_QUERY_URL', 'https://sb-openapi.zalopay.vn/v2/query'),
        'callback_url' => env('ZALOPAY_CALLBACK_URL') ?: rtrim((string) env('APP_URL', 'http://localhost'), '/').'/api/v1/vip/payments/zalopay/callback',
    ],

    'twilio' => [
        'account_sid' => env('TWILIO_ACCOUNT_SID'),
        'auth_token' => env('TWILIO_AUTH_TOKEN'),
        'verify_service_sid' => env('TWILIO_VERIFY_SERVICE_SID'),
    ],

    'itunes' => [
        'base_url' => env('ITUNES_BASE_URL', 'https://itunes.apple.com'),
        'countries' => array_filter(array_map('trim', explode(',', env('ITUNES_COUNTRIES', 'VN,US,CN')))),
        'timeout' => env('ITUNES_API_TIMEOUT', 10),
    ],

    'nhaccuatui' => [
        'graph_base_url' => env('NCT_GRAPH_BASE_URL', 'https://graph.nhaccuatui.com'),
        'user_agent' => env('NCT_USER_AGENT', 'Melodify/1.0'),
        'timeout' => env('NCT_API_TIMEOUT', 15),
    ],

    'youtube' => [
        'base_url' => env('YOUTUBE_API_BASE_URL', 'https://www.googleapis.com/youtube/v3'),
        'api_key' => env('YOUTUBE_API_KEY'),
        'timeout' => env('YOUTUBE_API_TIMEOUT', 15),
    ],

    'lrclib' => [
        'base_url' => env('LRCLIB_BASE_URL', 'https://lrclib.net'),
        'user_agent' => env('LRCLIB_USER_AGENT', 'Melodify/1.0 (local development)'),
        'timeout' => env('LRCLIB_API_TIMEOUT', 10),
    ],

];
