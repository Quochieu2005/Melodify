<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'mysql';

    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            if (! Schema::hasColumn('users', 'is_premium')) {
                $table->unsignedTinyInteger('is_premium')->nullable()->default(0);
            }
        });

        Schema::table('subscription_plans', function (Blueprint $table): void {
            if (! Schema::hasColumn('subscription_plans', 'billing_cycle')) {
                $table->string('billing_cycle')->nullable()->default('monthly');
            }

            if (! Schema::hasColumn('subscription_plans', 'billing_months')) {
                $table->unsignedInteger('billing_months')->nullable()->default(1);
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            if (Schema::hasColumn('users', 'is_premium')) {
                $table->dropColumn('is_premium');
            }
        });

        Schema::table('subscription_plans', function (Blueprint $table): void {
            foreach (['billing_cycle', 'billing_months'] as $column) {
                if (Schema::hasColumn('subscription_plans', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
