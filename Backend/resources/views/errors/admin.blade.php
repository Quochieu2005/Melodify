<!DOCTYPE html>
<html lang="vi" data-admin-theme="light">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $status }} · Melodify Admin</title>
    <script>
        (function() {
            var preference = localStorage.getItem('melodify-theme-preference') || localStorage.getItem(
                'melodify-theme') || 'system';
            var theme = preference === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' :
                'light') : preference;
            document.documentElement.setAttribute('data-admin-theme', theme);
        })();
    </script>
    <style>
        :root {
            color-scheme: light;
            --bg: #f4f7f7;
            --surface: #fff;
            --border: #dfe7e6;
            --text: #172726;
            --muted: #718280;
            --accent: #009fac;
            --accent-soft: #e5f7f8;
            --danger: #d9363e;
        }

        [data-admin-theme="dark"] {
            color-scheme: dark;
            --bg: #0d1515;
            --surface: #151f1f;
            --border: #2a3a39;
            --text: #ecf4f3;
            --muted: #91a29f;
            --accent: #35c8d3;
            --accent-soft: #15383a;
        }

        * {
            box-sizing: border-box;
        }

        body {
            align-items: center;
            background: var(--bg);
            color: var(--text);
            display: flex;
            font-family: Instrument Sans, Inter, ui-sans-serif, system-ui, sans-serif;
            justify-content: center;
            margin: 0;
            min-height: 100vh;
            padding: 28px;
        }

        .error-shell {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 20px;
            box-shadow: 0 24px 60px rgb(31 55 53 / 9%);
            display: grid;
            grid-template-columns: minmax(210px, .72fr) minmax(0, 1.28fr);
            max-width: 840px;
            overflow: hidden;
            width: 100%;
        }

        .error-mark {
            align-items: center;
            background: #102d2d;
            color: #f5ffff;
            display: flex;
            flex-direction: column;
            justify-content: center;
            min-height: 320px;
            padding: 32px;
            position: relative;
        }

        .error-mark::before {
            background-image: radial-gradient(rgb(53 200 211 / 20%) 1px, transparent 1px);
            background-size: 18px 18px;
            content: '';
            inset: 0;
            opacity: .65;
            position: absolute;
        }

        .brand {
            align-items: center;
            display: flex;
            font-size: 16px;
            font-weight: 700;
            gap: 10px;
            left: 24px;
            position: absolute;
            top: 24px;
            z-index: 1;
        }

        .brand-badge {
            align-items: center;
            background: var(--accent);
            border-radius: 10px;
            display: inline-flex;
            height: 30px;
            justify-content: center;
            width: 30px;
        }

        .error-code {
            font-size: clamp(60px, 10vw, 104px);
            font-weight: 700;
            letter-spacing: -.08em;
            line-height: .9;
            position: relative;
            z-index: 1;
        }

        .signal {
            align-items: end;
            display: flex;
            gap: 5px;
            height: 26px;
            margin-top: 20px;
            position: relative;
            z-index: 1;
        }

        .signal i {
            animation: pulse 1.35s ease-in-out infinite;
            background: #35c8d3;
            border-radius: 8px;
            display: block;
            height: 10px;
            width: 5px;
        }

        .signal i:nth-child(2) {
            animation-delay: .12s;
            height: 20px;
        }

        .signal i:nth-child(3) {
            animation-delay: .24s;
            height: 14px;
        }

        .signal i:nth-child(4) {
            animation-delay: .36s;
            height: 25px;
        }

        .signal i:nth-child(5) {
            animation-delay: .48s;
            height: 12px;
        }

        .error-content {
            padding: 58px 54px;
        }

        .eyebrow {
            color: var(--accent);
            font-size: 13px;
            font-weight: 700;
            letter-spacing: .04em;
            margin: 0 0 14px;
        }

        h1 {
            font-size: clamp(28px, 4vw, 40px);
            letter-spacing: -.04em;
            line-height: 1.1;
            margin: 0;
        }

        .message {
            color: var(--muted);
            font-size: 16px;
            line-height: 1.65;
            margin: 16px 0 28px;
            max-width: 410px;
        }

        .actions {
            align-items: center;
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
        }

        .button {
            border: 1px solid var(--border);
            border-radius: 9px;
            color: var(--text);
            display: inline-flex;
            font-size: 14px;
            font-weight: 600;
            padding: 11px 16px;
            text-decoration: none;
            transition: background .2s ease, border-color .2s ease, transform .2s ease;
        }

        .button:hover {
            border-color: var(--accent);
            transform: translateY(-1px);
        }

        .button-primary {
            background: var(--accent);
            border-color: var(--accent);
            color: #fff;
        }

        .button-primary:hover {
            background: #007f8a;
            border-color: #007f8a;
        }

        @keyframes pulse {

            0%,
            100% {
                opacity: .55;
                transform: scaleY(.7);
            }

            50% {
                opacity: 1;
                transform: scaleY(1);
            }
        }

        @media (prefers-reduced-motion: reduce) {
            .signal i {
                animation: none;
            }

            .button {
                transition: none;
            }
        }

        @media (max-width: 620px) {
            body {
                padding: 14px;
            }

            .error-shell {
                grid-template-columns: 1fr;
            }

            .error-mark {
                min-height: 210px;
            }

            .error-content {
                padding: 34px 26px 30px;
            }

            .error-code {
                font-size: 76px;
            }
        }
    </style>
</head>

<body>
    @php($homeUrl = auth('admin')->check() ? route('admin.dashboard') : route('admin.login'))
    <main class="error-shell" aria-labelledby="error-title">
        <section class="error-mark" aria-label="Mã lỗi {{ $status }}">
            <div class="brand"><span class="brand-badge">M</span><span>Melodify Admin</span></div>
            <div class="error-code">{{ $status }}</div>
            <div class="signal" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
        </section>
        <section class="error-content">
            <p class="eyebrow">KHU VỰC QUẢN TRỊ</p>
            <h1 id="error-title">{{ $title }}</h1>
            <p class="message">{{ $message }}</p>
            <div class="actions">
                <a href="{{ $homeUrl }}"
                    class="button button-primary">{{ auth('admin')->check() ? 'Về dashboard' : 'Đăng nhập' }}</a>
                <a href="javascript:history.back()" class="button">Quay lại</a>
            </div>
        </section>
    </main>
</body>

</html>
