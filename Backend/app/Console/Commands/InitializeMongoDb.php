<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class InitializeMongoDb extends Command
{
    protected $signature = 'mongodb:initialize';

    protected $description = 'Create Melodify MongoDB collections and indexes';

    public function handle(): int
    {
        $connection = DB::connection('mongodb');
        $connection->command(['ping' => 1]);

        $database = $connection->getClient()->selectDatabase(
            config('database.connections.mongodb.database', 'melodify')
        );

        $collections = [
            'admins', 'banners', 'users', 'artists', 'artist_followers', 'genres', 'albums', 'songs',
            'song_artists', 'song_genres', 'song_audio_files', 'lyrics', 'playlists',
            'playlist_songs', 'favorites', 'song_shares', 'listening_history', 'devices', 'song_play_events',
            'comments', 'comment_likes', 'notifications', 'subscription_plans', 'subscriptions',
            'payments', 'transactions', 'payment_details', 'logs', 'reports', 'recommendations',
            'topics', 'topic_songs', 'media_assets',
        ];

        $existing = [];
        foreach ($database->listCollections() as $collectionInfo) {
            $existing[] = $collectionInfo->getName();
        }

        foreach ($collections as $collection) {
            if (! in_array($collection, $existing, true)) {
                $database->createCollection($collection);
                $this->line("Created collection: {$collection}");
            }
        }

        $indexes = [
            'admins' => [[['slug' => 1], ['unique' => true]], [['email' => 1], ['unique' => true]]],
            'banners' => [[['slug' => 1], ['unique' => true]], [['sort_order' => 1], []], [['status' => 1], []]],
            'users' => [[['slug' => 1], ['unique' => true]], [['email' => 1], ['unique' => true]], [['username' => 1], ['unique' => true, 'sparse' => true]], [['is_premium' => 1], []]],
            'artists' => [[['slug' => 1], ['unique' => true]], [['user_id' => 1], ['unique' => true, 'sparse' => true]]],
            'genres' => [[['slug' => 1], ['unique' => true]], [['name' => 1], ['unique' => true]]],
            'topics' => [[['slug' => 1], ['unique' => true]], [['sort_order' => 1], []], [['status' => 1], []]],
            'albums' => [[['slug' => 1], ['unique' => true]], [['artist_id' => 1], []]],
            'songs' => [[['slug' => 1], ['unique' => true]], [['album_id' => 1], []], [['status' => 1], []], [['external_source' => 1, 'external_id' => 1], ['unique' => true, 'sparse' => true]]],
            'song_artists' => [[['song_id' => 1, 'artist_id' => 1, 'artist_role' => 1], ['unique' => true]]],
            'song_genres' => [[['song_id' => 1, 'genre_id' => 1], ['unique' => true]]],
            'topic_songs' => [[['topic_id' => 1, 'song_id' => 1], ['unique' => true]], [['topic_id' => 1, 'position' => 1], []]],
            'lyrics' => [[['song_id' => 1, 'language' => 1], ['unique' => true]]],
            'playlists' => [[['slug' => 1], ['unique' => true]], [['user_id' => 1], []], [['sort_order' => 1], []], [['status' => 1], []]],
            'media_assets' => [[['public_id' => 1], ['unique' => true]], [['folder' => 1], []], [['created_at' => -1], []]],
            'playlist_songs' => [[['playlist_id' => 1, 'song_id' => 1], ['unique' => true]], [['playlist_id' => 1, 'position' => 1], []]],
            'favorites' => [[['user_id' => 1, 'song_id' => 1], ['unique' => true]]],
            'song_shares' => [[['song_id' => 1, 'created_at' => -1], []], [['visitor_id' => 1, 'created_at' => -1], []]],
            'listening_history' => [[['user_id' => 1, 'song_id' => 1], ['unique' => true]]],
            'devices' => [[['user_id' => 1, 'device_uuid' => 1], ['unique' => true]]],
            'song_play_events' => [[['song_id' => 1, 'started_at' => -1], []], [['song_id' => 1, 'visitor_id' => 1, 'started_at' => -1], []]],
            'comment_likes' => [[['user_id' => 1, 'comment_id' => 1], ['unique' => true]]],
            'subscription_plans' => [[['slug' => 1], ['unique' => true]], [['code' => 1], ['unique' => true]]],
            'payments' => [[['payment_code' => 1], ['unique' => true]]],
            'transactions' => [[['transaction_code' => 1], ['unique' => true]], [['gateway_transaction_id' => 1], ['unique' => true, 'sparse' => true]]],
            'recommendations' => [[['user_id' => 1, 'song_id' => 1], ['unique' => true]]],
        ];

        foreach ($indexes as $collection => $collectionIndexes) {
            foreach ($collectionIndexes as [$keys, $options]) {
                $database->selectCollection($collection)->createIndex($keys, $options);
            }
        }

        $this->info('Melodify MongoDB initialized successfully.');
        $this->info('Database: '.$database->getDatabaseName());
        $collectionCount = 0;
        foreach ($database->listCollections() as $_) {
            $collectionCount++;
        }
        $this->info('Collections: '.$collectionCount);

        return self::SUCCESS;
    }
}
