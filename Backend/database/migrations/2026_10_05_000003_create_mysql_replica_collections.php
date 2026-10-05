<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'mysql';

    private const COLLECTIONS = [
        'admins', 'users', 'artists', 'artist_followers', 'genres', 'albums',
        'songs', 'song_artists', 'song_genres', 'song_audio_files', 'lyrics',
        'playlists', 'playlist_songs', 'favorites', 'listening_history', 'devices',
        'song_play_events', 'comments', 'comment_likes', 'notifications',
        'subscription_plans', 'subscriptions', 'payments', 'transactions',
        'payment_details', 'logs', 'reports', 'recommendations',
    ];

    public function up(): void
    {
        foreach (self::COLLECTIONS as $collection) {
            if (Schema::connection($this->connection)->hasTable($collection)) {
                continue;
            }

            $this->createReplicaTable($collection);
        }

        Schema::connection($this->connection)->create('replica_sync_states', function (Blueprint $table): void {
            $table->id();
            $table->string('collection_name')->unique();
            $table->unsignedBigInteger('document_count')->default(0);
            $table->timestamp('last_synced_at')->nullable();
            $table->text('last_error')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::connection($this->connection)->dropIfExists('replica_sync_states');

        foreach (array_reverse(self::COLLECTIONS) as $collection) {
            Schema::connection($this->connection)->dropIfExists($collection);
        }
    }

    private function createReplicaTable(string $collection): void
    {
        Schema::connection($this->connection)->create($collection, function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->timestamps();
        });
    }
};
