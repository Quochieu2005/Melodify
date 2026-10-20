import type { PropsWithChildren } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePathname, useRouter } from 'expo-router';

import { useMusic } from '@/components/music';
import { AppIcon } from '@/components/shared/AppIcon';

const tabs = [
  { label: 'Trang chủ', icon: 'home', route: '/home' },
  { label: 'Khám phá', icon: 'waveform', route: '/explore' },
  { label: 'Dành cho bạn', icon: 'for-you', route: '/for-you' },
  { label: 'Thư viện', icon: 'library', route: '/me' },
] as const;

export default function AppShell({ children }: PropsWithChildren) {
  const router = useRouter();
  const pathname = usePathname();
  const { track, isPlaying, isBuffering, togglePlay, next } = useMusic();

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
      <View style={styles.root}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" onPress={() => router.push('/home')} style={styles.brand}>
            <View style={styles.logo}><AppIcon name="music" color="#082326" size={21} /></View>
            <Text style={styles.brandText}>Melodify</Text>
          </Pressable>
          <Pressable accessibilityRole="search" onPress={() => router.push('/search' as never)} style={styles.search}>
            <AppIcon name="search" color="#C2C8C5" size={19} />
            <Text numberOfLines={1} style={styles.searchText}>Tìm bài hát, nghệ sĩ…</Text>
          </Pressable>
        </View>

        <View style={styles.content}>{children}</View>

        <View style={styles.player}>
          <Pressable
            accessibilityRole="button"
            onPress={() => track?.slug ? router.push(('/song/' + track.slug) as never) : router.push('/recent' as never)}
            style={styles.playerMain}
          >
            <View style={styles.playerArt}>
              <AppIcon name="music" color="#00D3E5" size={21} />
            </View>
            <View style={styles.trackText}>
              <Text numberOfLines={1} style={styles.trackTitle}>{track?.title ?? 'Chọn bài hát để phát'}</Text>
              {track ? <Text numberOfLines={1} style={styles.trackArtist}>{track.artists?.map((artist) => artist.name).join(', ') || track.artist?.name || 'Melodify'}</Text> : null}
            </View>
          </Pressable>
          <Pressable accessibilityLabel={isPlaying ? 'Tạm dừng' : 'Phát'} onPress={togglePlay} style={styles.playButton}>
            {isBuffering ? <ActivityIndicator color="#F5F7F6" size="small" /> : <AppIcon name={isPlaying ? 'pause' : 'play'} size={19} />}
          </Pressable>
          <Pressable accessibilityLabel="Bài tiếp theo" onPress={next} style={styles.nextButton}>
            <AppIcon name="next" color="#B7C1BC" size={20} />
          </Pressable>
        </View>

        <View style={styles.tabs}>
          {tabs.map((tab) => {
            const active = pathname === tab.route || pathname.startsWith(tab.route + '/');
            return (
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                key={tab.route}
                onPress={() => router.push(tab.route as never)}
                style={styles.tab}
              >
                <AppIcon name={tab.icon} color={active ? '#00D3E5' : '#8D9993'} size={21} />
                <Text numberOfLines={1} style={[styles.tabLabel, active && styles.active]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#151817' },
  root: { flex: 1, backgroundColor: '#151817' },
  header: { minHeight: 62, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#202A28' },
  brand: { flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#00D3E5' },
  brandText: { color: '#F5F7F6', fontSize: 16, fontWeight: '900' },
  search: { flex: 1, minWidth: 0, height: 40, borderRadius: 22, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#34413D' },
  searchText: { color: '#AEB8B3', fontSize: 13, flex: 1 },
  content: { flex: 1 },
  player: { minHeight: 62, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#242927', borderTopWidth: 1, borderTopColor: '#303735' },
  playerMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
  playerArt: { width: 42, height: 42, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#35413D' },
  trackText: { flex: 1, gap: 3 },
  trackTitle: { color: '#F5F7F6', fontSize: 13, fontWeight: '800' },
  trackArtist: { color: '#9CA8A2', fontSize: 11 },
  playButton: { minWidth: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  nextButton: { width: 30, height: 36, alignItems: 'center', justifyContent: 'center' },
  tabs: { minHeight: 58, backgroundColor: '#202624', borderTopWidth: 1, borderTopColor: '#303735', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 4 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, minHeight: 52 },
  tabLabel: { color: '#9CA8A2', fontSize: 9, fontWeight: '700' },
  active: { color: '#00D3E5' },
});
