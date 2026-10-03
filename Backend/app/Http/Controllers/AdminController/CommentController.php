<?php

namespace App\Http\Controllers\AdminController;

use App\Http\Controllers\Controller;

class CommentController extends Controller
{
    public function index()
    {
        return view('Admin.comments.index');
    }
}
