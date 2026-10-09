<!DOCTYPE html>
<html lang="vi" data-admin-theme="light" data-theme-preference="system">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>{{ $title ?? 'Melodify Admin' }}</title>
    <script>
        (function() {
            var preference = localStorage.getItem('melodify-theme-preference') || 'system';
            var theme = preference === 'system' ?
                (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') :
                preference;
            document.documentElement.setAttribute('data-admin-theme', theme);
            document.documentElement.setAttribute('data-theme-preference', preference);
            document.documentElement.style.colorScheme = theme;
        })();
    </script>
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>

<body class="admin-auth-body">
    @include('layouts.partials.toast')
    @yield('content')
</body>

</html>
