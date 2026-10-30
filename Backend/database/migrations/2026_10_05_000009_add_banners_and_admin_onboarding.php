<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'mysql';

    public function up(): void
    {
        $schema = Schema::connection($this->connection);

        if ($schema->hasTable('admins')) {
            $schema->table('admins', function (Blueprint $table) use ($schema): void {
                if (! $schema->hasColumn('admins', 'must_change_password')) {
                    $table->boolean('must_change_password')->default(false);
                }

                if (! $schema->hasColumn('admins', 'credentials_sent_at')) {
                    $table->dateTime('credentials_sent_at')->nullable();
                }
            });
        }

        if (! $schema->hasTable('banners')) {
            $schema->create('banners', function (Blueprint $table): void {
                $table->bigIncrements('id');
                $table->string('title', 160);
                $table->string('slug', 180)->unique();
                $table->string('image_url', 500);
                $table->string('image_public_id', 255)->nullable();
                $table->string('link_url', 500)->nullable();
                $table->unsignedInteger('sort_order')->default(0);
                $table->string('status', 30)->default('active');
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        $schema = Schema::connection($this->connection);
        $schema->dropIfExists('banners');

        if ($schema->hasTable('admins')) {
            $schema->table('admins', function (Blueprint $table) use ($schema): void {
                if ($schema->hasColumn('admins', 'must_change_password')) {
                    $table->dropColumn('must_change_password');
                }

                if ($schema->hasColumn('admins', 'credentials_sent_at')) {
                    $table->dropColumn('credentials_sent_at');
                }
            });
        }
    }
};
