# Melodify Mobile

Ứng dụng mobile của Melodify được xây dựng bằng Expo, React Native, TypeScript và Expo Router. Mobile dùng chung Laravel Backend với website và chỉ gọi API wrapper, không truy cập trực tiếp MongoDB hoặc Cloudinary.

## 1. Công nghệ

- Expo SDK 57.
- React Native 0.86.
- TypeScript.
- Expo Router với file-based routing.
- React Native Web cho môi trường web.
- API wrapper tại `src/lib/api.ts`.

## 2. Cài đặt và chạy

```bash
npm install
copy .env.example .env
npm start
```

Khi chạy development build bằng LAN, app mặc định dùng Backend trên máy chạy Metro (cổng 8000). `Mobile/.env` luôn được ưu tiên nếu có cấu hình:

```env
EXPO_PUBLIC_API_URL=http://localhost:8000/api
EXPO_PUBLIC_OAUTH_BASE_URL=http://localhost:8000
```

Khi chạy trên điện thoại thật bằng Expo LAN, app tự thay `localhost` bằng địa chỉ máy đang chạy Expo. Điện thoại và máy tính chạy Backend phải cùng Wi-Fi. Nếu dùng Expo Tunnel hoặc app không tìm được địa chỉ máy, hãy thay `localhost` bằng IP LAN hiện tại của máy tính (không dùng IP cũ sau khi đổi mạng).

Nếu chạy Laravel bằng development server, cần bind backend vào giao diện mạng để điện thoại truy cập được:

```bash
cd Backend
composer dev:mobile
```

Backend phải lắng nghe địa chỉ LAN. Sau khi sửa `.env`, khởi động lại Expo; chỉ mở cổng Backend trên mạng riêng tin cậy.

Các lệnh:

```bash
npx expo start
npm run android
npm run ios
npm run web
npm run lint
```

### Đăng nhập email/số điện thoại và OAuth

Mobile dùng SDK lấy access token rồi gửi tới API backend. Expo Go không hỗ trợ SDK này; dùng development build đã cài trên điện thoại.

#### Development build dùng SDK

`npm start` mở Metro ở chế độ development client cho SDK Google/Facebook.
Trên Windows có Android SDK/JDK và điện thoại Android bật USB debugging, dùng
`npm run android:local` để build và cài bản local. `npm run ios:local` dành cho
máy Mac có Xcode và thiết bị iOS đã cấu hình ký. Chạy backend LAN bằng
`composer dev:mobile` trong terminal riêng. Sau lần cài đầu, các thay đổi
JavaScript thông thường dùng Metro; thay đổi thư viện native/config cần build lại.

Đăng nhập mật khẩu gọi `POST /api/v1/auth/login`; OTP gọi `/api/v1/auth/phone/request-otp` và `/api/v1/auth/phone/verify`. Trên iOS/Android, SDK Google/Facebook cấp access token; Mobile gửi `{ provider, access_token, device_name, remember }` tới `POST /api/v1/auth/social`, lưu phiên Melodify rồi mở `/me`. Native không dùng callback web của backend hoặc ngrok.

SDK cần development build, không hoạt động trong Expo Go. `Mobile/.env` cần Google Web Client ID, Google iOS Client ID, Facebook App ID và Facebook Client Token theo `.env.example`. Client Token của Facebook khác App Secret; không đưa Client Secret/App Secret vào Mobile. Google iOS Client phải khớp Bundle ID. Android OAuth Client phải khớp package và SHA-1 của chứng chỉ ký. Các giá trị Bundle ID/package mặc định là `com.melodify.mobile`, có thể đổi qua biến môi trường trước khi build.

`composer dev:mobile` chạy PHP trên LAN và bật OPcache riêng cho tiến trình local (vẫn kiểm tra thay đổi file). Khi IP máy đổi, cập nhật origin Expo Web tương ứng trong `Backend/.env` → `CORS_ALLOWED_ORIGINS`.

Kiểm tra và build:

```bash
npm run auth:check -- ios
npm run build:ios
# hoặc npm run build:android
# Cài bản build lên điện thoại, sau đó:
npm start -- --clear
```

