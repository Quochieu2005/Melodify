<?php

namespace Database\Seeders;

use App\Models\Admin;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);

        if (filled(env('ADMIN_PASSWORD'))) {
            Admin::query()->updateOrCreate(
                ['email' => env('ADMIN_EMAIL', 'admin@melodify.vn')],
                ['name' => 'Thái Trung Quốc Hiếu', 'slug' => 'thai-trung-quoc-hieu', 'password' => Hash::driver('bcrypt')->make(env('ADMIN_PASSWORD')), 'role' => 'super_admin', 'status' => 'active', 'is_active' => true]
            );
        }
    }
}
