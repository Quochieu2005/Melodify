<?php

namespace App\Http\Controllers\AdminController;

use App\Http\Controllers\Controller;

class ArtistController extends Controller
{
    public function index()
    {
        return view('admin.artists.index');
    }
}