@extends('layouts.app', ['title' => 'Đăng nhập quản trị | Melodify'])

@section('content')
    <main class="grid min-h-screen bg-white lg:grid-cols-2">
        <section class="relative hidden overflow-hidden bg-[#111827] px-10 py-9 text-white lg:flex lg:flex-col">
            <div class="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,.075)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.075)_1px,transparent_1px)] [background-size:42px_42px]"></div>
            <div class="absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(34,197,94,.27),transparent_24%),radial-gradient(circle_at_81%_68%,rgba(99,102,241,.35),transparent_31%)]"></div>

            <div class="relative z-10 flex items-center gap-3 text-lg font-semibold tracking-tight">
                <span class="flex size-10 items-center justify-center rounded-xl bg-white/12 ring-1 ring-white/20">
                    <svg aria-hidden="true" class="size-5" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8 18V7l10-2v11" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />
                        <path d="M8 20a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm10-6a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" stroke="currentColor" stroke-width="2" />
                    </svg>
                </span>
                Melodify Admin
            </div>

            <div class="relative z-10 my-auto flex max-w-md flex-col gap-5">
                <p class="text-sm font-medium uppercase tracking-[0.24em] text-emerald-300">Administration portal</p>
                <h1 class="text-4xl font-semibold leading-tight tracking-tight">Quản lý không gian âm nhạc của Melodify.</h1>
                <p class="max-w-sm text-base leading-7 text-slate-300">
                    Theo dõi nội dung, người dùng và hoạt động hệ thống từ một nơi duy nhất.
                </p>
                <div class="mt-5 flex items-end gap-1.5" aria-hidden="true">
                    @foreach ([32, 54, 78, 44, 96, 62, 38, 72, 50, 88, 42, 64] as $height)
                        <span class="w-1.5 rounded-full bg-gradient-to-t from-emerald-400 to-cyan-200" style="height: {{ $height }}px"></span>
                    @endforeach
                </div>
            </div>

            <p class="relative z-10 text-sm text-slate-400">Dành riêng cho quản trị viên được cấp quyền.</p>
        </section>

        <section class="flex min-h-screen items-center justify-center px-5 py-12 sm:px-8">
            <div class="w-full max-w-[360px]">
                <div class="mb-8 flex flex-col items-center gap-2 text-center">
                    <span class="mb-3 flex size-10 items-center justify-center rounded-xl bg-slate-950 lg:hidden">
                        <svg aria-hidden="true" class="size-5 text-white" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M8 18V7l10-2v11" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />
                            <path d="M8 20a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm10-6a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" stroke="currentColor" stroke-width="2" />
                        </svg>
                    </span>
                    <h2 class="text-2xl font-semibold tracking-tight text-slate-950">Đăng nhập quản trị</h2>
                    <p class="text-sm leading-6 text-slate-500">Dùng tài khoản quản trị đã được cấp để tiếp tục.</p>
                </div>

                <form class="flex flex-col gap-4" method="POST" action="{{ route('admin.login.store') }}">
                    @csrf
                    <div>
                        <label class="mb-2 block text-sm font-medium text-slate-700" for="email">Email</label>
                        <input class="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" id="email" name="email" placeholder="admin@melodify.com" type="email" value="{{ old('email') }}" autocomplete="email" required autofocus>
                        @error('email')
                            <p class="mt-2 text-xs font-medium text-rose-600">{{ $message }}</p>
                        @enderror
                    </div>

                    <div>
                        <div class="mb-2 flex items-center justify-between">
                            <label class="block text-sm font-medium text-slate-700" for="password">Mật khẩu</label>
                            <span class="text-xs font-medium text-slate-950">Quên mật khẩu? Liên hệ IT</span>
                        </div>
                        <input class="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" id="password" name="password" placeholder="Nhập mật khẩu" type="password" autocomplete="current-password" required>
                    </div>

                    <label class="flex items-center gap-2 text-sm text-slate-600">
                        <input class="size-4 rounded border-slate-300 text-slate-950 focus:ring-slate-950" name="remember" type="checkbox" value="1">
                        Ghi nhớ đăng nhập
                    </label>

                    <button class="h-11 w-full rounded-lg bg-slate-950 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-950/15" type="submit">
                        Đăng nhập
                    </button>
                </form>

                <p class="mt-7 text-center text-sm text-slate-500">Cần quyền truy cập? Liên hệ quản trị viên hệ thống.</p>
                <p class="mt-7 text-center text-xs leading-5 text-slate-400">
                    Khi tiếp tục, bạn đồng ý với Điều khoản sử dụng và Chính sách bảo mật của Melodify.
                </p>
            </div>
        </section>
    </main>
@endsection
