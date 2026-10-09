<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" data-admin-theme="light">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>{{ $title ?? 'Melodify Admin' }}</title>
    <script>
        (function() {
            var pref = localStorage.getItem('melodify-theme-preference') || localStorage.getItem('melodify-theme') ||
                'system';
            var effectiveTheme = pref;
            if (pref === 'system') {
                effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            }
            document.documentElement.setAttribute('data-admin-theme', effectiveTheme);
            document.documentElement.setAttribute('data-theme-preference', pref);
            document.documentElement.style.colorScheme = effectiveTheme;
        })();
    </script>
    @vite(['resources/css/app.css', 'resources/css/admin-form-enhancements.css', 'resources/js/app.js', 'resources/js/admin-form-enhancements.js'])
</head>

<body class="admin-body" data-admin-idle-timeout="3600" data-admin-logout-url="{{ route('admin.logout') }}">
    @include('layouts.partials.toast')
    <div class="ant-layout ant-layout-has-sider admin-layout-root" id="admin-shell" data-admin-shell>
        <div class="admin-sidebar-overlay" data-sidebar-overlay></div>
        @include('layouts.partials.sidebar')
        <div class="ant-layout admin-layout-main">
            @include('layouts.partials.header')
            <main class="ant-layout-content admin-content" id="admin-content">
                @yield('content')
            </main>
        </div>
    </div>
    @stack('scripts')
</body>

</html>
