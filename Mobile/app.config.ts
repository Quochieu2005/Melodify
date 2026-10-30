import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();
  const facebookAppId = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID?.trim();
  const facebookClientToken = process.env.EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN?.trim();
  const isDevelopmentBuild = !process.env.EAS_BUILD || process.env.EAS_BUILD_PROFILE?.startsWith('development');
  const allowLocalHttp = Boolean(isDevelopmentBuild && process.env.EXPO_PUBLIC_API_URL?.startsWith('http://'));
  const plugins: NonNullable<ExpoConfig['plugins']> = [...(config.plugins ?? [])];
  plugins.push(['expo-build-properties', { android: { usesCleartextTraffic: allowLocalHttp } }]);
  if (iosClientId) {
    plugins.push(['@react-native-google-signin/google-signin', {
      iosUrlScheme: iosClientId.split('.').reverse().join('.'),
    }]);
  }
  if (facebookAppId && facebookClientToken) {
    plugins.push(['react-native-fbsdk-next', {
      appID: facebookAppId,
      clientToken: facebookClientToken,
      displayName: config.name ?? 'Melodify',
      scheme: `fb${facebookAppId}`,
      autoLogAppEventsEnabled: false,
      advertiserIDCollectionEnabled: false,
      isAutoInitEnabled: false,
      iosUserTrackingPermission: false,
    }]);
  }
  plugins.push(['expo-tracking-transparency', {
    userTrackingPermission: 'Facebook cần quyền theo dõi để cấp access token cho phương thức đăng nhập này. Bạn có thể từ chối và đăng nhập bằng Google hoặc mật khẩu.',
  }]);
  return {
    ...config,
    name: config.name ?? 'Melodify',
    slug: config.slug ?? 'Mobile',
    ios: {
      ...config.ios,
      bundleIdentifier: process.env.IOS_BUNDLE_IDENTIFIER || config.ios?.bundleIdentifier || 'com.melodify.mobile',
      infoPlist: {
        ...config.ios?.infoPlist,
        ...(allowLocalHttp ? {
          NSLocalNetworkUsageDescription: 'Melodify kết nối máy chủ phát triển trên mạng Wi-Fi của bạn.',
          NSAppTransportSecurity: {
            ...config.ios?.infoPlist?.NSAppTransportSecurity,
            NSAllowsLocalNetworking: true,
            NSAllowsArbitraryLoads: true,
          },
        } : {}),
      },
    },
    android: {
      ...config.android,
      package: process.env.ANDROID_PACKAGE || config.android?.package || 'com.melodify.mobile',
    },
    plugins,
  };
};
