<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'mysql';

    public function up(): void
    {
        Schema::table('admins', function (Blueprint $table): void {
            $table->string('avatar_public_id')->nullable();
            $table->json('notification_preferences')->nullable();
            $table->json('appearance_preferences')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('admins', function (Blueprint $table): void {
            $table->dropColumn([
                'avatar_public_id',
                'notification_preferences',
                'appearance_preferences',
            ]);
        });
    }
};
