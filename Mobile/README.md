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
npx expo start
```

Tạo `Mobile/.env`:

```env
EXPO_PUBLIC_API_URL=http://<LAN-IP-cua-may>:8000/api
```

Khi chạy trên điện thoại thật, không dùng `localhost`. Điện thoại và máy tính chạy backend phải cùng mạng Wi-Fi.

Các lệnh:

```bash
npx expo start
npm run android
npm run ios
npm run web
npm run lint
```

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
EXPO_PUBLIC_API_URL=http://192.168.x.x:8000/api
```

Production:

```env
EXPO_PUBLIC_API_URL=https://<backend-service>.onrender.com/api
```

Chỉ các biến bắt đầu bằng `EXPO_PUBLIC_` mới được đưa vào bundle client. Không đặt secret server vào các biến này.

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
