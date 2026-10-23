// Metro selects native-social-login.native.ts on Android/iOS.
export async function signInWithNativeProvider(_provider: 'google' | 'facebook'): Promise<boolean> {
  throw new Error('Đăng nhập SDK chỉ dùng trong ứng dụng iOS/Android.');
}
