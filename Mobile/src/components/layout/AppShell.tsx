import { useState, type PropsWithChildren } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { useMusic, useMusicControls } from '@/components/music';
import { FullPlayerModal, QueueBottomSheet } from '@/components/player';
import { AppIcon } from '@/components/shared/AppIcon';
import { getVisitorId, toggleSongFavorite } from '@/lib/api';
import { useAdaptiveStyles } from '@/hooks/use-adaptive-styles';
import { useTheme, useThemeMode } from '@/hooks/use-theme';

const tabs = [
  { label: 'Dành cho bạn', icon: 'for-you', route: '/for-you' },
  { label: 'Khám phá', icon: 'waveform', route: '/home' },
  { label: 'Của tui', icon: 'user', route: '/me' },
] as const;

function MiniPlayerProgress() {
  const { currentTime, duration } = useMusic();
  const styles = useAdaptiveStyles(baseStyles);
  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;
  return <View style={styles.miniProgressTrack}><View style={[styles.miniProgressFill, { width: `${progressPercent}%` }]} /></View>;
}

export default function AppShell({
  children,
  hideHeader = false,
  hidePlayer = false,
  hideTabs = false,
  customHeader,
}: PropsWithChildren<{
  hideHeader?: boolean;
  hidePlayer?: boolean;
  hideTabs?: boolean;
  customHeader?: React.ReactNode;
}>) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const mode = useThemeMode();
  const styles = useAdaptiveStyles(baseStyles);
  const {
    track,
    isPlaying,
    isBuffering,
    togglePlay,
    qualityOptions,
    selectedQualityId,
    setQuality,
  } = useMusicControls();

  const [showFullPlayer, setShowFullPlayer] = useState(false);
  const [queueSheetOpen, setQueueSheetOpen] = useState(false);
  const [favorite, setFavorite] = useState(Boolean(track?.is_favorite));
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const [qualityModalVisible, setQualityModalVisible] = useState(false);
  const selectedQuality = qualityOptions.find((quality) => quality.quality_id === selectedQualityId);

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
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />

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
                  <AppIcon name="search" color={theme.textSecondary} size={17} />
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Khám phá"
                onPress={() => router.push('/explore' as never)}
                style={styles.headerCircleBtn}
              >
                  <AppIcon name="waveform" color={theme.textSecondary} size={17} />
              </Pressable>
            </View>
          </View>
        )
      )}

      {/* Main Content Area */}
      <View style={styles.content}>{children}</View>

      {/* Floating Mini Player (Ảnh 1) */}
      <View style={[styles.playerContainer, hidePlayer && styles.hidden]}>
        <View style={styles.playerCard}>
          {/* Subtle progress indicator */}
          <MiniPlayerProgress />

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
                  <AppIcon name="music" color={theme.primary} size={20} />
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

            {track ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Chất lượng nghe: ${selectedQuality?.label ?? track.audio_quality ?? 'mặc định'}`}
                onPress={() => setQualityModalVisible(true)}
                style={styles.qualityButton}
              >
                <Text numberOfLines={1} style={styles.qualityButtonText}>
                  {selectedQuality?.label ?? track.audio_quality ?? 'Chất lượng'}
                </Text>
              </Pressable>
            ) : null}

            {/* 3-Gạch Hamburger Menu Button -> Mở Bottom Sheet (Ảnh 3) */}
            <Pressable
              accessibilityLabel="Danh sách phát và chọn bài"
              onPress={() => setQueueSheetOpen(true)}
              style={styles.miniControlButton}
            >
              <AppIcon name="menu" color={theme.textSecondary} size={19} />
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
                  color={favorite ? '#EF4444' : theme.textSecondary}
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
                <ActivityIndicator color={theme.text} size="small" />
              ) : (
                <AppIcon
                  name={isPlaying ? 'pause' : 'play'}
                  color={theme.text}
                  size={18}
                />
              )}
            </Pressable>
          </View>
        </View>
      </View>

      {/* Clean White Tab Bar (Ảnh 1) - Extends into bottom safe area seamlessly */}
      <View style={[styles.tabs, { paddingBottom: Math.max(insets.bottom, 10) }, hideTabs && styles.hidden]}>
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
              color={active ? theme.text : theme.textMuted}
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
      {showFullPlayer ? <FullPlayerModal
        visible={showFullPlayer}
        onClose={() => setShowFullPlayer(false)}
      /> : null}

      {/* Bottom Sheet 3-Gạch (Ảnh 3) */}
      {queueSheetOpen ? <QueueBottomSheet
        visible={queueSheetOpen}
        onClose={() => setQueueSheetOpen(false)}
      /> : null}

      <Modal
        transparent
        animationType="fade"
        visible={qualityModalVisible}
        onRequestClose={() => setQualityModalVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setQualityModalVisible(false)}>
          <Pressable
            style={styles.qualityModal}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.qualityHeader}>
              <Text style={styles.qualityTitle}>Chất lượng nghe</Text>
              <Pressable
                accessibilityLabel="Đóng"
                onPress={() => setQualityModalVisible(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </Pressable>
            </View>
            {qualityOptions.length ? qualityOptions.map((quality) => (
              <Pressable
                key={quality.quality_id}
                accessibilityRole="button"
                accessibilityState={{ selected: selectedQualityId === quality.quality_id, disabled: quality.available === false || !quality.audio_url }}
                disabled={quality.available === false || !quality.audio_url}
                onPress={() => {
                  void setQuality(quality.quality_id).then((changed) => {
                    if (changed) setQualityModalVisible(false);
                  });
                }}
                style={styles.qualityRow}
              >
                <View style={styles.qualityInfo}>
                  <Text style={styles.qualityLabel}>{quality.label}</Text>
                  {quality.bitrate ? <Text style={styles.qualityBitrate}>{quality.bitrate} kbps</Text> : null}
                  {quality.available === false ? <Text style={styles.qualityBitrate}>Chưa có luồng phát/tải cho chất lượng này.</Text> : null}
                </View>
                <View style={styles.qualityState}>
                  {quality.premium_only ? <Text style={styles.vipBadge}>VIP</Text> : null}
                  {selectedQualityId === quality.quality_id ? <Text style={styles.qualityCheck}>✓</Text> : null}
                </View>
              </Pressable>
            )) : <Text style={styles.noQualities}>Bài hát này không có thông tin chất lượng từ API.</Text>}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const baseStyles = StyleSheet.create({
  hidden: { display: 'none' },
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
  qualityButton: { maxWidth: 86, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 7, backgroundColor: '#E2F4EF' },
  qualityButtonText: { color: '#164E48', fontSize: 10, fontWeight: '800' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', padding: 14, backgroundColor: 'rgba(15,23,42,0.52)' },
  qualityModal: { width: '100%', maxHeight: '65%', padding: 18, borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DDE8E4' },
  qualityHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  qualityTitle: { color: '#0F172A', fontSize: 18, fontWeight: '900' },
  closeButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: '#F1F5F9' },
  closeButtonText: { color: '#334155', fontSize: 22 },
  qualityRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  qualityInfo: { flex: 1, gap: 3 },
  qualityLabel: { color: '#0F172A', fontSize: 14, fontWeight: '800' },
  qualityBitrate: { color: '#64748B', fontSize: 11 },
  qualityState: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  vipBadge: { overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5, backgroundColor: '#FEF3C7', color: '#92400E', fontSize: 10, fontWeight: '900' },
  qualityCheck: { color: '#00B5AD', fontSize: 18, fontWeight: '900' },
  noQualities: { paddingVertical: 14, color: '#64748B', fontSize: 13, lineHeight: 19 },
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
