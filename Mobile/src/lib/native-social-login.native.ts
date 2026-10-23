import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

import { loginWithSocialAccessToken, saveAuthSession } from './api';

let signingIn = false;
let googleConfigured = false;

async function googleAccessToken(): Promise<string | null> {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();
  if (!webClientId || (Platform.OS === 'ios' && !iosClientId)) {
    throw new Error('Thiếu Google Client ID cho nền tảng này. Cập nhật cấu hình ứng dụng rồi tạo lại development build.');
  }
  const { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } = await import('@react-native-google-signin/google-signin');
  if (!googleConfigured) {
    GoogleSignin.configure({ webClientId, iosClientId, offlineAccess: false, scopes: ['email', 'profile'] });
    googleConfigured = true;
  }
  try {
    if (Platform.OS === 'android') await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) return null;
    return (await GoogleSignin.getTokens()).accessToken;
  } catch (error) {
    if (isErrorWithCode(error)) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) return null;
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error('Thiết bị cần Google Play Services để đăng nhập Google.');
      }
      if (error.code === '10' || error.code === 'DEVELOPER_ERROR') {
        throw new Error('Google chưa khớp cấu hình ứng dụng Android. Kiểm tra package name và SHA-1 của bản build.');
      }
    }
    throw error;
  }
}

async function facebookAccessToken(): Promise<string | null> {
  if (!process.env.EXPO_PUBLIC_FACEBOOK_APP_ID?.trim() || !process.env.EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN?.trim()) {
    throw new Error('Thiếu Facebook App ID hoặc Client Token. Cập nhật cấu hình rồi tạo lại development build.');
  }
  const { AccessToken, LoginManager, Settings } = await import('react-native-fbsdk-next');
  if (Platform.OS === 'ios') {
    const { requestTrackingPermissionsAsync } = await import('expo-tracking-transparency');
    const permission = await requestTrackingPermissionsAsync();
    if (permission.status !== 'granted') {
      // The existing API validates Graph access tokens, not Limited Login JWTs.
      throw new Error('Facebook trên iOS đang dùng Limited Login, nhưng API hiện chưa hỗ trợ loại phiên này. Bạn có thể đăng nhập bằng Google hoặc mật khẩu.');
    }
    await Settings.setAdvertiserTrackingEnabled(true);
  }
  Settings.initializeSDK();
  const response = await LoginManager.logInWithPermissions(['public_profile', 'email'], 'enabled');
  if (response.isCancelled) return null;
  const token = await AccessToken.getCurrentAccessToken();
  if (!token?.accessToken) {
    throw new Error('Facebook chưa cấp access token tương thích với API. Hãy thử Google hoặc đăng nhập bằng mật khẩu.');
  }
  return token.accessToken;
}

export async function signInWithNativeProvider(provider: 'google' | 'facebook'): Promise<boolean> {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    throw new Error('Hãy mở bản Melodify development build đã cài trên điện thoại. Expo Go không có SDK đăng nhập Google/Facebook.');
  }
  if (signingIn) return false;
  signingIn = true;
  try {
    const token = provider === 'google' ? await googleAccessToken() : await facebookAccessToken();
    if (token === null) return false;
    if (!token.trim()) throw new Error('Google/Facebook chưa trả về access token. Vui lòng thử lại.');
    const auth = await loginWithSocialAccessToken(provider, token);
    if (!auth.token || !auth.user?.id) {
      throw new Error('API chưa trả về phiên đăng nhập hợp lệ. Vui lòng thử lại.');
    }
    await saveAuthSession(auth);
    return true;
  } finally {
    signingIn = false;
  }
}
