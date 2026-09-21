# Melodify

Melodify là hệ thống nghe nhạc trực tuyến dạng monorepo, gồm website, backend API và ứng dụng mobile dùng chung một backend.

## 1. Tổng quan kiến trúc

```text
Người dùng
   ├── Website Next.js ───────┐
   └── Mobile Expo ───────────┤
                              ▼
                     Laravel REST API
                              │
              ┌───────────────┼────────────────┐
              ▼               ▼                ▼
       MongoDB Atlas       Cloudinary       Gmail SMTP
       dữ liệu hệ thống    ảnh/media        email hệ thống
```

Frontend và mobile chỉ gọi API wrapper của Laravel. Không ứng dụng nào được kết nối trực tiếp tới MongoDB, Cloudinary hoặc Gmail.

## 2. Các thành phần

| Thư mục | Công nghệ | Vai trò |
|---|---|---|
| `frontend/` | Next.js 16, React, TypeScript, Tailwind CSS | Website nghe nhạc |
| `Backend/` | Laravel 13, PHP 8.3 | REST API, xác thực, dữ liệu, email và media |
| `Mobile/` | Expo SDK 57, React Native, Expo Router | Ứng dụng Android/iOS |

Backend sử dụng MongoDB Atlas thông qua `mongodb/laravel-mongodb`. Hình ảnh và media được lưu trên Cloudinary; MongoDB chỉ chứa URL và metadata cần thiết.

## 3. Cấu trúc repository

```text
Melodify/
├── frontend/                 # Next.js web app
│   ├── app/                  # Pages/layouts của website
│   ├── lib/                  # API wrapper và tiện ích frontend
│   ├── public/               # Static assets
│   └── .env.example
├── Backend/                  # Laravel API
│   ├── app/Models/           # MongoDB models và relationships
│   ├── app/Services/         # Cloudinary và service dùng chung
│   ├── app/Console/          # Artisan commands
│   ├── database/mongodb/     # Script khởi tạo MongoDB Atlas
│   ├── resources/api-docs/   # OpenAPI/Swagger, không public trực tiếp
│   ├── routes/               # API và web routes
│   ├── public/               # Document root của Laravel
│   └── README.md             # Tài liệu backend chi tiết
├── Mobile/                   # Expo React Native app
│   ├── app/                  # Expo Router screens
│   ├── src/                  # API wrapper và mã nguồn mobile
│   └── .env.example
└── README.md                 # Tài liệu tổng quan này
```

## 4. Yêu cầu môi trường

- Git
- Node.js 22 trở lên và npm
- PHP 8.3 trở lên
- Composer 2.x
- PHP extension `mongodb`
- Tài khoản MongoDB Atlas
- Tài khoản Cloudinary
- Gmail App Password hoặc SMTP provider khác
- Expo Go/Android Studio/Xcode nếu chạy mobile

Kiểm tra nhanh:

```bash
node --version
npm --version
php --version
composer --version
php -m | findstr mongodb
```

## 5. Clone dự án

```bash
git clone <repository-url>
cd Melodify
```

Không commit các file `.env`, password, API secret hoặc Gmail App Password. Các file môi trường đã được đưa vào `.gitignore`.

## 6. Cài đặt Backend

```bash
cd Backend
composer install
copy .env.example .env
php artisan key:generate
```

Mở `Backend/.env` và cấu hình:

```env
APP_ENV=local
APP_DEBUG=true
APP_URL=http://127.0.0.1:8000

DB_CONNECTION=mongodb
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/<database>
MONGODB_DATABASE=melodify

CLOUDINARY_CLOUD_NAME=<cloud-name>
CLOUDINARY_API_KEY=<api-key>
CLOUDINARY_API_SECRET=<api-secret>

MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=<gmail>
MAIL_PASSWORD=<gmail-app-password>
MAIL_FROM_ADDRESS=<gmail>
```

Khởi tạo database và các collection/index:

```bash
php artisan mongodb:initialize
```

Chạy backend:

```bash
php artisan serve --host=127.0.0.1 --port=8000
```

Backend local: `http://127.0.0.1:8000`.

Chi tiết models, relationships, MongoDB, Cloudinary, email, routes và troubleshooting nằm trong [Backend/README.md](Backend/README.md).

## 7. Cài đặt Frontend

```bash
cd frontend
npm install
copy .env.example .env.local
```

`frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api
```

Chạy website:

```bash
npm run dev
```

Website chạy tại `http://localhost:3000`.

Các lệnh chính:

```bash
npm run lint
npm run build
npm run start
```

## 8. Cài đặt Mobile

```bash
cd Mobile
npm install
copy .env.example .env
```

`Mobile/.env`:

```env
EXPO_PUBLIC_API_URL=http://<LAN-IP-cua-may>:8000/api
```

Khi chạy trên điện thoại thật, không dùng `localhost`; dùng IP LAN của máy đang chạy Laravel. Điện thoại và máy tính phải cùng mạng Wi-Fi.

```bash
npx expo start
npm run android
npm run ios
npm run web
```

## 9. Chạy toàn bộ hệ thống

Mở ba terminal:

```bash
# Terminal 1
cd Backend
php artisan serve --host=0.0.0.0 --port=8000
```

