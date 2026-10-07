<?php

namespace App\Http\Controllers\AdminController;

use App\Http\Controllers\Controller;
use App\Models\Admin;
use App\Models\Log;
use App\Rules\PlainText;
use Illuminate\Http\Request;
use Illuminate\View\View;

class LogController extends Controller
{
    public function index(Request $request): View
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100', new PlainText()],
            'admin_id' => ['nullable', 'string', 'max:64', 'regex:/^[A-Za-z0-9_-]+$/'],
            'date_from' => ['nullable', 'date_format:Y-m-d'],
            'date_to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:date_from'],
        ]);

        $logs = Log::query()
            ->when($filters['search'] ?? null, function ($query, string $search): void {
                $query->where(function ($nestedQuery) use ($search): void {
                    $nestedQuery
                        ->where('admin_name', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%")
                        ->orWhere('action', 'like', "%{$search}%")
                        ->orWhere('ip_address', 'like', "%{$search}%");
                });
            })
            ->when($filters['admin_id'] ?? null, fn ($query, string $adminId) => $query->where('admin_id', $adminId))
            ->when($filters['date_from'] ?? null, fn ($query, string $date) => $query->where('created_at', '>=', now()->parse($date)->startOfDay()))
            ->when($filters['date_to'] ?? null, fn ($query, string $date) => $query->where('created_at', '<=', now()->parse($date)->endOfDay()))
            ->latest('created_at')
            ->paginate(20)
            ->withQueryString();

        $admins = Admin::query()
            ->orderBy('name')
            ->get()
            ->map(fn (Admin $admin): array => [
                'id' => (string) $admin->getKey(),
                'name' => (string) ($admin->name ?? $admin->email),
                'role' => (string) ($admin->role ?? 'admin'),
            ]);

        return view('Admin.logs.index', compact('logs', 'admins', 'filters'));
    }
}
