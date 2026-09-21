# Backend `resources`

Thư mục `resources/` là nơi chứa phần giao diện của Laravel Backend. Phần giao diện Blade được chia nhỏ thành layout, page và component để người pull dự án có thể đọc code dễ dàng.

## 1. Cấu trúc thư mục

```text
resources/
├── views/
│   ├── layouts/
│   │   └── app.blade.php             # Khung giao diện dùng chung
│   ├── components/
│   │   ├── home/                     # Các phần thuộc trang home
│   │   ├── music/                    # Các phần thuộc chức năng music
│   │   ├── player/                   # Các phần thuộc trình phát nhạc
│   │   └── shared/                   # Các phần dùng chung
│   ├── emails/                        # Giao diện email
│   └── welcome.blade.php              # Page chỉ gọi layout/component
├── css/
│   └── app.css                       # CSS của giao diện Laravel
├── js/
│   └── app.js                        # JavaScript của giao diện Laravel
└── api-docs/
    ├── index.html                    # Swagger UI
    └── openapi.json                  # Mô tả API OpenAPI
```

## 2. Component được tổ chức như thế nào?

Trong `views/components/`, mỗi folder đại diện cho một phần chức năng của giao diện.

Ví dụ:

```text
views/components/
├── home/
│   ├── hero.blade.php
│   └── featured-songs.blade.php
├── music/
│   ├── song-card.blade.php
│   └── song-list.blade.php
├── player/
│   ├── music-player.blade.php
│   └── player-controls.blade.php
└── shared/
    ├── brand.blade.php
    └── loading.blade.php
```

Tên folder phải phản ánh chức năng thật. Ví dụ `music` dành cho phần âm nhạc, `player` dành cho trình phát và `shared` dành cho component được dùng ở nhiều nơi.

## 3. Cách gọi component

Page không viết toàn bộ HTML trực tiếp. Page chỉ gọi layout hoặc component cần dùng.

Ví dụ trong `welcome.blade.php`:

```blade
@extends('layouts.app')

@section('content')
    <x-home.hero />
@endsection
```

Trong `home/hero.blade.php`, có thể gọi tiếp những component nhỏ hơn:

```blade
<x-music.song-card
    title="Bài hát nổi bật"
    artist="Melodify Artist"
/>

<x-player.music-player />
```

Laravel tự chuyển:

```blade
<x-music.song-card />
```

thành file:

```text
resources/views/components/music/song-card.blade.php
```

## 4. Quy tắc khi đọc code

Khi pull dự án về, đọc giao diện theo thứ tự:

```text
Route → Page → Layout → Component chức năng → Component nhỏ → Shared component
```

Ví dụ:

1. Mở route để biết route gọi page nào.
2. Mở page để biết page dùng layout nào và gọi component nào.
3. Mở folder chức năng để xem các phần giao diện nhỏ.
4. Mở `shared/` nếu component sử dụng thành phần dùng chung.

Nhờ cách này, mỗi file chỉ xử lý một phần giao diện và người mới không phải đọc một file Blade quá dài.

## 5. Quy tắc khi tạo component mới

1. Xác định component thuộc chức năng nào.
2. Tạo file trong `views/components/<feature>/`.
3. Mỗi file chỉ chứa một phần giao diện.
4. Nếu phần đó được dùng ở nhiều chức năng, đặt vào `views/components/shared/`.
5. Page chỉ gọi component bằng cú pháp `<x-folder.ten-file />`.
6. Không copy cùng một đoạn HTML sang nhiều file.

## 6. Phân tách giao diện và nghiệp vụ

Blade chỉ chịu trách nhiệm hiển thị giao diện.

Không viết trực tiếp những phần sau trong file Blade:

- Query MongoDB.
- Logic xử lý nghiệp vụ phức tạp.
- Cloudinary API Secret.
- Gmail password.
- Logic xác thực hoặc thanh toán.

Các phần đó phải nằm ở controller, service, model hoặc lớp xử lý tương ứng trong thư mục `app/`.

## 7. Tóm tắt dễ hiểu

```text
resources/views/layouts/       = khung giao diện
resources/views/components/    = các mảnh giao diện nhỏ
resources/views/emails/        = giao diện email
resources/css/                 = CSS
resources/js/                  = JavaScript giao diện
resources/api-docs/            = tài liệu Swagger
```

Khi muốn thêm một phần giao diện, hãy tạo component riêng rồi gọi nó ra. Không viết tất cả giao diện trực tiếp trong page.
