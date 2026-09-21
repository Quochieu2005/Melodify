# Melodify Backend — Tài liệu đầy đủ

Đây là tài liệu tổng quan và hướng dẫn chi tiết cho toàn bộ thư mục `Backend/` của Melodify. Backend là Laravel API, chịu trách nhiệm kết nối MongoDB Atlas, xử lý dữ liệu, gửi email và làm trung gian upload media lên Cloudinary.

## 1. Mục đích của backend

Backend có các trách nhiệm chính:

1. Cung cấp API cho `frontend/` và `Mobile/`.
2. Kết nối MongoDB Atlas database `melodify`.
3. Quản lý users, admins, artists, albums, songs, playlists và lịch sử nghe nhạc.
4. Quản lý comments, likes, notifications và recommendations.
5. Quản lý subscription, payment, transaction và payment detail.
6. Upload hình ảnh/media lên Cloudinary bằng secret ở server.
7. Gửi email thật bằng Gmail SMTP.
8. Cung cấp Swagger UI để mô tả và test API.

## 2. Công nghệ và phiên bản

| Thành phần | Công nghệ |
|---|---|
| Framework | Laravel 13.17 |
| PHP | PHP 8.3 Thread Safe x64 |
| Database | MongoDB Atlas |
| Laravel MongoDB | `mongodb/laravel-mongodb` 5.11 |
| MongoDB driver | PHP extension `mongodb` + `mongodb/mongodb` |
| Media storage | Cloudinary |
| Mail | Gmail SMTP / Symfony Mailer |
| API docs | Swagger UI + OpenAPI 3.0.3 |
| Test | PHPUnit/Laravel Test |

## 3. Cấu trúc đầy đủ

```text
Backend/
├── app/
│   ├── Console/Commands/
│   │   └── InitializeMongoDb.php
│   ├── Http/Controllers/Api/
│   │   └── MediaController.php
│   ├── Mail/
│   │   └── TestEmail.php
│   ├── Models/
│   │   ├── BaseModel.php
│   │   ├── User.php
│   │   ├── Admin.php
│   │   ├── Artist.php
│   │   ├── ArtistFollower.php
│   │   ├── Genre.php
│   │   ├── Album.php
│   │   ├── Song.php
│   │   ├── SongArtist.php
│   │   ├── SongGenre.php
│   │   ├── SongAudioFile.php
│   │   ├── Lyric.php
│   │   ├── Playlist.php
│   │   ├── PlaylistSong.php
│   │   ├── Favorite.php
│   │   ├── ListeningHistory.php
│   │   ├── Device.php
│   │   ├── SongPlayEvent.php
│   │   ├── Comment.php
│   │   ├── CommentLike.php
│   │   ├── Notification.php
│   │   ├── SubscriptionPlan.php
│   │   ├── Subscription.php
│   │   ├── Payment.php
│   │   ├── Transaction.php
│   │   ├── PaymentDetail.php
│   │   ├── Log.php
│   │   ├── Report.php
│   │   └── Recommendation.php
│   └── Services/
│       └── CloudinaryService.php
├── bootstrap/app.php
├── config/
│   ├── app.php, auth.php, cache.php, database.php
│   ├── cloudinary.php, cors.php, filesystems.php
│   ├── logging.php, mail.php, queue.php
│   ├── services.php, session.php
├── database/
│   └── mongodb/
│       ├── atlas-init.js
│       └── README.md
├── public/api-docs/
│   ├── index.html
│   └── openapi.json
├── resources/
│   ├── views/layouts/app.blade.php
│   ├── views/components/
│   │   ├── home/hero.blade.php
│   │   ├── music/song-card.blade.php
│   │   ├── player/music-player.blade.php
│   │   └── shared/brand.blade.php
│   ├── views/emails/test.blade.php
│   └── README.md
├── routes/
│   ├── api.php
│   ├── console.php
│   └── web.php
├── storage/
├── tests/
├── artisan
├── composer.json
├── composer.lock
├── .env.example
└── phpunit.xml
```

