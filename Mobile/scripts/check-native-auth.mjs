import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
process.env.NODE_ENV ??= 'development';
require('@expo/env').load(fileURLToPath(new URL('..', import.meta.url)));
const platform = process.argv[2] || process.env.EAS_BUILD_PLATFORM || 'all';
if (!['ios', 'android', 'all'].includes(platform)) {
  console.error('Dùng npm run auth:check -- ios hoặc android.');
  process.exit(1);
}
const required = [
  'EXPO_PUBLIC_API_URL',
  'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
  'EXPO_PUBLIC_FACEBOOK_APP_ID',
  'EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN',
];
if (platform !== 'android') required.push('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID');
const missing = required.filter((key) => !process.env[key]?.trim());
if (missing.length) {
  console.error(`Chưa thể build đăng nhập ${platform}. Bổ sung vào Mobile/.env (và môi trường EAS):\n${missing.join('\n')}`);
  console.error('Google iOS Client ID phải thuộc Bundle ID của app. Facebook Client Token không phải App Secret.');
  process.exit(1);
}
for (const key of ['EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID', ...(platform !== 'android' ? ['EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID'] : [])]) {
  if (!process.env[key].trim().endsWith('.apps.googleusercontent.com')) {
    console.error(`${key} không phải Google OAuth Client ID hợp lệ.`);
    process.exit(1);
  }
}
console.log(`Đã có các biến cấu hình ${platform}. Cần khớp Bundle ID / package và chứng chỉ ký trong Google/Meta.`);
console.log('Bản iPhone thật cần Apple signing và đăng nhập Expo/EAS để build.');
