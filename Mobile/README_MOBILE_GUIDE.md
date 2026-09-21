# Hướng dẫn cài đặt và kết nối Expo

## 1. Cài đặt

Yêu cầu: Node.js, npm và Expo Go trên điện thoại.

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

## 3. Đăng nhập Expo Go

Mở Expo Go trên điện thoại và đăng nhập bằng đúng tài khoản GitHub vừa dùng ở bước trên.

Expo CLI và Expo Go phải dùng cùng một tài khoản.

## 4. Chạy ứng dụng trên điện thoại

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

## 5. Chạy trên web

```cmd
npx expo start --web --clear
```

Nếu cổng `8081` bị chiếm:

```cmd
npx expo start --web --clear --port 8082
```

Mở địa chỉ được in trong terminal, ví dụ `http://localhost:8082`.

## 6. Kết nối API Backend

Tạo file `Mobile/.env`:

```env
EXPO_PUBLIC_API_URL=https://melodify-6kc9.onrender.com/api
```

Nếu Backend chạy local và dùng điện thoại thật, thay `localhost` bằng IPv4 máy tính:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.100:8000/api
```

Sau khi sửa `.env`, khởi động lại Expo với `--clear`.

## 7. Lỗi thường gặp

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

Đây là lỗi Android SDK. Nếu chỉ chạy bằng điện thoại thật, dùng Expo Go và quét QR, không cần chạy `npm run android`.

### Không thấy code mới

```cmd
npx expo start --go --clear --lan
```

Đóng Expo Go hoàn toàn rồi quét mã QR mới.

## 8. Lưu ý bảo mật

Không commit `.env`, mật khẩu MongoDB, Cloudinary API Secret, SMTP password hoặc JWT secret lên GitHub.
