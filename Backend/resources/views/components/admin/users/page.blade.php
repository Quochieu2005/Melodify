@props(['users', 'search', 'status'])

<section class="mx-auto flex w-full max-w-6xl flex-col gap-6">
    <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
            <p class="text-sm font-medium text-emerald-700">Quản trị người dùng</p>
            <h1 class="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Người dùng</h1>
            <p class="mt-2 text-sm leading-6 text-slate-500">Tìm kiếm và theo dõi tài khoản người nghe trên Melodify.</p>
        </div>
        <p class="text-sm text-slate-500"><span class="font-semibold text-slate-950">{{ $users->total() }}</span> tài khoản</p>
    </div>

    <form class="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row" method="GET" action="{{ route('admin.users.index') }}">
        <div class="relative flex-1">
            <svg aria-hidden="true" class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2" />
                <path d="m20 20-4-4" stroke="currentColor" stroke-linecap="round" stroke-width="2" />
            </svg>
            <label class="sr-only" for="search">Tìm người dùng</label>
            <input class="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" id="search" name="search" placeholder="Tìm theo tên, email hoặc username" type="search" value="{{ $search }}">
        </div>

        <label class="sr-only" for="status">Trạng thái</label>
        <select class="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" id="status" name="status">
            <option value="">Tất cả trạng thái</option>
            <option value="active" @selected($status === 'active')>Đang hoạt động</option>
            <option value="inactive" @selected($status === 'inactive')>Không hoạt động</option>
            <option value="suspended" @selected($status === 'suspended')>Đã tạm khóa</option>
        </select>

        <button class="h-10 rounded-lg bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-950/15" type="submit">Áp dụng</button>
    </form>

    <div class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div class="overflow-x-auto">
            <table class="w-full min-w-[760px] text-left text-sm">
                <thead class="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                        <th class="px-5 py-3 font-medium">Người dùng</th>
                        <th class="px-5 py-3 font-medium">Username</th>
                        <th class="px-5 py-3 font-medium">Xác thực email</th>
                        <th class="px-5 py-3 font-medium">Trạng thái</th>
                        <th class="px-5 py-3 font-medium">Tham gia</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    @forelse ($users as $user)
                        @php($displayName = $user->name ?: $user->username ?: 'Chưa đặt tên')
                        <tr class="transition hover:bg-slate-50/80">
                            <td class="px-5 py-4">
                                <div class="flex items-center gap-3">
                                    <span class="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">{{ mb_strtoupper(mb_substr($displayName, 0, 1)) }}</span>
                                    <div>
                                        <p class="font-medium text-slate-950">{{ $displayName }}</p>
                                        <p class="mt-0.5 text-xs text-slate-500">{{ $user->email }}</p>
                                    </div>
                                </div>
                            </td>
                            <td class="px-5 py-4 text-slate-600">{{ $user->username ? '@'.$user->username : '—' }}</td>
                            <td class="px-5 py-4">
                                @if ($user->email_verified_at)
                                    <span class="inline-flex items-center gap-1.5 text-sm text-emerald-700">
                                        <span class="size-1.5 rounded-full bg-emerald-500"></span>
                                        Đã xác thực
                                    </span>
                                @else
                                    <span class="inline-flex items-center gap-1.5 text-sm text-amber-700">
                                        <span class="size-1.5 rounded-full bg-amber-500"></span>
                                        Chưa xác thực
                                    </span>
                                @endif
                            </td>
                            <td class="px-5 py-4"><x-admin.users.status-badge :status="$user->status" /></td>
                            <td class="px-5 py-4 text-slate-600">{{ $user->created_at?->format('d/m/Y') ?? '—' }}</td>
                        </tr>
                    @empty
                        <tr>
                            <td class="px-5 py-14 text-center text-slate-500" colspan="5">
                                Không tìm thấy người dùng phù hợp.
                            </td>
                        </tr>
                    @endforelse
                </tbody>
            </table>
        </div>

        @if ($users->hasPages())
            <div class="border-t border-slate-100 px-4 py-3">
                {{ $users->onEachSide(1)->links() }}
            </div>
        @endif
    </div>
</section>
