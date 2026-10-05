<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Initial credentials for newly created admin accounts
    |--------------------------------------------------------------------------
    |
    | The password is never stored in plain text. It is only used when a
    | super admin creates or re-sends credentials for a small admin account.
    |
    */
    'initial_password' => env('ADMIN_INITIAL_PASSWORD') ?: '1234567890',
];
