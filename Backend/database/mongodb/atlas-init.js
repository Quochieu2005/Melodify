// Run: mongosh "mongodb+srv://..." --file atlas-init.js

db = db.getSiblingDB("melodify");

const collections = [
    "admins",
    "users",
    "artists",
    "artist_followers",
    "genres",
    "albums",
    "songs",
    "song_artists",
    "song_genres",
    "song_audio_files",
    "lyrics",
    "playlists",
    "playlist_songs",
    "favorites",
    "listening_history",
    "devices",
    "song_play_events",
    "comments",
    "comment_likes",
    "notifications",
    "subscription_plans",
    "subscriptions",
    "payments",
    "transactions",
    "payment_details",
    "logs",
    "reports",
    "recommendations",
];

const existing = db.getCollectionNames();
collections.forEach((name) => {
    if (!existing.includes(name)) db.createCollection(name);
});

const indexes = {
    admins: [
        [{ slug: 1 }, { unique: true }],
        [{ email: 1 }, { unique: true }],
        [{ status: 1 }, {}],
    ],
    users: [
        [{ slug: 1 }, { unique: true }],
        [{ email: 1 }, { unique: true }],
        [{ username: 1 }, { unique: true, sparse: true }],
        [{ status: 1 }, {}],
    ],
    artists: [
        [{ slug: 1 }, { unique: true }],
        [{ user_id: 1 }, { unique: true, sparse: true }],
        [{ status: 1 }, {}],
    ],
    artist_followers: [
        [{ user_id: 1, artist_id: 1 }, { unique: true }],
        [{ artist_id: 1 }, {}],
    ],
    genres: [
        [{ slug: 1 }, { unique: true }],
        [{ name: 1 }, { unique: true }],
    ],
    albums: [
        [{ slug: 1 }, { unique: true }],
        [{ artist_id: 1 }, {}],
        [{ release_date: -1 }, {}],
    ],
    songs: [
        [{ slug: 1 }, { unique: true }],
        [{ album_id: 1 }, {}],
        [{ title: 1 }, {}],
        [{ status: 1 }, {}],
        [{ release_date: -1 }, {}],
    ],
    song_artists: [
        [{ song_id: 1, artist_id: 1, artist_role: 1 }, { unique: true }],
        [{ artist_id: 1 }, {}],
    ],
    song_genres: [
        [{ song_id: 1, genre_id: 1 }, { unique: true }],
        [{ genre_id: 1 }, {}],
    ],
    song_audio_files: [
        [{ song_id: 1 }, {}],
        [{ status: 1 }, {}],
    ],
    lyrics: [[{ song_id: 1, language: 1 }, { unique: true }]],
    playlists: [
        [{ slug: 1 }, { unique: true }],
        [{ user_id: 1 }, {}],
        [{ visibility: 1 }, {}],
    ],
    playlist_songs: [
        [{ playlist_id: 1, song_id: 1 }, { unique: true }],
        [{ song_id: 1 }, {}],
        [{ playlist_id: 1, position: 1 }, {}],
    ],
    favorites: [
        [{ user_id: 1, song_id: 1 }, { unique: true }],
        [{ song_id: 1 }, {}],
    ],
    listening_history: [
        [{ user_id: 1, song_id: 1 }, { unique: true }],
        [{ user_id: 1, last_played_at: -1 }, {}],
    ],
    devices: [
        [{ user_id: 1, device_uuid: 1 }, { unique: true }],
        [{ last_active_at: -1 }, {}],
    ],
    song_play_events: [
        [{ user_id: 1 }, {}],
        [{ song_id: 1 }, {}],
        [{ song_id: 1, started_at: -1 }, {}],
    ],
    comments: [
        [{ song_id: 1 }, {}],
        [{ parent_id: 1 }, {}],
        [{ created_at: -1 }, {}],
    ],
    comment_likes: [
        [{ user_id: 1, comment_id: 1 }, { unique: true }],
        [{ comment_id: 1 }, {}],
    ],
    notifications: [
        [{ user_id: 1, is_read: 1 }, {}],
        [{ created_at: -1 }, {}],
    ],
    subscription_plans: [
        [{ slug: 1 }, { unique: true }],
        [{ code: 1 }, { unique: true }],
    ],
    subscriptions: [
        [{ user_id: 1, status: 1 }, {}],
        [{ plan_id: 1 }, {}],
        [{ end_date: 1 }, {}],
    ],
    payments: [
        [{ payment_code: 1 }, { unique: true }],
        [{ user_id: 1 }, {}],
        [{ status: 1 }, {}],
    ],
    transactions: [
        [{ transaction_code: 1 }, { unique: true }],
        [{ gateway_transaction_id: 1 }, { unique: true, sparse: true }],
        [{ payment_id: 1 }, {}],
    ],
    payment_details: [
        [{ payment_id: 1 }, {}],
        [{ plan_id: 1 }, {}],
    ],
    logs: [
        [{ user_id: 1 }, {}],
        [{ admin_id: 1 }, {}],
        [{ target_type: 1, target_id: 1 }, {}],
        [{ created_at: -1 }, {}],
    ],
    reports: [
        [{ reporter_user_id: 1 }, {}],
        [{ target_type: 1, target_id: 1 }, {}],
        [{ status: 1 }, {}],
    ],
    recommendations: [
        [{ user_id: 1, song_id: 1 }, { unique: true }],
        [{ user_id: 1, score: -1 }, {}],
        [{ expires_at: 1 }, {}],
    ],
};

Object.entries(indexes).forEach(([name, collectionIndexes]) => {
    collectionIndexes.forEach(([keys, options]) =>
        db.getCollection(name).createIndex(keys, options),
    );
});

print(`Melodify database initialized: ${db.getName()}`);
print(`Collections: ${db.getCollectionNames().length}`);