Build iOS từ Windows sử dụng EAS và cần tài khoản Expo, Apple signing cho iPhone thật. Cấu hình các biến SDK tương ứng trong môi trường EAS vì `.env` không được commit. Thay đổi Client ID, Bundle ID hoặc plugin cần build lại ứng dụng.

Facebook iOS: API hiện chỉ nhận Graph access token. Khi người dùng từ chối ATT, Facebook Limited Login trả OIDC token không tương thích với API này; Mobile hiển thị thông báo và cho phép dùng Google/mật khẩu, không gửi OIDC token như access token. Hỗ trợ đầy đủ Limited Login cần thay đổi backend riêng.

Expo Web vẫn dùng luồng OAuth trình duyệt qua `EXPO_PUBLIC_OAUTH_BASE_URL` và `/oauth/callback`; callback của backend cần được đăng ký trong Google/Meta. Luồng web độc lập với SDK native ở trên.

## 3. Nguyên tắc tổ chức component

Không viết toàn bộ giao diện, logic gọi API và xử lý state trực tiếp trong file route của `src/app/`.

### Quy ước dành cho người phát triển

Khi pull dự án về, hãy tìm code theo tên chức năng trong `src/components/`. Mỗi chức năng của ứng dụng phải nằm trong một folder riêng, để người đọc có thể biết ngay screen, component, API và type của chức năng đó đang ở đâu. Không dồn code của nhiều chức năng vào một route hoặc một component lớn.

Hiện tại project đã có các folder `home`, `music`, `player` và `shared`. Khi thêm chức năng mới, hãy tạo thêm folder theo tên chức năng thật như `playlist`, `profile` hoặc tên phù hợp với nghiệp vụ:

```text
Mobile/
├── src/
│   ├── app/
│   │   ├── index.tsx             # Redirect từ / đến /home
│   │   ├── home/
│   │   │   └── index.tsx         # Route /home, chỉ gọi HomeScreen
│   │   ├── explore.tsx           # Chỉ gọi component explore
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx
│   │   │   └── index.ts            # Export layout dùng chung
│   │   ├── home/
│   │   │   ├── HomeScreen.tsx
│   │   │   ├── RecommendedSongs.tsx
│   │   │   └── index.ts
│   │   ├── music/
│   │   │   ├── SongCard.tsx
│   │   │   ├── SongList.tsx
│   │   │   └── index.ts
│   │   ├── player/
│   │   │   ├── MusicPlayer.tsx
│   │   │   ├── PlayerControls.tsx
│   │   │   └── index.ts
│   │   └── shared/
│   │       ├── AppButton.tsx
│   │       ├── AppModal.tsx
│   │       ├── Loading.tsx
│   │       └── index.ts
│   ├── lib/
│   │   └── api.ts
│   ├── hooks/
│   ├── constants/
│   └── types/
└── app.json
```

### Quy tắc bắt buộc

1. Mỗi feature có một folder riêng trong `src/components/`.
2. Component lớn phải được chia thành các component nhỏ theo đúng trách nhiệm.
3. File route trong `src/app/` chỉ làm nhiệm vụ điều hướng và gọi screen/component. Mỗi folder có `index.tsx` sẽ tạo một đường dẫn tương ứng.
4. `src/app/index.tsx` là đường dẫn `/` và redirect sang `/home`; `src/app/home/index.tsx` là đường dẫn `/home`.
5. File `index.ts` chỉ export, không viết JSX hoặc logic nghiệp vụ trong file này. Đây là public entry point của feature để người khác import mà không cần biết cấu trúc file bên trong.
6. API request phải đi qua `src/lib/api.ts` hoặc API service của feature.
7. Layout dùng chung đặt trong `src/components/layout/`; component dùng chung đặt trong `src/components/shared/`.
8. Hook dùng chung đặt trong `src/hooks/`; hằng số đặt trong `src/constants/`.
9. Type đặt trong `src/types/` hoặc file type riêng trong feature.
10. Tên component dùng PascalCase; tên folder feature dùng chữ thường.
11. Không copy cùng một component vào nhiều màn hình; hãy export và tái sử dụng.