Các thư mục `vendor/`, `storage/framework/` và file `.env` là file runtime/dependency, không nên commit lên Git.

## 4. Cài đặt từ đầu

```bash
cd Backend
composer install
copy .env.example .env
php artisan key:generate
php artisan config:clear
```

Kiểm tra PHP extension:

```bash
php -m | findstr mongodb
```

Nếu chưa có package MongoDB:

```bash
composer require mongodb/laravel-mongodb
```

Package MongoDB Laravel cần cả PHP extension `mongodb`. Chỉ cài package Composer là chưa đủ để query Atlas thật.

## 5. Cấu hình environment

Không ghi credentials thật vào README. Tạo `.env` từ `.env.example` rồi điền các nhóm cấu hình sau.

### 5.1 Application

```env
APP_NAME=Melodify
APP_ENV=local
APP_KEY=
APP_DEBUG=true
APP_URL=http://localhost:8000
```

Sau khi thay đổi `.env`:

```bash
php artisan config:clear
```

### 5.2 MongoDB Atlas

```env
DB_CONNECTION=mongodb
MONGODB_URI="mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/melodify?retryWrites=true&w=majority"
MONGODB_DATABASE=melodify
```

Trong Atlas cần:

1. Tạo cluster.
2. Tạo Database User.
3. Vào `Network Access` và allow IP máy chạy backend.
4. Dùng đúng connection string có database `melodify`.

Laravel đọc cấu hình tại [config/database.php](config/database.php). Connection MongoDB dùng:

```php
'mongodb' => [
    'driver' => 'mongodb',
    'dsn' => env('MONGODB_URI'),
    'database' => env('MONGODB_DATABASE', 'melodify'),
],
```

