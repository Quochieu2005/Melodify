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

        if (! $schema->hasTable('topics')) {
            $schema->create('topics', function (Blueprint $table): void {
                $table->bigIncrements('id');
                $table->string('name', 150);
                $table->string('slug', 180)->unique();
                $table->text('description')->nullable();
                $table->string('image_url', 500)->nullable();
                $table->string('image_public_id', 255)->nullable();
                $table->unsignedInteger('sort_order')->default(0);
                $table->string('status', 30)->default('active');
                $table->timestamps();
            });
        }

        if (! $schema->hasTable('media_assets')) {
            $schema->create('media_assets', function (Blueprint $table): void {
                $table->bigIncrements('id');
                $table->string('public_id', 255)->unique();
                $table->string('secure_url', 500);
                $table->string('folder', 120)->default('melodify');
                $table->string('original_name', 255)->nullable();
                $table->unsignedInteger('width')->nullable();
                $table->unsignedInteger('height')->nullable();
                $table->string('created_by_admin_id', 80)->nullable();
                $table->timestamps();
            });
        }

        $this->addColumnIfMissing($schema, 'genres', 'image_url', fn (Blueprint $table) => $table->string('image_url', 500)->nullable());
        $this->addColumnIfMissing($schema, 'genres', 'image_public_id', fn (Blueprint $table) => $table->string('image_public_id', 255)->nullable());
        $this->addColumnIfMissing($schema, 'genres', 'sort_order', fn (Blueprint $table) => $table->unsignedInteger('sort_order')->default(0));
        $this->addColumnIfMissing($schema, 'playlists', 'cover_public_id', fn (Blueprint $table) => $table->string('cover_public_id', 255)->nullable());
        $this->addColumnIfMissing($schema, 'playlists', 'sort_order', fn (Blueprint $table) => $table->unsignedInteger('sort_order')->default(0));
        $this->addColumnIfMissing($schema, 'playlists', 'status', fn (Blueprint $table) => $table->string('status', 30)->default('active'));
    }

    public function down(): void
    {
        $schema = Schema::connection($this->connection);
        $schema->dropIfExists('media_assets');
        $schema->dropIfExists('topics');

        foreach (['genres' => ['image_url', 'image_public_id', 'sort_order'], 'playlists' => ['cover_public_id', 'sort_order', 'status']] as $tableName => $columns) {
            if (! $schema->hasTable($tableName)) {
                continue;
            }

            foreach ($columns as $column) {
                if ($schema->hasColumn($tableName, $column)) {
                    $schema->table($tableName, fn (Blueprint $table) => $table->dropColumn($column));
                }
            }
        }
    }

    private function addColumnIfMissing($schema, string $tableName, string $columnName, callable $definition): void
    {
        if (! $schema->hasTable($tableName) || $schema->hasColumn($tableName, $columnName)) {
            return;
        }

        $schema->table($tableName, $definition);
    }
};
