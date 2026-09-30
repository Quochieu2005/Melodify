<?php

namespace App\Http\Controllers\AdminController;

use App\Http\Controllers\Controller;

class PlaylistController extends Controller
{
    public function index()
    {
        return view('admin.playlists.index');
    }
}