<?php

namespace App\Http\Controllers\AdminController;

use App\Http\Controllers\Controller;

class ReportController extends Controller
{
    public function index()
    {
        return view('admin.reports.index');
    }
}