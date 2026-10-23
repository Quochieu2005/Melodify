<?php

namespace App\Services;

use RuntimeException;

class SocialAuthException extends RuntimeException
{
    public function __construct(string $message, public readonly int $status = 422)
    {
        parent::__construct($message);
    }
}
