<?php

namespace App\Http\Controllers\AdminController;

use App\Http\Controllers\Controller;

class SubscriptionController extends Controller
{
    public function index()
    {
        return view('admin.subscriptions.index');
    }
}