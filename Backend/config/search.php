<?php

return [
    // 'atlas' uses Atlas Search (accent-insensitive, word-prefix matching).
    // 'regex' keeps the old substring match; it is also the automatic fallback
    // when the Atlas Search index is missing or not ready yet.
    'driver' => env('SEARCH_DRIVER', 'regex'),

    'index' => env('SEARCH_INDEX', 'melodify_search'),

    // collection => fields searched with autocomplete (slug is accent-free, so "tinh" finds "Tình yêu")
    'collections' => [
        'songs' => ['title', 'artist_name', 'slug'],
        'artists' => ['name', 'slug'],
        'albums' => ['title', 'slug'],
        'playlists' => ['name', 'slug'],
        'song_videos' => ['title', 'slug'],
        'users' => ['name', 'username'],
    ],
];
