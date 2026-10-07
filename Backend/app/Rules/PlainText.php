<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class PlainText implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (is_string($value) && $value !== strip_tags($value)) {
            $fail('Trường :attribute không được chứa HTML hoặc mã script.');
        }
    }
}
