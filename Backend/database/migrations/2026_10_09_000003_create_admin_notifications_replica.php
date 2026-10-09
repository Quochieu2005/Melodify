<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'mysql';

    public function up(): void
    {
        if (Schema::connection($this->connection)->hasTable('admin_notifications')) {
            return;
        }

        Schema::connection($this->connection)->create('admin_notifications', function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->string('admin_id')->nullable()->index();
            $table->string('key')->index();
            $table->string('type')->default('system');
            $table->string('title');
            $table->text('body');
            $table->string('action_url')->nullable();
            $table->boolean('is_read')->default(false)->index();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::connection($this->connection)->dropIfExists('admin_notifications');
    }
};
