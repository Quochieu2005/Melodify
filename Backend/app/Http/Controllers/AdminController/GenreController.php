<?php

namespace App\Http\Controllers\AdminController;

use App\Http\Controllers\Controller;

class GenreController extends Controller
{
    public function index()
    {
        return view('admin.genres.index');
    }
}