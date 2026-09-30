<?php

namespace App\Http\Controllers\AdminController;

use App\Http\Controllers\Controller;

class SongController extends Controller
{
    public function index()
    {
        return view('admin.songs.index');
    }
}