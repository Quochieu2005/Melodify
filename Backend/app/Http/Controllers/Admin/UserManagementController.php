<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\View\View;

class UserManagementController extends Controller
{
    public function index(Request $request): View
    {
        $search = trim($request->string('search')->toString());
        $status = $request->string('status')->toString();
        $availableStatuses = ['active', 'inactive', 'suspended'];

        if (! in_array($status, $availableStatuses, true)) {
            $status = '';
        }

        $users = User::query()
            ->select(['_id', 'name', 'email', 'username', 'status', 'email_verified_at', 'created_at'])
            ->when($search !== '', function ($query) use ($search): void {
                $pattern = "%{$search}%";

                $query->where(function ($query) use ($pattern): void {
                    $query->where('name', 'like', $pattern)
                        ->orWhere('email', 'like', $pattern)
                        ->orWhere('username', 'like', $pattern);
                });
            })
            ->when($status !== '', function ($query) use ($status): void {
                $query->where('status', $status);
            })
            ->latest()
            ->paginate(12)
            ->withQueryString();

        return view('admin.users.index', [
            'search' => $search,
            'status' => $status,
            'users' => $users,
        ]);
    }
}
