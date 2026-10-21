import { useState, type PropsWithChildren } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

import { useMusic } from '@/components/music';
import { FullPlayerModal, QueueBottomSheet } from '@/components/player';
import { AppIcon } from '@/components/shared/AppIcon';
import { getVisitorId, toggleSongFavorite } from '@/lib/api';

const tabs = [
  { label: 'Dành cho bạn', icon: 'for-you', route: '/for-you' },
  { label: 'Khám phá', icon: 'waveform', route: '/home' },
  { label: 'Của tui', icon: 'user', route: '/me' },
] as const;

export default function AppShell({
  children,
  hideHeader = false,
  customHeader,
}: PropsWithChildren<{
  hideHeader?: boolean;
  customHeader?: React.ReactNode;
}>) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const {
    track,
    isPlaying,
    isBuffering,
    currentTime,
    duration,
    togglePlay,
  } = useMusic();

  const [showFullPlayer, setShowFullPlayer] = useState(false);
  const [queueSheetOpen, setQueueSheetOpen] = useState(false);
  const [favorite, setFavorite] = useState(Boolean(track?.is_favorite));
  const [favoriteBusy, setFavoriteBusy] = useState(false);

  const progressPercent =
    duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  const handlePlayerPress = () => {
    if (track) {
      setShowFullPlayer(true);
    } else {
      router.push('/home' as never);
    }
  };

  const handleToggleFavorite = async () => {
    if (favoriteBusy || !track) return;
    setFavoriteBusy(true);
    try {
      const visitorId = await getVisitorId();
      const res = await toggleSongFavorite(track.slug || track.id, visitorId);
      setFavorite(res.favorited);
    } catch {
      // Keep state
    } finally {
      setFavoriteBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      {/* Seamless pastel green-to-white gradient starting from screen y=0 */}
      <LinearGradient
        colors={['#86EED2', '#BCF7E5', '#EDFCF7', '#FFFFFF']}
        locations={[0, 0.16, 0.36, 0.65]}
        style={styles.gradientTop}
      />

      {/* Top Header Bar (Padded safely below iOS Status Bar) */}
      {!hideHeader && (
        customHeader ? (
          <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 4 }]}>
            {customHeader}
          </View>
        ) : (
          <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 4 }]}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/home')}
              style={styles.brand}
            >
              <View style={styles.logo}>
                <AppIcon name="waveform" color="#FFFFFF" size={16} />
              </View>
              <Text numberOfLines={1} style={styles.brandText}>
                Mạng Xã Hội âm nhạc Melodify
              </Text>
            </Pressable>

            <View style={styles.headerRight}>
              <Pressable
                accessibilityRole="search"
                accessibilityLabel="Tìm kiếm"
                onPress={() => router.push('/search' as never)}
                style={styles.headerCircleBtn}
              >
                <AppIcon name="search" color="#334155" size={17} />
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Khám phá"
                onPress={() => router.push('/explore' as never)}
                style={styles.headerCircleBtn}
              >
                <AppIcon name="waveform" color="#334155" size={17} />
              </Pressable>
            </View>
          </View>
        )
      )}

      {/* Main Content Area */}
      <View style={styles.content}>{children}</View>

      {/* Floating Mini Player (Ảnh 1) */}
      <View style={styles.playerContainer}>
        <View style={styles.playerCard}>
          {/* Subtle progress indicator */}
          <View style={styles.miniProgressTrack}>
            <View
              style={[
                styles.miniProgressFill,
                { width: `${progressPercent}%` },
              ]}
            />
          </View>

          <View style={styles.playerRow}>
            {/* Tapping main area opens Full Lyrics Player */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Mở lời bài hát"
              onPress={handlePlayerPress}
              style={styles.playerMain}
            >
              <View style={styles.playerArt}>
                {track?.cover_url ? (
                  <Image
                    source={{ uri: track.cover_url }}
                    style={styles.miniArtImg}
                  />
                ) : (
                  <AppIcon name="music" color="#00B5AD" size={20} />
                )}
              </View>
              <View style={styles.trackText}>
                <Text numberOfLines={1} style={styles.trackTitle}>
                  {track?.title ?? 'Chọn bài hát để phát'}
                </Text>
                {track ? (
                  <Text numberOfLines={1} style={styles.trackArtist}>
                    {track.artists?.map((artist) => artist.name).join(', ') ||
                      track.artist?.name ||
                      'Melodify'}
                  </Text>
                ) : null}
              </View>
            </Pressable>

            {/* 3-Gạch Hamburger Menu Button -> Mở Bottom Sheet (Ảnh 3) */}
            <Pressable
              accessibilityLabel="Danh sách phát và chọn bài"
              onPress={() => setQueueSheetOpen(true)}
              style={styles.miniControlButton}
            >
              <AppIcon name="menu" color="#475569" size={19} />
            </Pressable>

            {/* Heart Button */}
            {track ? (
              <Pressable
                accessibilityLabel="Yêu thích bài hát"
                disabled={favoriteBusy}
                onPress={() => void handleToggleFavorite()}
                style={styles.miniControlButton}
              >
                <AppIcon
                  name="heart"
                  color={favorite ? '#EF4444' : '#475569'}
                  size={19}
                />
              </Pressable>
            ) : null}

            {/* Play/Pause Button */}
            <Pressable
              accessibilityLabel={isPlaying ? 'Tạm dừng' : 'Phát'}
              onPress={togglePlay}
              style={styles.miniPlayBtn}
            >
              {isBuffering ? (
                <ActivityIndicator color="#0F172A" size="small" />
              ) : (
                <AppIcon
                  name={isPlaying ? 'pause' : 'play'}
                  color="#0F172A"
                  size={18}
                />
              )}
            </Pressable>
          </View>
        </View>
      </View>

      {/* Clean White Tab Bar (Ảnh 1) - Extends into bottom safe area seamlessly */}
      <View style={[styles.tabs, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        {tabs.map((tab) => {
          const active =
            pathname === tab.route ||
            (tab.route === '/home' && (pathname === '/' || pathname === '/home'));
          return (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              key={tab.route}
              onPress={() => router.push(tab.route as never)}
              style={styles.tab}
            >
              <AppIcon
                name={tab.icon}
                color={active ? '#0F172A' : '#94A3B8'}
                size={22}
              />
              <Text
                numberOfLines={1}
                style={[styles.tabLabel, active && styles.activeTabLabel]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Full Lyrics Player (Ảnh 2 / Ảnh 3) */}
      <FullPlayerModal
        visible={showFullPlayer}
        onClose={() => setShowFullPlayer(false)}
      />

      {/* Bottom Sheet 3-Gạch (Ảnh 3) */}
      <QueueBottomSheet
        visible={queueSheetOpen}
        onClose={() => setQueueSheetOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  gradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 480,
  },
  header: {
    minHeight: 52,
    paddingHorizontal: 16,
    paddingBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  brand: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 10,
  },
  logo: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
  },
  brandText: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
    flexShrink: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  playerContainer: {
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
    paddingBottom: 6,
  },
  playerCard: {
    backgroundColor: '#ECEFF1',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  miniProgressTrack: {
    height: 2,
    backgroundColor: '#CBD5E1',
    width: '100%',
  },
  miniProgressFill: {
    height: '100%',
    backgroundColor: '#00B5AD',
  },
  playerRow: {
    minHeight: 56,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playerMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  playerArt: {
    width: 40,
    height: 40,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#CBD5E1',
    overflow: 'hidden',
  },
  miniArtImg: {
    width: '100%',
    height: '100%',
  },
  trackText: {
    flex: 1,
    gap: 2,
  },
  trackTitle: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
  },
  trackArtist: {
    color: '#64748B',
    fontSize: 11,
  },
  miniControlButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniPlayBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabs: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    minHeight: 46,
  },
  tabLabel: {
    color: '#94A3B8',
    fontSize: 10.5,
    fontWeight: '600',
  },
  activeTabLabel: {
    color: '#0F172A',
    fontWeight: '800',
  },
});
