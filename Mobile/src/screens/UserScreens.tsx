import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppShell } from '@/components/layout';
import { Artwork } from '@/components/music';
import { PageHeading, ScrollPage, SectionHeading, StateMessage, useSurfaceStyles } from '@/components/shared';
import { AppIcon } from '@/components/shared/AppIcon';
import { useRemoteData } from '@/hooks/useRemoteData';
import { getLibrary, getPublicUser, getSavedAuthUser, getVisitorId, setFollowing } from '@/lib/api';
import { useAdaptiveStyles } from '@/hooks/use-adaptive-styles';
import { useTheme } from '@/hooks/use-theme';

export function UserProfileScreen() {
  const styles = useAdaptiveStyles(baseStyles);
  const surface = useSurfaceStyles();
  const { identifier: param } = useLocalSearchParams<{ identifier: string }>();
  const identifier = Array.isArray(param) ? param[0] : param ?? '';
  const { data, loading, error, reload } = useRemoteData(async () => (await getPublicUser(identifier)).data, identifier);
  return <AppShell><ScrollPage>{loading || error ? <StateMessage loading={loading} error={error} onRetry={() => void reload()} /> : null}
    {data ? <View style={[styles.profile, surface.card]}><Artwork uri={data.avatar_url} size={88} round /><Text style={styles.name}>{data.name}</Text><Text style={styles.username}>{data.username ? '@' + data.username : 'Người dùng Melodify'}</Text><View style={styles.counts}><Count label="Đang theo dõi" count={data.following_count} /><Count label="Người theo dõi" count={data.followers_count} /></View><UserFollowButton key={data.id} identifier={data.username || data.id} initial={data.is_following} /></View> : null}
  </ScrollPage></AppShell>;
}

function Count({ label, count }: { label: string; count: number }) {
  const styles = useAdaptiveStyles(baseStyles);
  return <View style={styles.count}><Text style={styles.countNumber}>{count.toLocaleString()}</Text><Text style={styles.countLabel}>{label}</Text></View>;
}

function UserFollowButton({ identifier, initial }: { identifier: string; initial: boolean }) {
  const styles = useAdaptiveStyles(baseStyles);
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [following, setFollowingState] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { void getSavedAuthUser().then((user) => { setSignedIn(Boolean(user)); setReady(true); }); }, []);
  const toggle = async () => {
    if (!signedIn) {
      router.push('/login' as never);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = await setFollowing('user', identifier, !following);
      setFollowingState(result.following);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể cập nhật theo dõi.');
    } finally {
      setBusy(false);
    }
  };
  return <View style={styles.followWrap}><Pressable disabled={!ready || busy} onPress={() => void toggle()} style={styles.followButton}><Text style={styles.followText}>{signedIn ? (following ? 'Đang theo dõi' : 'Theo dõi') : 'Đăng nhập để theo dõi'}</Text></Pressable>{error ? <Text style={styles.error}>{error}</Text> : null}</View>;
}

export function FollowingScreen() {
  const styles = useAdaptiveStyles(baseStyles);
  const theme = useTheme();
  const { data, loading, error, reload } = useRemoteData(async () => (await getLibrary(await getVisitorId())).data);
  const artists = data?.following_artists ?? [];
  const users = data?.following_users ?? [];
  const router = useRouter();
  return <AppShell><ScrollPage><PageHeading title="Đang theo dõi" subtitle="Nghệ sĩ và người dùng bạn đã theo dõi." />
    {loading || error ? <StateMessage loading={loading} error={error} onRetry={() => void reload()} /> : null}
    {artists.length ? <View style={styles.list}><SectionHeading title="Nghệ sĩ" />{artists.map((artist) => <Pressable key={artist.id} onPress={() => router.push(('/artist/' + (artist.slug || artist.id)) as never)} style={styles.personRow}><Artwork uri={artist.avatar_url} size={48} round /><Text style={styles.personName}>{artist.name}</Text><AppIcon name="chevron" color={theme.primary} size={18} /></Pressable>)}</View> : null}
    {users.length ? <View style={styles.list}><SectionHeading title="Người dùng" />{users.map((user) => <Pressable key={user.id} onPress={() => router.push(('/user/' + (user.username || user.id)) as never)} style={styles.personRow}><Artwork uri={user.avatar_url} size={48} round /><Text style={styles.personName}>{user.name}</Text><AppIcon name="chevron" color={theme.primary} size={18} /></Pressable>)}</View> : null}
    {data && !artists.length && !users.length ? <StateMessage empty="Bạn chưa theo dõi nghệ sĩ hoặc người dùng nào." /> : null}
  </ScrollPage></AppShell>;
}

export function FollowersScreen() {
  const styles = useAdaptiveStyles(baseStyles);
  const theme = useTheme();
  const { data, loading, error, reload } = useRemoteData(async () => (await getLibrary(await getVisitorId())).data);
  const router = useRouter();
  return <AppShell><ScrollPage><PageHeading title="Người theo dõi" subtitle={data ? data.followers_count.toLocaleString() + ' người theo dõi' : undefined} />
    {loading || error ? <StateMessage loading={loading} error={error} onRetry={() => void reload()} /> : null}
    {data?.followers.length ? <View style={styles.list}>{data.followers.map((user) => <Pressable key={user.id} onPress={() => router.push(('/user/' + (user.username || user.id)) as never)} style={styles.personRow}><Artwork uri={user.avatar_url} size={48} round /><Text style={styles.personName}>{user.name}</Text><AppIcon name="chevron" color={theme.primary} size={18} /></Pressable>)}</View> : null}
    {data && !data.followers.length ? <StateMessage empty="Chưa có người theo dõi được hiển thị." /> : null}
  </ScrollPage></AppShell>;
}

const baseStyles = StyleSheet.create({
  profile: { alignItems: 'center', padding: 22, gap: 10 },
  name: { color: '#F5F7F6', fontSize: 23, fontWeight: '900', textAlign: 'center' },
  username: { color: '#AEB8B3', fontSize: 13 },
  counts: { flexDirection: 'row', gap: 32, marginVertical: 8 },
  count: { alignItems: 'center', gap: 3 },
  countNumber: { color: '#F5F7F6', fontSize: 16, fontWeight: '900' },
  countLabel: { color: '#9CA8A2', fontSize: 10 },
  followWrap: { width: '100%', alignItems: 'center', gap: 6 },
  followButton: { minHeight: 39, paddingHorizontal: 18, justifyContent: 'center', borderRadius: 22, borderWidth: 1, borderColor: '#75817B' },
  followText: { color: '#F5F7F6', fontSize: 12, fontWeight: '800' },
  error: { color: '#FF8A80', fontSize: 11 },
  list: { gap: 7 },
  personRow: { minHeight: 62, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 12, backgroundColor: '#202A28' },
  personName: { flex: 1, color: '#F5F7F6', fontSize: 14, fontWeight: '800' },
});
