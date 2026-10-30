import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, Text, View } from 'react-native';

import { completeSocialLogin } from '@/lib/social-login';

export default function OAuthCallback() {
  const { ticket, error } = useLocalSearchParams<{ ticket?: string; error?: string }>();
  const router = useRouter();
  const [webApiBase] = useState(() => Platform.OS === 'web' && typeof window !== 'undefined'
    ? window.sessionStorage.getItem('melodify_oauth_api') ?? undefined
    : undefined);
  const missingSession = Platform.OS === 'web' && !webApiBase;
  const [failure, setMessage] = useState('');
  const message = failure || (error || !ticket || missingSession
    ? error === 'login_cancelled'
      ? 'Bạn đã hủy đăng nhập.'
      : 'Không thể hoàn tất đăng nhập. Vui lòng quay lại và thử lại.'
    : '');

  useEffect(() => {
    if (error || !ticket || missingSession) {
      return;
    }
    let active = true;
    if (Platform.OS === 'web') window.history.replaceState(null, '', '/oauth/callback');
    void completeSocialLogin(ticket, webApiBase).then(() => {
      if (Platform.OS === 'web') window.sessionStorage.removeItem('melodify_oauth_api');
      if (active) router.replace('/me');
    }).catch((reason: unknown) => {
      if (active) setMessage(reason instanceof Error ? reason.message : 'Đăng nhập thất bại. Vui lòng thử lại.');
    });
    return () => { active = false; };
  }, [ticket, error, router, webApiBase, missingSession]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 }}>
      {message ? <>
        <Text>{message}</Text>
        <Pressable onPress={() => router.replace('/login')}><Text>Quay lại đăng nhập</Text></Pressable>
      </> : <><ActivityIndicator /><Text>Đang hoàn tất đăng nhập…</Text></>}
    </View>
  );
}
