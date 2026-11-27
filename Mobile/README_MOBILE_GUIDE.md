# Hướng dẫn cài đặt và kết nối Expo

## 1. Cài đặt

Yêu cầu: Node.js, npm và development build Melodify trên điện thoại. Expo Go vẫn dùng được để xem nhanh giao diện, nhưng không áp dụng cấu hình native phát nhạc nền khi khóa màn hình.

```cmd
cd /d D:\laragon\www\Melodify\Mobile
npm install
```

## 2. Đăng nhập Expo bằng GitHub

Không dùng `npx expo login` vì lệnh này yêu cầu email và mật khẩu Expo.

```cmd
npx eas-cli@latest login --browser
```

Trình duyệt mở ra, chọn **Continue with GitHub** và cấp quyền cho Expo.

Kiểm tra tài khoản:

```cmd
npx eas-cli@latest whoami
npx expo whoami
```

## 3. Cài development build để dùng phát nhạc nền

Cấu hình `expo-audio` đã bật background playback cho Android và iOS. Cần build và cài development build một lần để đưa quyền native vào app; sau đó mới chạy Metro bằng dev client:

```cmd
cd /d D:\laragon\www\Melodify\Mobile
npm run build:android
```

Với iPhone, build iOS qua EAS (cần tài khoản Apple Developer và cấu hình ký app):

```cmd
npm run build:ios
```

Cài file build lên thiết bị, rồi chạy `npm start` và mở app Melodify đã cài. Không quét QR bằng Expo Go khi kiểm tra phát nhạc nền. Expo Go chỉ dùng luồng bên dưới cho các kiểm tra không cần cấu hình native.

## 4. Đăng nhập Expo Go

Mở Expo Go trên điện thoại và đăng nhập bằng đúng tài khoản GitHub vừa dùng ở bước trên.

Expo CLI và Expo Go phải dùng cùng một tài khoản.

## 5. Chạy ứng dụng trên điện thoại bằng Expo Go

```cmd
npx expo start --go --clear --lan
```

Sau đó:

1. Máy tính và điện thoại kết nối cùng Wi-Fi.
2. Mở Expo Go.
3. Quét mã QR trong terminal.

Nếu không kết nối được LAN:

```cmd
npx expo start --go --clear --tunnel
```

## 6. Chạy trên web

```cmd
npx expo start --web --clear
```

Nếu cổng `8081` bị chiếm:

```cmd
npx expo start --web --clear --port 8082
```

Mở địa chỉ được in trong terminal, ví dụ `http://localhost:8082`.

## 7. Kết nối API Backend

Tạo file `Mobile/.env`:

```env
EXPO_PUBLIC_API_URL=https://melodify-6kc9.onrender.com/api
```

Nếu Backend chạy local và dùng điện thoại thật, thay `localhost` bằng IPv4 máy tính:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.100:8000/api
```

Sau khi sửa `.env`, khởi động lại Expo với `--clear`.

## 8. Lỗi thường gặp

### Expo CLI hỏi email và mật khẩu

Nhấn `Ctrl + C`, sau đó dùng lại:

```cmd
npx eas-cli@latest login --browser
```

### Điện thoại báo khác tài khoản

Đăng xuất Expo Go và đăng nhập lại bằng đúng tài khoản với kết quả:

```cmd
npx expo whoami
```

### Android báo thiếu `adb`

Đây là lỗi Android SDK. Có thể build development app qua `npm run build:android` (EAS) thay vì cài local bằng `npm run android:local`.

### Không thấy code mới

```cmd
npx expo start --go --clear --lan
```

Đóng Expo Go hoàn toàn rồi quét mã QR mới.

## 9. Lưu ý bảo mật

Không commit `.env`, mật khẩu MongoDB, Cloudinary API Secret, SMTP password hoặc JWT secret lên GitHub.
