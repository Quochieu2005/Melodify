<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'mysql';

    public function up(): void
    {
        Schema::table('sessions', function (Blueprint $table): void {
            $table->string('user_id', 64)->nullable()->change();
        });
    }

    public function down(): void
    {
        // MongoDB ObjectIds cannot be safely converted back to numeric IDs.
    }
};
