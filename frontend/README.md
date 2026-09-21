# Melodify Frontend

Frontend website của Melodify được xây dựng bằng Next.js, React, TypeScript và Tailwind CSS. Website chỉ giao tiếp với Laravel Backend thông qua API wrapper, không kết nối trực tiếp tới MongoDB hoặc Cloudinary.

## 1. Công nghệ

- Next.js 16 với App Router.
- React 19.
- TypeScript.
- Tailwind CSS 4.
- API wrapper tập trung tại `lib/api.ts`.

## 2. Cài đặt và chạy

```bash
npm install
copy .env.example .env.local
npm run dev
```

Tạo `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api
```

Website chạy tại `http://localhost:3000`.

Các lệnh:

```bash
npm run dev
npm run lint
npm run build
npm run start
```

## 3. Nguyên tắc tổ chức component

Không viết toàn bộ JSX, xử lý API và logic nghiệp vụ trực tiếp trong `app/page.tsx` hoặc các page khác.

### Quy ước dành cho người phát triển

Khi pull dự án về, hãy tìm code theo tên chức năng trong `components/`. Mỗi chức năng của website phải nằm trong một folder riêng, để người đọc có thể biết ngay UI, API và type của chức năng đó đang ở đâu. Không dồn code của nhiều chức năng vào một page hoặc một component lớn.

Hiện tại project đã có các folder `home`, `music`, `player` và `shared`. Khi thêm chức năng mới, hãy tạo thêm folder theo tên chức năng thật như `playlist`, `profile` hoặc tên phù hợp với nghiệp vụ:

```text
frontend/
├── app/
│   ├── page.tsx                 # Chỉ redirect đến route home
│   └── home/
│       └── page.tsx             # Chỉ gọi các section của home
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx
│   │   └── index.ts              # Export layout dùng chung
│   ├── home/
│   │   ├── sections/
│   │   │   ├── HeroSection.tsx
│   │   │   └── FeaturedSongsSection.tsx
│   │   └── index.ts
│   ├── music/
│   │   ├── SongCard.tsx
│   │   └── index.ts
│   ├── player/
│   │   ├── MusicPlayer.tsx
│   │   ├── PlayerControls.tsx
│   │   └── index.ts
│   └── shared/
│       ├── Button.tsx
│       ├── Modal.tsx
│       ├── Loading.tsx
│       └── index.ts
├── lib/
│   └── api.ts
└── types/
    └── index.ts
```

### Quy tắc bắt buộc

1. Mỗi feature có một folder riêng trong `components/`.
2. Một component lớn phải được chia thành các component nhỏ cùng feature.
3. Layout dùng chung đặt trong `components/layout/`; component dùng chung đặt trong `components/shared/`.
4. File `index.ts` chỉ dùng để export, không viết JSX hoặc logic nghiệp vụ trong file này. Đây là public entry point để import mà không cần biết cấu trúc file bên trong.
5. Folder chức năng trong `app/` chỉ import và lắp ráp các section tương ứng từ `components/`.
6. API request phải gọi qua `lib/api.ts` hoặc service riêng của feature, không gọi `fetch` rải rác trong JSX.
7. Type dùng chung đặt trong `types/`; không lặp lại type ở nhiều component.
8. Tên component dùng PascalCase; tên folder feature dùng chữ thường.

Ví dụ page chỉ gọi component:

```tsx
import { FeatureScreen } from '@/components/feature-name';

export default function FeaturePage() {
  return <FeatureScreen />;
}
```

File `components/home/index.ts` chỉ export các section:

```ts
export { default as FeaturedSongsSection } from './sections/FeaturedSongsSection';
export { default as HeroSection } from './sections/HeroSection';
```

Code giao diện và logic của từng phần phải nằm trong section/component tương ứng, sau đó được export qua `index.ts`. Người pull code chỉ cần mở `app/<feature>/page.tsx`, rồi mở `components/<feature>/sections/` để đọc từng phần. Page chỉ sắp xếp section, không viết giao diện trực tiếp.

## 4. Quy tắc gọi API

API wrapper trung tâm là `lib/api.ts`:

```text
frontend/lib/api.ts
```

Luồng chuẩn:

```text
app/<feature>/page.tsx → components/<feature>/sections → component nhỏ → API wrapper → Laravel API
```

Component không được biết thông tin MongoDB, Cloudinary secret hoặc Gmail. Chỉ biến `NEXT_PUBLIC_API_URL` được phép xuất hiện ở frontend.

Ví dụ tổ chức cho bất kỳ feature nào:

```text
components/feature-name/
├── FeatureScreen.tsx
├── FeatureList.tsx
├── feature.api.ts
├── feature.types.ts
└── index.ts
```

Mỗi folder feature có `index.ts` để export public API của folder. Ví dụ `app/home/page.tsx` import section từ `@/components/home`, không import sâu từng file nếu không cần.

## 5. Quy tắc Server Component và Client Component

- Mặc định dùng Server Component.
- Chỉ thêm `'use client'` khi component cần state, event handler, browser API hoặc hook.
- Đặt Client Component ở leaf component nhỏ nhất có thể.
- Không biến toàn bộ page thành Client Component nếu chỉ một phần nhỏ cần tương tác.

## 6. Biến môi trường

Không commit `.env.local`.

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api
```

Production:

```env
NEXT_PUBLIC_API_URL=https://<backend-service>.onrender.com/api
```

Không đặt các biến sau trong frontend:

- `MONGODB_URI`
- `CLOUDINARY_API_SECRET`
- `MAIL_PASSWORD`
- bất kỳ private key hoặc server secret nào

## 7. Deploy

Trên Vercel hoặc nền tảng Node.js:

- Root Directory: `frontend`
- Install command: `npm install`
- Build command: `npm run build`
- Start command: `npm run start`
- Environment variable: `NEXT_PUBLIC_API_URL`

Backend production phải cho phép domain frontend trong cấu hình CORS.

## 8. Checklist khi tạo feature mới

1. Tạo folder feature trong `app/` và `components/`.
2. Tạo folder `sections/` trong component feature.
3. Chia giao diện thành các section nhỏ.
4. Tạo `index.ts` để export section.
5. Page chỉ import section từ public export của feature.
6. Tách API request và type khỏi UI.
7. Chạy `npm run lint`.
8. Chạy `npm run build` trước khi deploy.
