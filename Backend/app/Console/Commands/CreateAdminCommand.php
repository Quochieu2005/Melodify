<?php

namespace App\Console\Commands;

use App\Models\Admin;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

class CreateAdminCommand extends Command
{
    protected $signature = 'admin:create {--name=} {--email=} {--role=admin}';

    protected $description = 'Create or update a Melodify administrator account';

    public function handle(): int
    {
        $name = $this->option('name') ?: $this->ask('Tên quản trị viên', 'Melodify Admin');
        $email = $this->option('email') ?: $this->ask('Email');
        $password = $this->secret('Mật khẩu (tối thiểu 8 ký tự)');
        $role = $this->option('role');

        $validator = Validator::make(compact('name', 'email', 'password', 'role'), [
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email'],
            'password' => ['required', Password::min(8)],
            'role' => ['required', 'in:super_admin,admin'],
        ]);

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $error) {
                $this->error($error);
            }

            return self::FAILURE;
        }

        $email = Str::lower(trim($email));
        $admin = Admin::query()->where('email', $email)->first() ?? new Admin(['email' => $email]);
        $admin->fill(['name' => $name, 'password' => Hash::driver('bcrypt')->make($password), 'role' => $role, 'status' => 'active', 'is_active' => true]);
        // The slug index is unique, so every admin needs its own slug (a missing one counts as null and collides).
        if (blank($admin->slug)) {
            $admin->slug = $this->uniqueSlug($name);
        }
        $admin->save();

        $this->info('Tài khoản quản trị đã sẵn sàng.');

        return self::SUCCESS;
    }

    private function uniqueSlug(string $name): string
    {
        $base = Str::slug($name) ?: 'admin';
        $slug = $base;

        for ($suffix = 2; Admin::query()->where('slug', $slug)->exists(); $suffix++) {
            $slug = "{$base}-{$suffix}";
        }

        return $slug;
    }
}
