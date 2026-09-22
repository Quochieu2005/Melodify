@props(['active'])

<div class="min-h-screen bg-slate-50 text-slate-950">
    <aside class="fixed inset-y-0 hidden w-64 flex-col border-r border-slate-200 bg-white px-4 py-5 md:flex">
        <a class="flex items-center gap-3 px-2 text-lg font-semibold tracking-tight" href="{{ route('admin.users.index') }}">
            <span class="flex size-9 items-center justify-center rounded-xl bg-slate-950 text-white">
                <svg aria-hidden="true" class="size-5" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 18V7l10-2v11" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />
                    <path d="M8 20a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm10-6a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" stroke="currentColor" stroke-width="2" />
                </svg>
            </span>
            Melodify Admin
        </a>

        <nav class="mt-9 flex flex-col gap-1" aria-label="Điều hướng quản trị">
            <a class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium {{ $active === 'users' ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950' }}" href="{{ route('admin.users.index') }}">
                <svg aria-hidden="true" class="size-4" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />
                </svg>
                Người dùng
            </a>
        </nav>

        <div class="mt-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p class="text-xs font-medium text-slate-700">Cổng quản trị</p>
            <p class="mt-1 text-xs leading-5 text-slate-500">Quản lý nội dung và người dùng Melodify.</p>
        </div>
    </aside>

    <header class="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-5 md:ml-64 md:px-8">
        <a class="flex items-center gap-2 text-sm font-semibold md:hidden" href="{{ route('admin.users.index') }}">
            <span class="flex size-8 items-center justify-center rounded-lg bg-slate-950 text-xs text-white">M</span>
            Melodify Admin
        </a>
        <p class="hidden text-sm text-slate-500 md:block">Quản trị hệ thống</p>
        <div class="flex items-center gap-3">
            <span class="hidden text-sm text-slate-500 sm:block">Quản trị viên</span>
            <span class="flex size-9 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-800">A</span>
            <form method="POST" action="{{ route('admin.logout') }}">
                @csrf
                <button class="text-sm font-medium text-slate-600 transition hover:text-slate-950" type="submit">Đăng xuất</button>
            </form>
        </div>
    </header>

    <main class="p-5 md:ml-64 md:p-8">
        {{ $slot }}
    </main>
</div>
