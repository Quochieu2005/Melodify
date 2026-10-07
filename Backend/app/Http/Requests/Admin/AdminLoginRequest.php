<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class AdminLoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email' => ['bail', 'required', 'string', 'email', 'max:160'],
            'password' => ['required', 'string', 'max:72'],
            'remember' => ['nullable', 'boolean'],
        ];
    }
}
