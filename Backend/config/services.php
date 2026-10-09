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

    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => env('GOOGLE_REDIRECT_URI'),
    ],

    'facebook' => [
        'client_id' => env('FACEBOOK_CLIENT_ID'),
        'client_secret' => env('FACEBOOK_CLIENT_SECRET'),
        'redirect' => env('FACEBOOK_REDIRECT_URI'),
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

    'lrclib' => [
        'base_url' => env('LRCLIB_BASE_URL', 'https://lrclib.net'),
        'user_agent' => env('LRCLIB_USER_AGENT', 'Melodify/1.0 (local development)'),
        'timeout' => env('LRCLIB_API_TIMEOUT', 10),
    ],

];
