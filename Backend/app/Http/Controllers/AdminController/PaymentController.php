<?php

namespace App\Http\Controllers\AdminController;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use Illuminate\View\View;

class PaymentController extends Controller
{
    public function index(): View
    {
        $payments = Payment::query()->with(['user', 'details.plan'])->latest()->paginate(15);

        return view('Admin.payments.index', compact('payments'));
    }
}
