<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
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

    public function preview(Request $request): View
    {
        $search = trim($request->string('search')->toString());
        $status = $request->string('status')->toString();
        $availableStatuses = ['active', 'inactive', 'suspended'];

        if (! in_array($status, $availableStatuses, true)) {
            $status = '';
        }

        $users = collect([
            ['name' => 'Nguyễn Minh Anh', 'email' => 'minhanh@melodify.vn', 'username' => 'minhanh', 'status' => 'active', 'email_verified_at' => now()->subDays(14), 'created_at' => now()->subMonths(7)],
            ['name' => 'Trần Quốc Huy', 'email' => 'quochuy@melodify.vn', 'username' => 'huytran', 'status' => 'active', 'email_verified_at' => now()->subDays(5), 'created_at' => now()->subMonths(4)],
            ['name' => 'Lê Gia Hân', 'email' => 'giahann@melodify.vn', 'username' => 'giahann', 'status' => 'inactive', 'email_verified_at' => null, 'created_at' => now()->subMonths(2)],
            ['name' => 'Phạm Đức Long', 'email' => 'duclong@melodify.vn', 'username' => 'longpham', 'status' => 'suspended', 'email_verified_at' => now()->subMonth(), 'created_at' => now()->subYear()],
        ])
            ->when($search !== '', function ($users) use ($search) {
                $needle = mb_strtolower($search);

                return $users->filter(function (array $user) use ($needle): bool {
                    return str_contains(mb_strtolower($user['name']), $needle)
                        || str_contains(mb_strtolower($user['email']), $needle)
                        || str_contains(mb_strtolower($user['username']), $needle);
                });
            })
            ->when($status !== '', fn ($users) => $users->where('status', $status))
            ->map(fn (array $user) => (object) $user)
            ->values();

        return view('admin.users.index', [
            'preview' => true,
            'search' => $search,
            'status' => $status,
            'users' => new LengthAwarePaginator(
                $users,
                $users->count(),
                12,
                1,
                ['path' => route('admin.users.preview')],
            ),
        ]);
    }
}
