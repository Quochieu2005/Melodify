<?php

return [
    'cloud_name' => env('CLOUDINARY_CLOUD_NAME'),
    'api_key' => env('CLOUDINARY_API_KEY'),
    'api_secret' => env('CLOUDINARY_API_SECRET'),
    'folder' => env('CLOUDINARY_FOLDER', 'melodify'),
    'admin_folder' => env('CLOUDINARY_ADMIN_FOLDER', 'admin'),
    'banner_folder' => env('CLOUDINARY_BANNER_FOLDER', 'banner'),
    'artist_folder' => env('CLOUDINARY_ARTIST_FOLDER', 'melodify/artists'),
];
