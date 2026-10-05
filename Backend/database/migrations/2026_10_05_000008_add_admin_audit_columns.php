<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'mysql';

    public function up(): void
    {
        Schema::connection($this->connection)->table('logs', function (Blueprint $table): void {
            if (! Schema::connection('mysql')->hasColumn('logs', 'admin_name')) {
                $table->string('admin_name')->nullable();
            }
            if (! Schema::connection('mysql')->hasColumn('logs', 'admin_email')) {
                $table->string('admin_email')->nullable();
            }
            if (! Schema::connection('mysql')->hasColumn('logs', 'admin_role')) {
                $table->string('admin_role')->nullable();
            }
            if (! Schema::connection('mysql')->hasColumn('logs', 'description')) {
                $table->string('description')->nullable();
            }
            if (! Schema::connection('mysql')->hasColumn('logs', 'method')) {
                $table->string('method', 10)->nullable();
            }
            if (! Schema::connection('mysql')->hasColumn('logs', 'route_name')) {
                $table->string('route_name')->nullable();
            }
            if (! Schema::connection('mysql')->hasColumn('logs', 'status_code')) {
                $table->unsignedSmallInteger('status_code')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::connection($this->connection)->table('logs', function (Blueprint $table): void {
            $columns = [
                'admin_name',
                'admin_email',
                'admin_role',
                'description',
                'method',
                'route_name',
                'status_code',
            ];

            foreach ($columns as $column) {
                if (Schema::connection('mysql')->hasColumn('logs', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
