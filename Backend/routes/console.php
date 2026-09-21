<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Artisan;
use App\Mail\TestEmail;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('mail:test {email}', function (string $email) {
    Mail::to($email)->send(new TestEmail($email));
    $this->info("Email sent to {$email}");
})->purpose('Send a real email to verify SMTP configuration');
