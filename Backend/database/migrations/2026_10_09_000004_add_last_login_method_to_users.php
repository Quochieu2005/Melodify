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

        if (! $schema->hasTable('users') || $schema->hasColumn('users', 'last_login_method')) {
            return;
        }

        $schema->table('users', function (Blueprint $table): void {
            $table->string('last_login_method', 30)->nullable()->after('last_login_at');
        });
    }

    public function down(): void
    {
        $schema = Schema::connection($this->connection);

        if ($schema->hasTable('users') && $schema->hasColumn('users', 'last_login_method')) {
            $schema->table('users', function (Blueprint $table): void {
                $table->dropColumn('last_login_method');
            });
        }
    }
};
