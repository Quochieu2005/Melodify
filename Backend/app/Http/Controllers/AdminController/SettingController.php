<?php

namespace App\Http\Controllers\AdminController;

use App\Http\Controllers\Controller;

class SettingController extends Controller
{
    public function index()
    {
        return view('Admin.settings.index');
    }
}
