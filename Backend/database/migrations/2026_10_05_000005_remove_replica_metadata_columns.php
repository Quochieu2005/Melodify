<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'mysql';

    private const TABLES = [
        'admins', 'users', 'artists', 'artist_followers', 'genres', 'albums',
        'songs', 'song_artists', 'song_genres', 'song_audio_files', 'lyrics',
        'playlists', 'playlist_songs', 'favorites', 'listening_history', 'devices',
        'song_play_events', 'comments', 'comment_likes', 'notifications',
        'subscription_plans', 'subscriptions', 'payments', 'transactions',
        'payment_details', 'logs', 'reports', 'recommendations',
    ];

    public function up(): void
    {
        foreach (self::TABLES as $tableName) {
            Schema::table($tableName, function (Blueprint $table) use ($tableName): void {
                if (Schema::hasColumn($tableName, 'mongo_id')) {
                    $table->dropUnique(['mongo_id']);
                }

                if (Schema::hasColumn($tableName, 'last_seen_at')) {
                    $table->dropIndex(['last_seen_at']);
                }

                if (Schema::hasColumn($tableName, 'synced_at')) {
                    $table->dropIndex(['synced_at']);
                }

                $columns = array_filter([
                    Schema::hasColumn($tableName, 'mongo_id') ? 'mongo_id' : null,
                    Schema::hasColumn($tableName, 'document') ? 'document' : null,
                    Schema::hasColumn($tableName, 'source_updated_at') ? 'source_updated_at' : null,
                    Schema::hasColumn($tableName, 'last_seen_at') ? 'last_seen_at' : null,
                    Schema::hasColumn($tableName, 'synced_at') ? 'synced_at' : null,
                ]);

                if ($columns !== []) {
                    $table->dropColumn($columns);
                }
            });
        }

        Schema::dropIfExists('replica_sync_states');
    }

    public function down(): void
    {
        // Replica metadata is deliberately not restored. MySQL is a schema
        // reference database, not a second synchronization store.
    }
};