Ví dụ route chỉ gọi screen:

```tsx
import { FeatureScreen } from '@/components/feature-name';

export default function FeatureRoute() {
  return <FeatureScreen />;
}
```

File `src/components/home/index.ts` chỉ export:

```ts
export { default as HomeScreen } from './HomeScreen';
```

Code giao diện và logic của từng phần phải nằm trong component tương ứng, sau đó route chỉ gọi component thông qua public export của folder. Vì vậy, người pull code chỉ cần mở route để xem route đang gọi screen nào, rồi mở folder feature đó để đọc từng phần.

## 4. Quy tắc gọi API

API wrapper trung tâm:

```text
Mobile/src/lib/api.ts
```

Luồng chuẩn:

```text
Expo route → Screen/Feature component → API wrapper → Laravel API
```

Ví dụ bất kỳ feature nào có API riêng:

```text
src/components/feature-name/
├── FeatureScreen.tsx
├── FeatureList.tsx
├── feature.api.ts
├── feature.types.ts
└── index.ts
```

- `feature.api.ts`: các hàm gọi API của feature.
- `feature.types.ts`: type riêng của feature.
- `index.ts`: public exports của feature, là nơi duy nhất để route hoặc feature khác import component.
- Component: chỉ hiển thị UI và gọi hook/service cần thiết.

Không viết URL API trực tiếp trong JSX. Không để MongoDB URI, Cloudinary API Secret hoặc Gmail password trong ứng dụng mobile.

## 5. Quy tắc route và screen

- `src/app/` chỉ chứa route theo Expo Router.
- Mỗi route nên gọi một screen trong `src/components/<feature>/`.
- Logic nghiệp vụ không đặt trong file route.
- Screen có thể chia tiếp thành các component con.
- Component cần dùng state, effect hoặc event handler thì đặt logic đó ở component nhỏ nhất phù hợp.

Khi review hoặc tiếp tục phát triển code, hãy lần theo luồng `route → screen → component → API service`. Giữ đúng luồng này để người mới pull dự án có thể đọc và hiểu code mà không phải tìm logic rải rác trong nhiều route.

Ví dụ:

```text
src/app/feature-name/index.tsx
        ↓
src/components/feature-name/FeatureScreen.tsx
        ├── FeatureHeader.tsx
        ├── FeatureMenu.tsx
        └── FeatureList.tsx
```

## 6. Biến môi trường

Không commit `.env`.

Local trên máy tính:

```env
EXPO_PUBLIC_API_URL=http://127.0.0.1:8000/api
```

Local trên điện thoại thật:

```env
EXPO_PUBLIC_API_URL=http://localhost:8000/api
```

Trong Expo LAN, app tự thay `localhost` bằng host Metro. Nếu không dùng Expo LAN, thay bằng IP LAN hiện tại của máy chạy Backend.

Production (đặt cả hai URL về Backend production):

```env
EXPO_PUBLIC_API_URL=https://<backend-service>.onrender.com/api
EXPO_PUBLIC_OAUTH_BASE_URL=https://<backend-service>.onrender.com
```

Sau khi tạo/sửa `Mobile/.env`, khởi động lại Metro (có thể dùng `npx expo start --clear`) để Expo nạp biến mới. Chỉ các biến bắt đầu bằng `EXPO_PUBLIC_` mới được đưa vào bundle client. Không đặt secret server vào các biến này.

## 7. Kiểm tra và build

```bash
npm run lint
npx expo start
npx expo run:android
npx expo run:ios
```

Trước khi tạo bản build, kiểm tra API production, deep link, quyền thiết bị và cấu hình trong `app.json`.

## 8. Checklist khi tạo feature mới

1. Tạo folder feature trong `src/components/`.
2. Tạo screen chính và chia thành component nhỏ.
3. Tạo API service và type riêng nếu feature cần.
4. Tạo `index.ts` chỉ để export.
5. Route trong `src/app/` chỉ import screen từ folder feature.
6. Tái sử dụng component trong `shared/` thay vì copy code.
7. Chạy `npm run lint`.
8. Kiểm tra trên Android, iOS hoặc Expo Go tùy feature.
