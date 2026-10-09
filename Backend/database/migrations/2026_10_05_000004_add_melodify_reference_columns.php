<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'mysql';

    /** @var array<string, array<string, string>> */
    private const COLUMNS = [
        'users' => ['username' => 'string', 'slug' => 'string', 'phone' => 'string', 'avatar_url' => 'string', 'date_of_birth' => 'date', 'gender' => 'string', 'status' => 'string', 'last_login_at' => 'datetime', 'last_login_method' => 'string'],
        'admins' => ['name' => 'string', 'email' => 'string', 'slug' => 'string', 'avatar' => 'string', 'role' => 'string', 'status' => 'string', 'is_active' => 'boolean'],
        'artists' => ['user_id' => 'string', 'name' => 'string', 'slug' => 'string', 'bio' => 'text', 'avatar_url' => 'string', 'verified' => 'boolean', 'status' => 'string'],
        'artist_followers' => ['user_id' => 'string', 'artist_id' => 'string'],
        'genres' => ['name' => 'string', 'slug' => 'string', 'description' => 'text', 'status' => 'string'],
        'albums' => ['title' => 'string', 'slug' => 'string', 'artist_id' => 'string', 'release_date' => 'date', 'cover_url' => 'string', 'status' => 'string'],
        'songs' => ['title' => 'string', 'slug' => 'string', 'album_id' => 'string', 'release_date' => 'date', 'duration_seconds' => 'integer', 'explicit' => 'boolean', 'status' => 'string', 'cover_url' => 'string', 'created_by_artist_id' => 'string', 'created_by_admin_id' => 'string'],
        'song_artists' => ['song_id' => 'string', 'artist_id' => 'string', 'artist_role' => 'string'],
        'song_genres' => ['song_id' => 'string', 'genre_id' => 'string'],
        'song_audio_files' => ['song_id' => 'string', 'file_url' => 'string', 'file_type' => 'string', 'bitrate' => 'integer', 'file_size' => 'integer', 'duration_seconds' => 'integer', 'premium_only' => 'boolean', 'status' => 'string'],
        'lyrics' => ['song_id' => 'string', 'language' => 'string', 'content' => 'text', 'is_synced' => 'boolean'],
        'playlists' => ['user_id' => 'string', 'name' => 'string', 'slug' => 'string', 'description' => 'text', 'cover_url' => 'string', 'is_system' => 'boolean', 'visibility' => 'string', 'created_by_admin_id' => 'string'],
        'playlist_songs' => ['playlist_id' => 'string', 'song_id' => 'string', 'position' => 'integer', 'added_by_user_id' => 'string', 'added_by_admin_id' => 'string'],
        'favorites' => ['user_id' => 'string', 'song_id' => 'string'],
        'song_shares' => ['song_id' => 'string', 'visitor_id' => 'string', 'source' => 'string'],
        'listening_history' => ['user_id' => 'string', 'song_id' => 'string', 'started_at' => 'datetime', 'last_played_at' => 'datetime', 'play_count' => 'integer', 'total_duration_seconds' => 'integer'],
        'devices' => ['user_id' => 'string', 'device_uuid' => 'string', 'device_name' => 'string', 'device_type' => 'string', 'platform' => 'string', 'app_version' => 'string', 'last_active_at' => 'datetime'],
        'song_play_events' => ['user_id' => 'string', 'song_id' => 'string', 'device_id' => 'string', 'started_at' => 'datetime', 'ended_at' => 'datetime', 'listened_seconds' => 'integer', 'completion_percent' => 'decimal'],
        'comments' => ['user_id' => 'string', 'song_id' => 'string', 'parent_id' => 'string', 'content' => 'text', 'status' => 'string'],
        'comment_likes' => ['user_id' => 'string', 'comment_id' => 'string'],
        'notifications' => ['user_id' => 'string', 'type' => 'string', 'title' => 'string', 'body' => 'text', 'data' => 'json', 'is_read' => 'boolean', 'read_at' => 'datetime'],
        'subscription_plans' => ['name' => 'string', 'code' => 'string', 'slug' => 'string', 'price' => 'decimal', 'duration_days' => 'integer', 'description' => 'text', 'offline_download' => 'boolean', 'ads_enabled' => 'boolean', 'unlimited_skip' => 'boolean', 'status' => 'string'],
        'subscriptions' => ['user_id' => 'string', 'plan_id' => 'string', 'status' => 'string', 'start_date' => 'date', 'end_date' => 'date', 'auto_renew' => 'boolean'],
        'payments' => ['user_id' => 'string', 'subscription_id' => 'string', 'payment_code' => 'string', 'amount' => 'decimal', 'currency' => 'string', 'method' => 'string', 'status' => 'string', 'paid_at' => 'datetime'],
        'transactions' => ['payment_id' => 'string', 'transaction_code' => 'string', 'gateway_transaction_id' => 'string', 'gateway' => 'string', 'response' => 'json', 'status' => 'string', 'amount' => 'decimal'],
        'payment_details' => ['payment_id' => 'string', 'plan_id' => 'string', 'quantity' => 'integer', 'unit_price' => 'decimal', 'subtotal' => 'decimal'],
        'logs' => ['user_id' => 'string', 'admin_id' => 'string', 'action' => 'string', 'target_type' => 'string', 'target_id' => 'string', 'metadata' => 'json', 'ip_address' => 'string', 'user_agent' => 'text'],
        'reports' => ['reporter_user_id' => 'string', 'target_type' => 'string', 'target_id' => 'string', 'reason' => 'string', 'description' => 'text', 'status' => 'string', 'reviewed_by_admin_id' => 'string', 'reviewed_at' => 'datetime'],
        'recommendations' => ['user_id' => 'string', 'song_id' => 'string', 'score' => 'decimal', 'generated_at' => 'datetime', 'expires_at' => 'datetime', 'reason' => 'string'],
    ];

    public function up(): void
    {
        foreach (self::COLUMNS as $tableName => $columns) {
            Schema::table($tableName, function (Blueprint $table) use ($tableName, $columns): void {
                foreach ($columns as $column => $type) {
                    if (Schema::hasColumn($tableName, $column)) {
                        continue;
                    }

                    match ($type) {
                        'boolean' => $table->boolean($column)->nullable(),
                        'date' => $table->date($column)->nullable(),
                        'datetime' => $table->dateTime($column)->nullable(),
                        'decimal' => $table->decimal($column, 15, 4)->nullable(),
                        'integer' => $table->integer($column)->nullable(),
                        'json' => $table->json($column)->nullable(),
                        'text' => $table->text($column)->nullable(),
                        default => $table->string($column)->nullable(),
                    };
                }
            });
        }
    }

    public function down(): void
    {
        // These columns form a reference schema for local inspection and are
        // intentionally retained when rolling back other application changes.
    }
};