### 5.3 Cloudinary

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_FOLDER=melodify
```

File cấu hình: [config/cloudinary.php](config/cloudinary.php).

`CLOUDINARY_API_SECRET` chỉ được dùng ở backend để tạo chữ ký upload. Không đưa biến này vào Next.js hoặc Expo.

### 5.4 CORS

```env
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8081
```

CORS được định nghĩa trong [config/cors.php](config/cors.php), áp dụng cho `api/*` và cho phép frontend/mobile gọi API trong môi trường phát triển.

### 5.5 Gmail SMTP

```env
MAIL_MAILER=smtp
MAIL_SCHEME=null
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-gmail-app-password
MAIL_FROM_ADDRESS=your-email@gmail.com
MAIL_FROM_NAME=Melodify
```

Gmail phải bật 2-Step Verification và tạo App Password. Không sử dụng mật khẩu Gmail thông thường.

## 6. Database MongoDB

### 6.1 Khởi tạo database

Chạy:

```bash
php artisan mongodb:initialize
```

Command này:

1. Ping MongoDB Atlas để kiểm tra kết nối.
2. Chọn database từ `MONGODB_DATABASE`.
3. Tạo đủ 28 collections nếu chưa tồn tại.
4. Tạo unique indexes và indexes tìm kiếm chính.
5. In ra tên database và tổng số collections.

File command: [app/Console/Commands/InitializeMongoDb.php](app/Console/Commands/InitializeMongoDb.php).

### 6.2 Danh sách 28 collections

| Collection | Mục đích | Model |
|---|---|---|
| `admins` | Tài khoản quản trị | `Admin` |
| `users` | Người nghe nhạc | `User` |
| `artists` | Nghệ sĩ | `Artist` |
| `artist_followers` | User theo dõi artist | `ArtistFollower` |
| `genres` | Thể loại nhạc | `Genre` |
| `albums` | Album | `Album` |
| `songs` | Bài hát | `Song` |
| `song_artists` | Artist credit của song | `SongArtist` |
| `song_genres` | Genre của song | `SongGenre` |
| `song_audio_files` | File audio theo chất lượng | `SongAudioFile` |
| `lyrics` | Lời bài hát | `Lyric` |
| `playlists` | Playlist của user/system | `Playlist` |
| `playlist_songs` | Song trong playlist | `PlaylistSong` |
| `favorites` | Song user yêu thích | `Favorite` |
| `listening_history` | Lịch sử nghe | `ListeningHistory` |
| `devices` | Thiết bị user | `Device` |
| `song_play_events` | Sự kiện phát nhạc | `SongPlayEvent` |
| `comments` | Bình luận song | `Comment` |
| `comment_likes` | Like bình luận | `CommentLike` |
| `notifications` | Thông báo user | `Notification` |
| `subscription_plans` | Gói dịch vụ | `SubscriptionPlan` |
| `subscriptions` | Subscription của user | `Subscription` |
| `payments` | Payment | `Payment` |
| `transactions` | Giao dịch gateway | `Transaction` |
| `payment_details` | Chi tiết payment | `PaymentDetail` |
| `logs` | Audit/system logs | `Log` |
| `reports` | User report nội dung | `Report` |
| `recommendations` | Gợi ý bài hát | `Recommendation` |

### 6.3 Script mongosh

Script tương đương để chạy bằng Mongo Shell:

```bash
mongosh "mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/?retryWrites=true&w=majority" --file database/mongodb/atlas-init.js
```

Khuyến nghị dùng `php artisan mongodb:initialize` vì command này đã được kiểm tra trực tiếp trong Laravel.

### 6.4 SQL gốc

File SQL dùng để thiết kế schema có 28 bảng quan hệ. File chỉ có `CREATE TABLE`, không có `INSERT`, nên không có dữ liệu mẫu để migrate.

MongoDB không enforce foreign key như MySQL. Các reference như `user_id`, `song_id`, `artist_id` được giữ nguyên và quan hệ được xử lý trong model Laravel.

## 7. Models và relationships

### Base model

[app/Models/BaseModel.php](app/Models/BaseModel.php) extends `MongoDB\\Laravel\\Eloquent\\Model`, đặt connection mặc định là `mongodb` và cho phép mass assignment để khớp schema hiện tại.

### User và Admin

- `User` dùng `MongoDB\\Laravel\\Auth\\User` để chuẩn bị cho authentication MongoDB.
- User có `artist`, `artistFollowers`, `playlists`, `favorites`, `listeningHistory`, `devices`, `playEvents`, `comments`, `commentLikes`, `notifications`, `subscriptions`, `payments`, `reports`, `recommendations`.
- `Admin` có songs/playlists được tạo, logs và reports được review.

### Music

- `Artist` belongsTo User, hasMany ArtistFollower, Album, SongArtist và Song được tạo bởi artist.
- `Album` belongsTo Artist và hasMany Song.
- `Song` belongsTo Album, createdByArtist, createdByAdmin; hasMany SongArtist, SongGenre, SongAudioFile, Lyric, PlaylistSong, Favorite, ListeningHistory, SongPlayEvent, Comment và Recommendation.
- `SongArtist` belongsTo Song và Artist.
- `SongGenre` belongsTo Song và Genre.
- `SongAudioFile` belongsTo Song.
- `Lyric` belongsTo Song.
- `Genre` hasMany SongGenre.

### Playlist và listening

- `Playlist` belongsTo User, hasMany PlaylistSong, belongsTo Admin tạo system playlist.
- `PlaylistSong` belongsTo Playlist, Song, User thêm vào và Admin thêm vào.
- `Favorite` belongsTo User và Song.
- `ListeningHistory` belongsTo User và Song.
- `Device` belongsTo User và hasMany SongPlayEvent.
- `SongPlayEvent` belongsTo User, Song và Device.

### Social

- `Comment` belongsTo User và Song.
- `Comment` có self-relation `parent` và `replies` để hỗ trợ comment trả lời.
- `Comment` hasMany CommentLike.
- `CommentLike` belongsTo User và Comment.
- `Notification` belongsTo User.

### Subscription và payment

- `SubscriptionPlan` hasMany Subscription và PaymentDetail.
- `Subscription` belongsTo User và SubscriptionPlan, hasMany Payment.
- `Payment` belongsTo User và Subscription, hasMany Transaction và PaymentDetail.
- `Transaction` belongsTo Payment.
- `PaymentDetail` belongsTo Payment và SubscriptionPlan.

### System

- `Log` belongsTo User và Admin.
- `Report` belongsTo reporter User và Admin review.
- `Recommendation` belongsTo User và Song.

## 8. Giao diện Blade và components

Toàn bộ giao diện Laravel nằm trong [resources](resources). Layout đặt trong `resources/views/layouts`, component giao diện đặt trong `resources/views/components`, còn page chỉ gọi layout và component.

Luồng đọc giao diện:

```text
Route → View page → Layout → Feature component → Shared component
```

Khi thêm chức năng giao diện mới, tạo folder trong `resources/views/components/<feature-name>`, ví dụ `music`, `playlist`, `profile` hoặc `settings`. Không viết toàn bộ HTML trực tiếp trong `welcome.blade.php` hay một page lớn. Quy tắc chi tiết nằm trong [resources/README.md](resources/README.md).

## 9. Cloudinary service

[app/Services/CloudinaryService.php](app/Services/CloudinaryService.php) thực hiện signed image upload:

1. Đọc cloud name, API key và API secret từ config.
2. Tạo timestamp.
3. Tạo SHA-1 signature cho folder và timestamp.
4. Gửi multipart request đến Cloudinary Upload API.
5. Trả về response gồm `public_id`, `secure_url`, width, height và format.

Service đã được test upload thành công và xóa asset test sau đó.

Hiện service đã sẵn sàng nhưng route upload public chưa đăng ký trong `routes/api.php`. Khi xây dựng chức năng tạo ảnh, thêm controller route rồi gọi service từ backend.

## 10. Email

### Mailable

[app/Mail/TestEmail.php](app/Mail/TestEmail.php) tạo email test với subject `Melodify - Email test`.

Template HTML nằm tại [resources/views/emails/test.blade.php](resources/views/emails/test.blade.php).

### Lệnh test

Lệnh nằm trong [routes/console.php](routes/console.php):

```bash
php artisan mail:test recipient@example.com
```

Email được gửi đồng bộ qua SMTP Gmail. Khi có nhiều email production, nên chuyển sang queue và worker để không làm chậm request API.

## 11. Routes hiện tại

### API route

File [routes/api.php](routes/api.php):

```text
GET /api/health
GET /api/docs
GET /api/docs/openapi.json
```

Response mẫu:

```json
{
  "status": "ok",
  "service": "melodify-api",
  "database": "connected",
  "timestamp": "2026-09-19T00:00:00.000000Z"
}
```

Route sẽ trả `database: disconnected` nếu Laravel chưa kết nối được Atlas, nhưng API vẫn trả response để dễ kiểm tra.

### Web routes

File [routes/web.php](routes/web.php):

```text
GET /
```

Swagger được phục vụ qua API route và chỉ hoạt động khi `API_DOCS_ENABLED=true`.

### Console routes

File [routes/console.php](routes/console.php):

```text
inspire
mail:test {email}
```

## 12. Swagger API Docs

Swagger/OpenAPI documentation is disabled by default for production deployments. The files are stored outside `public/` and are only served by Laravel when `API_DOCS_ENABLED=true`.

For local development:

```env
API_DOCS_ENABLED=true
```

For Render/production:

```env
APP_ENV=production
APP_DEBUG=false
API_DOCS_ENABLED=false
```

When disabled, both `/api/docs` and `/api/docs/openapi.json` return `404`. Configure Render so Laravel serves `Backend/public`, never the project root.

Chạy server:

```bash
php artisan serve
```

Mở:

```text
http://127.0.0.1:8000/api/docs
```

Swagger UI dùng OpenAPI 3.0.3 và load spec từ `resources/api-docs/openapi.json` thông qua route bảo vệ; file không còn nằm trong `public/`.

Hiện spec có:

- Group `System`.
- Group `Auth` placeholder.
- Group `Music` placeholder.
- Bearer `Authorize` scheme.
- `GET /api/health`.

Khi thêm API mới, cập nhật cả route Laravel và OpenAPI JSON để endpoint xuất hiện trong giao diện.

## 13. File cấu hình Laravel

| File | Vai trò |
|---|---|
| `config/app.php` | Tên app, locale, timezone, key |
| `config/auth.php` | Guard/provider authentication |
| `config/cache.php` | Cache store |
| `config/database.php` | MongoDB và các connection khác |
| `config/cloudinary.php` | Cloudinary credentials/folder |
| `config/cors.php` | Origin được phép gọi API |
| `config/filesystems.php` | Filesystem Laravel |
| `config/logging.php` | Log channel |
| `config/mail.php` | SMTP và các mailer |
| `config/queue.php` | Queue connection |
| `config/services.php` | Third-party services |
| `config/session.php` | Session driver |

## 14. Chạy backend

```bash
cd Backend
php artisan serve
```

Các command quan trọng:

```bash
php artisan route:list
php artisan optimize:clear
php artisan config:clear
php artisan mongodb:initialize
php artisan mail:test email@example.com
php artisan test
```

## 15. Test và kiểm tra lỗi

Kiểm tra syntax PHP của một file:

```bash
php -l app/Models/Song.php
```

Kiểm tra MongoDB extension:

```bash
php -m | findstr mongodb
```

Kiểm tra API:

```bash
curl http://127.0.0.1:8000/api/health
```

Nếu response database là `disconnected`:

1. Kiểm tra `MONGODB_URI`.
2. Kiểm tra Atlas Network Access.
3. Kiểm tra Database User/password.
4. Chạy `php artisan config:clear`.
5. Kiểm tra PHP extension `mongodb`.

Nếu Cloudinary trả `403 missing permissions`:

1. Kiểm tra API Key đang Active.
2. Kiểm tra API Key có role cho phép tạo asset.
3. Kiểm tra Cloud Name, API Key và API Secret cùng một product environment.
4. Kiểm tra lại `CLOUDINARY_FOLDER`.

Nếu Gmail không gửi được:

1. Kiểm tra dùng App Password.
2. Dùng `MAIL_PORT=587` và `MAIL_SCHEME=null`.
3. Chạy `php artisan config:clear`.
4. Kiểm tra firewall/network cho SMTP.

## 16. Những phần chưa triển khai

Backend hiện mới hoàn thiện nền tảng và model layer. Các phần sau chưa có nghiệp vụ:

- Auth controller, register/login/logout và token issuing.
- Middleware auth và phân quyền admin/artist/listener.
- CRUD controllers cho 28 resource.
- Upload image controller route public.
- Upload audio và streaming protection.
- Search/filter/pagination API.
- Payment gateway callback/webhook.
- Subscription renewal/cancellation.
- Notification delivery.
- Recommendation generation.
- Request validation classes và API Resources.
- Automated feature tests cho các resource.

## 17. Bảo mật bắt buộc

- Không commit `.env`.
- Không đưa MongoDB URI, MongoDB password, Cloudinary API Secret hoặc Gmail App Password vào frontend/mobile.
- Không ghi secret vào README, OpenAPI JSON hoặc log.
- Không để MongoDB Atlas `0.0.0.0/0` lâu dài.
- Không mở route test email công khai.
- Khi credential đã bị chia sẻ, rotate credential tại MongoDB Atlas, Cloudinary và Gmail.
