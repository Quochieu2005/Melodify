<?php

namespace App\Http\Controllers\AdminController;

use App\Http\Controllers\Controller;

class PaymentController extends Controller
{
    public function index()
    {
        return view('Admin.payments.index');
    }
}
