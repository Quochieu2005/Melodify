<?php

namespace App\Console\Commands;

use App\Models\Admin;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

class CreateAdminCommand extends Command
{
    protected $signature = 'admin:create {--name=} {--email=}';

    protected $description = 'Create or update a Melodify administrator account';

    public function handle(): int
    {
        $name = $this->option('name') ?: $this->ask('Tên quản trị viên', 'Melodify Admin');
        $email = $this->option('email') ?: $this->ask('Email');
        $password = $this->secret('Mật khẩu (tối thiểu 8 ký tự)');

        $validator = Validator::make(compact('name', 'email', 'password'), [
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email'],
            'password' => ['required', Password::min(8)],
        ]);

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $error) {
                $this->error($error);
            }

            return self::FAILURE;
        }

        Admin::query()->updateOrCreate(
            ['email' => $email],
            ['name' => $name, 'password' => Hash::make($password), 'role' => 'super_admin', 'is_active' => true]
        );

        $this->info('Tài khoản quản trị đã sẵn sàng.');

        return self::SUCCESS;
    }
}