```bash
# Terminal 2
cd frontend
npm run dev
```

```bash
# Terminal 3
cd Mobile
npx expo start
```

Kiểm tra API tại `http://127.0.0.1:8000/api/health`.

## 10. Swagger API documentation

Swagger được bật local bằng:

```env
API_DOCS_ENABLED=true
```

Sau đó mở:

```text
http://127.0.0.1:8000/api/docs
```

OpenAPI JSON nằm tại `/api/docs/openapi.json`.

Swagger/OpenAPI nằm ngoài `public/` và được Laravel phục vụ qua route. Trong production, tài liệu bị tắt mặc định để không công khai danh sách API.

## 11. Deploy Backend lên Render

Tạo Web Service trỏ đến thư mục `Backend` hoặc cấu hình Root Directory là `Backend`.

Build command:

```bash
composer install --no-dev --optimize-autoloader
```

Start command:

```bash
php artisan serve --host=0.0.0.0 --port $PORT
```

Các biến bắt buộc trên Render:

```env
APP_ENV=production
APP_DEBUG=false
APP_KEY=<laravel-app-key>
API_DOCS_ENABLED=false
APP_URL=https://<backend-service>.onrender.com

DB_CONNECTION=mongodb
MONGODB_URI=<mongo-atlas-uri>
MONGODB_DATABASE=melodify

CLOUDINARY_CLOUD_NAME=<cloud-name>
CLOUDINARY_API_KEY=<api-key>
CLOUDINARY_API_SECRET=<api-secret>
```

Chỉ public thư mục `Backend/public`; không trỏ web server vào toàn bộ thư mục backend. Khi production giữ `API_DOCS_ENABLED=false`, `/api/docs` và `/api/docs/openapi.json` trả về `404`.

Nếu cần xem tài liệu tạm thời, đặt `API_DOCS_ENABLED=true` trên Render, deploy lại, truy cập `/api/docs`, sau đó đổi lại `false` và deploy lần nữa.

## 12. Deploy Frontend

Frontend có thể deploy trên Vercel hoặc nền tảng Node.js tương đương.

Environment variable production:

```env
NEXT_PUBLIC_API_URL=https://<backend-service>.onrender.com/api
```

Build command: `npm run build`.

Start command: `npm run start`.

Backend cần cấu hình CORS để cho phép domain frontend production.

## 13. Deploy Mobile

Trước khi build bản test hoặc production, cập nhật:

```env
EXPO_PUBLIC_API_URL=https://<backend-service>.onrender.com/api
```

Các lệnh thường dùng:

```bash
npx expo start
npx expo run:android
npx expo run:ios
```

## 14. Luồng dữ liệu chính

1. Người dùng thao tác trên website hoặc mobile.
2. API wrapper gửi request đến Laravel API.
3. Laravel xác thực request và xử lý nghiệp vụ.
4. MongoDB Atlas lưu user, bài hát, album, playlist, lịch sử và dữ liệu liên quan.
5. Cloudinary lưu ảnh/media; backend trả URL cho client.
6. Gmail SMTP gửi email xác thực, thông báo hoặc khôi phục tài khoản.

## 15. Bảo mật

- Không đưa MongoDB URI, Cloudinary API Secret hoặc Gmail App Password vào frontend/mobile.
- Không commit `.env` lên Git.
- Production phải dùng `APP_DEBUG=false`.
- Swagger production mặc định tắt bằng `API_DOCS_ENABLED=false`.
- Chỉ public thư mục `Backend/public`.
- Khi credential từng bị chia sẻ, hãy tạo credential mới và thu hồi credential cũ.
- CORS production chỉ nên cho phép các domain thực tế của frontend/mobile.

## 16. Troubleshooting nhanh

### MongoDB không kết nối

- Kiểm tra `MONGODB_URI` và `MONGODB_DATABASE`.
- Kiểm tra IP access list trên MongoDB Atlas.
- Kiểm tra username/password và quyền database user.
- Kiểm tra PHP extension `mongodb` đã bật.

### Mobile không gọi được API

- Không dùng `localhost` trên điện thoại thật.
- Dùng IP LAN của máy chạy backend.
- Kiểm tra firewall và hai thiết bị cùng mạng.
- Kiểm tra `EXPO_PUBLIC_API_URL` có hậu tố `/api`.

### Swagger không mở

- Local: đặt `API_DOCS_ENABLED=true`.
- Production: Swagger bị khóa có chủ đích khi đặt `false`.
- Sau khi đổi `.env`, chạy `php artisan config:clear` và khởi động lại backend.

### Cloudinary upload thất bại

- Kiểm tra Cloud Name, API Key và API Secret cùng một Cloudinary environment.
- Kiểm tra API key còn Active và có quyền upload.
- Không đặt Cloudinary API Secret ở frontend/mobile.

## 17. Tài liệu liên quan

- [Backend README](Backend/README.md): tài liệu đầy đủ về Laravel API, models, relationships, database, Cloudinary, email và deploy backend.
- [Frontend README](frontend/README.md): ghi chú riêng của website nếu có.
- [Mobile README](Mobile/README.md): ghi chú riêng của ứng dụng mobile nếu có.
