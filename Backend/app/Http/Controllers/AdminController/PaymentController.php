<?php

namespace App\Http\Controllers\AdminController;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\Transaction;
use App\Models\User;
use App\Rules\PlainText;
use Illuminate\Http\Request;
use Illuminate\View\View;

class PaymentController extends Controller
{
    public function index(?Request $request = null): View
    {
        $request ??= request();
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:100', new PlainText()],
        ]);
        $search = trim((string) ($filters['q'] ?? ''));
        $query = Payment::query();

        if ($search !== '') {
            $userIds = User::query()
                ->where(function ($userQuery) use ($search): void {
                    $userQuery
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('username', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%");
                })
                ->pluck('_id')
                ->all();
            $paymentIds = Transaction::query()
                ->where(function ($transactionQuery) use ($search): void {
                    $transactionQuery
                        ->where('transaction_code', 'like', "%{$search}%")
                        ->orWhere('gateway_transaction_id', 'like', "%{$search}%")
                        ->orWhere('gateway', 'like', "%{$search}%");
                })
                ->pluck('payment_id')
                ->all();

            $query->where(function ($nestedQuery) use ($search, $userIds, $paymentIds): void {
                foreach (['payment_code', 'method', 'status', 'currency'] as $index => $field) {
                    $method = $index === 0 ? 'where' : 'orWhere';
                    $nestedQuery->{$method}($field, 'like', "%{$search}%");
                }

                if ($userIds !== []) {
                    $nestedQuery->orWhereIn('user_id', $userIds);
                }

                if ($paymentIds !== []) {
                    $nestedQuery->orWhereIn('_id', $paymentIds);
                }
            });
        }

        $payments = $query
            ->with(['user', 'subscription.plan', 'details.plan', 'transactions'])
            ->latest()
            ->paginate(15)
            ->withQueryString();
        $successStatuses = ['success', 'paid', 'completed'];
        $successfulPayments = Payment::query()->whereIn('status', $successStatuses)->get();
        $totalAmount = (float) $successfulPayments->sum(fn ($payment) => (float) ($payment->amount ?? 0));
        $pendingCount = Payment::query()->whereIn('status', ['pending', 'processing'])->count();

        return view('Admin.payments.index', compact('payments', 'successfulPayments', 'totalAmount', 'pendingCount', 'search'));
    }

    public function show(string $id): View
    {
        $payment = Payment::query()
            ->with(['user', 'subscription.plan', 'details.plan', 'transactions'])
            ->findOrFail($id);

        return view('Admin.payments.show', compact('payment'));
    }
}
