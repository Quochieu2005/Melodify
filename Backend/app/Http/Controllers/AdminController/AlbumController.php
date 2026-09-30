<?php

namespace App\Http\Controllers\AdminController;

use App\Http\Controllers\Controller;

class AlbumController extends Controller
{
    public function index()
    {
        return view('admin.albums.index');
    }
}