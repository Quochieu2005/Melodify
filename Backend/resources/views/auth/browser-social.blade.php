<!doctype html>
<html lang="vi">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Đăng nhập Melodify</title>
    <style>
        body { margin:0; padding:24px; background:#071a17; color:#effaf5; font:17px/1.6 system-ui,sans-serif }
        main { max-width:430px; margin:10vh auto; padding:28px; border:1px solid #28564a; border-radius:24px; background:#102b24 }
        h1 { font-size:28px; margin-top:0 } p { color:#c3d8d0 }
        input,button { box-sizing:border-box; width:100%; padding:15px; border-radius:12px; font:inherit; margin-top:14px }
        input { letter-spacing:6px; text-align:center; border:1px solid #7da293 }
        button { border:0; background:#72e3b1; color:#06251a; font-weight:700 }
    </style>
</head>
<body><main>
    <h1>Melodify</h1>
    @if(isset($message))<p role="status">{{ $message }}</p>@endif
    @if($enterCode ?? false)
        <p>Nhập mã 8 số từ màn hình đăng nhập trong app Melodify trên điện thoại của bạn.</p>
        <p>Chỉ tiếp tục nếu bạn vừa bấm đăng nhập trong app. Không dùng mã người khác gửi.</p>
        <form method="post" action="{{ route('social.browser.authorize', ['id' => $id], false) }}">
            @csrf
            <label for="code">Mã trong app</label>
            <input id="code" name="code" inputmode="numeric" pattern="[0-9]{8}" maxlength="8" required autocomplete="off">
            @error('code')<p>{{ $message }}</p>@enderror
            <button type="submit">Tiếp tục với {{ $provider === 'google' ? 'Google' : 'Facebook' }}</button>
        </form>
    @elseif(!isset($message))
        <p>Phiên này đã được mở. Hoàn tất đăng nhập trong trang đang mở hoặc quay lại app để tạo phiên mới.</p>
    @endif
</main></body>
</html>
