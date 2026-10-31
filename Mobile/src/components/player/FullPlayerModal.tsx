import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ImageBackground,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

import { useMusic, useMusicControls } from '@/components/music';
import { AppIcon } from '@/components/shared/AppIcon';
import { getVisitorId, toggleSongFavorite } from '@/lib/api';
import { downloadSong } from '@/lib/downloads';
import { formatTime } from '@/lib/lyrics';
import { QueueBottomSheet } from './QueueBottomSheet';
import { SyncedLyricsView } from './SyncedLyricsView';
import { useAdaptiveStyles } from '@/hooks/use-adaptive-styles';
import { useTheme, useThemeMode } from '@/hooks/use-theme';

type FullPlayerModalProps = {
  visible: boolean;
  onClose: () => void;
  initialMode?: 'player' | 'lyrics';
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const ARTWORK_HEIGHT = Math.min(SCREEN_HEIGHT * 0.38, SCREEN_WIDTH - 56);

export function FullPlayerModal({ visible, onClose }: FullPlayerModalProps) {
  const styles = useAdaptiveStyles(baseStyles);
  const theme = useTheme();
  const mode = useThemeMode();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { selectedQualityId } = useMusicControls();
  const {
    track,
    isPlaying,
    isBuffering,
    currentTime,
    duration,
    parsedLyrics,
    activeLyricIndex,
    togglePlay,
    seekTo,
  } = useMusic();

  const [showFullLyrics, setShowFullLyrics] = useState(false);
  const [favorite, setFavorite] = useState(Boolean(track?.is_favorite));
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const [queueSheetOpen, setQueueSheetOpen] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTopTab, setActiveTopTab] = useState<'forYou' | 'downloaded'>('forYou');
  const [downloadBusy, setDownloadBusy] = useState(false);

  if (!track) {
    return null;
  }

  const artistsText =
    track.artists?.map((a) => a.name).join(', ') ||
    track.artist?.name ||
    'Melodify';

  const progressPercent =
    duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  const handleProgressBarPress = (event: { nativeEvent: { locationX: number } }) => {
    if (duration <= 0) return;
    const barWidth = SCREEN_WIDTH - 48;
    const clickX = Math.max(0, Math.min(event.nativeEvent.locationX, barWidth));
    const targetSeconds = (clickX / barWidth) * duration;
    seekTo(targetSeconds);
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

  const handleDownloadTrack = async () => {
    if (!track || downloadBusy) return;
    setDownloadBusy(true);
    try {
      const downloaded = await downloadSong(track, selectedQualityId);
      Alert.alert('Đã tải về', `${track.title} đã được lưu trên thiết bị (${downloaded.qualityLabel}).`);
    } catch (error) {
      Alert.alert('Không thể tải bài hát', error instanceof Error ? error.message : 'Vui lòng thử lại.');
    } finally {
      setDownloadBusy(false);
    }
  };

  // Get active and next running lyric lines for View 2 (Now Playing)
  const currentLine =
    activeLyricIndex >= 0 && parsedLyrics[activeLyricIndex]
      ? parsedLyrics[activeLyricIndex].text
      : track.title;

  const nextLine =
    activeLyricIndex >= 0 && parsedLyrics[activeLyricIndex + 1]
      ? parsedLyrics[activeLyricIndex + 1].text
      : artistsText;

  const topInset = Math.max(insets.top, 20);
  const bottomInset = Math.max(insets.bottom, 16);
  const lyricsContainerHeight = Math.max(
    280,
    SCREEN_HEIGHT - (topInset + 56) - (bottomInset + 64)
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={() => {
        setShowFullLyrics(false);
        onClose();
      }}
    >
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <View style={[styles.root, { backgroundColor: theme.background }]}>
        {/* Blurred album artwork background with warm dark tint */}
        {track.cover_url ? (
          <ImageBackground
            source={{ uri: track.cover_url }}
            blurRadius={65}
            style={StyleSheet.absoluteFill}
          >
            <View style={styles.blurBackdrop} />
          </ImageBackground>
        ) : (
          <View style={styles.solidBackdrop} />
        )}

        <View style={styles.safe}>
          {/* VIEW 1: FULL DETAILED LYRICS (ẢNH 1 & ẢNH 3) */}
          {showFullLyrics ? (
            <View
              style={[
                styles.container,
                { paddingBottom: bottomInset + 4 },
              ]}
            >
              {/* Top Bar (Ảnh 1 / 3) */}
              <View
                style={[
                  styles.topBarFullLyrics,
                  {
                    paddingTop: topInset + 4,
                    height: topInset + 56,
                  },
                ]}
              >
                <View style={styles.topLeftTrack}>
                  {track.cover_url ? (
                    <Image source={{ uri: track.cover_url }} style={styles.topThumb} />
                  ) : (
                    <View style={[styles.topThumb, styles.topThumbFallback]}>
                      <AppIcon name="music" color={theme.text} size={18} />
                    </View>
                  )}
                  <View style={styles.topMeta}>
                    <Text numberOfLines={1} style={styles.topTitle}>
                      {track.title}
                    </Text>
                    <Text numberOfLines={1} style={styles.topArtist}>
                      {artistsText}
                    </Text>
                  </View>
                </View>

                {/* Right: Hamburger, Heart & Close (✕) Buttons */}
                <View style={styles.topRightActions}>
                  <Pressable
                    accessibilityLabel="Mở danh sách bài hát"
                    onPress={() => setQueueSheetOpen(true)}
                    style={styles.circleBtn}
                  >
                    <AppIcon name="menu" color={theme.text} size={19} />
                  </Pressable>

                  <Pressable
                    disabled={favoriteBusy}
                    accessibilityLabel="Yêu thích"
                    onPress={() => void handleToggleFavorite()}
                    style={styles.circleBtn}
                  >
                    <AppIcon
                      name="heart"
                      color={favorite ? '#EF4444' : theme.text}
                      size={18}
                    />
                  </Pressable>

                  {/* Close button returns to View 2 (Now Playing) */}
                  <Pressable
                    accessibilityLabel="Quay lại phát nhạc"
                    onPress={() => setShowFullLyrics(false)}
                    style={styles.circleBtn}
                  >
                    <AppIcon name="close" color={theme.text} size={18} />
                  </Pressable>
                </View>
              </View>

              {/* Lyrics Area (Ảnh 3: Active line pinned down by 1 sentence) */}
              <View style={styles.lyricsArea}>
                <SyncedLyricsView
                  lyrics={parsedLyrics}
                  plainText={track.lyrics?.[0]?.content}
                  activeLyricIndex={activeLyricIndex}
                  onSeekToLine={seekTo}
                  containerHeight={lyricsContainerHeight}
                />
              </View>

              {/* Bottom Controls Bar */}
              <View style={styles.bottomControlsFullLyrics}>
                <Pressable
                  accessibilityLabel={isPlaying ? 'Tạm dừng' : 'Phát'}
                  onPress={togglePlay}
                  style={styles.playBtnLyrics}
                >
                  {isBuffering ? (
                    <ActivityIndicator color={theme.primaryOn} size="small" />
                  ) : (
                    <AppIcon
                      name={isPlaying ? 'pause' : 'play'}
                      color={theme.primaryOn}
                      size={26}
                    />
                  )}
                </Pressable>

                <Pressable
                  onPress={handleProgressBarPress}
                  style={styles.progressBarWrapper}
                >
                  <View style={styles.progressBarTrack}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${progressPercent}%`, backgroundColor: theme.primary },
                      ]}
                    />
                    <View
                      style={[
                        styles.progressThumb,
                        { left: `${Math.max(0, Math.min(97, progressPercent))}%`, backgroundColor: theme.primary },
                      ]}
                    />
                  </View>
                </Pressable>

                <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
              </View>
            </View>
          ) : (
            /* VIEW 2: NOW PLAYING SCREEN WITH RUNNING LYRICS & ARTWORK (ẢNH 2) */
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.mainPlayerContent,
                {
                  paddingTop: topInset + 4,
                  paddingBottom: bottomInset + 16,
                },
              ]}
            >
              {/* Top Navigation Row (Ảnh 2: Dành cho bạn | Nhạc Đã Tải | Minimize) */}
              <View style={styles.topTabsRow}>
                <View style={styles.tabsLeft}>
                  <Pressable onPress={() => setActiveTopTab('forYou')}>
                    <Text
                      style={[
                        styles.topTabLabel,
                        activeTopTab === 'forYou' && styles.topTabLabelActive,
                      ]}
                    >
                      Dành cho bạn
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      setActiveTopTab('downloaded');
                      onClose();
                      router.push('/downloads' as never);
                    }}
                  >
                    <Text
                      style={[
                        styles.topTabLabel,
                        activeTopTab === 'downloaded' && styles.topTabLabelActive,
                      ]}
                    >
                      Nhạc Đã Tải
                    </Text>
                  </Pressable>
                </View>

                <View style={styles.tabsRight}>
                  <Pressable
                    accessibilityLabel="Thu nhỏ trình phát"
                    onPress={() => {
                      setShowFullLyrics(false);
                      onClose();
                    }}
                    style={styles.minimizeBtn}
                  >
                    <AppIcon name="chevron-down" color={theme.text} size={24} />
                  </Pressable>
                </View>
              </View>

              {/* Running Lyrics Preview - Tapping expands to Full Lyrics! */}
              <Pressable
                accessibilityLabel="Xem chi tiết lời bài hát"
                onPress={() => setShowFullLyrics(true)}
                style={styles.runningLyricsBox}
              >
                <Text numberOfLines={2} style={styles.runningLyricActive}>
                  {currentLine}
                </Text>
                <Text numberOfLines={1} style={styles.runningLyricNext}>
                  {nextLine}
                </Text>
              </Pressable>

              {/* Large Artist / Album Artwork (Ảnh 2) - Tapping also opens Full Lyrics */}
              <Pressable
                accessibilityLabel="Xem lời bài hát"
                onPress={() => setShowFullLyrics(true)}
                style={styles.artworkWrapper}
              >
                {track.cover_url ? (
                  <Image
                    source={{ uri: track.cover_url }}
                    style={styles.artworkImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.artworkFallback}>
                    <AppIcon name="music" color={theme.primary} size={64} />
                  </View>
                )}
              </Pressable>

              {/* Song Meta Info (Ảnh 2) */}
              <View style={styles.songMetaSection}>
                {/* Publisher Tag */}
                <View style={styles.publisherRow}>
                  <View style={styles.publisherPill}>
                    <Text style={styles.publisherText}>
                      ● {track.publisher || 'Melodify'}
                    </Text>
                  </View>
                </View>

                {/* Song Title & Quality Badge */}
                <View style={styles.titleQualityRow}>
                  <Text numberOfLines={1} style={styles.mainTitle}>
                    {track.title}
                  </Text>
                  <View style={styles.qualityBadge}>
                    <Text style={styles.qualityText}>128kbps</Text>
                  </View>
                </View>

                {/* Artist & Follow Button */}
                <View style={styles.artistFollowRow}>
                  <Text numberOfLines={1} style={styles.artistName}>
                    {artistsText}
                  </Text>
                  <Pressable
                    onPress={() => setIsFollowing((prev) => !prev)}
                    style={[
                      styles.followBtn,
                      isFollowing && styles.followBtnActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.followBtnText,
                        isFollowing && styles.followBtnTextActive,
                      ]}
                    >
                      {isFollowing ? 'Đang theo dõi' : 'Theo dõi'}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Actions Row (Ảnh 2: Heart, Share, Download, 3-Gạch Menu) */}
              <View style={styles.actionIconsRow}>
                {/* Left group with counts */}
                <View style={styles.actionGroupLeft}>
                  {/* Heart */}
                  <Pressable
                    disabled={favoriteBusy}
                    onPress={() => void handleToggleFavorite()}
                    style={styles.actionCol}
                  >
                    <AppIcon
                      name="heart"
                      color={favorite ? '#EF4444' : theme.text}
                      size={24}
                    />
                    <Text style={styles.actionCount}>
                      {favorite ? 1 : 0}
                    </Text>
                  </Pressable>



                  {/* Share / Facebook */}
                  <View style={styles.actionCol}>
                    <AppIcon name="facebook" color={theme.text} size={24} />
                    <Text style={styles.actionCount}>138</Text>
                  </View>
                </View>

                {/* Right group: Download & 3-Gạch Menu Button */}
                <View style={styles.actionGroupRight}>
                  {/* Download */}
                  <Pressable
                    accessibilityLabel="Tải bài hát về thiết bị"
                    disabled={downloadBusy}
                    onPress={() => void handleDownloadTrack()}
                    style={[styles.actionIconBtn, downloadBusy && { opacity: 0.6 }]}
                  >
                    {downloadBusy
                      ? <ActivityIndicator color={theme.text} size="small" />
                      : <AppIcon name="download" color={theme.text} size={22} />}
                  </Pressable>

                  {/* 3-Gạch Hamburger Menu Button (Mở Bottom Sheet Ảnh 3) */}
                  <Pressable
                    accessibilityLabel="Danh sách phát tiếp theo"
                    onPress={() => setQueueSheetOpen(true)}
                    style={styles.actionIconBtn}
                  >
                    <AppIcon name="menu" color={theme.text} size={22} />
                  </Pressable>
                </View>
              </View>

              {/* Progress Scrubber (Ảnh 2) */}
              <View style={styles.scrubberBox}>
                <Pressable
                  onPress={handleProgressBarPress}
                  style={styles.progressBarWrapper}
                >
                  <View style={styles.progressBarTrack}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${progressPercent}%`, backgroundColor: theme.primary },
                      ]}
                    />
                    <View
                      style={[
                        styles.progressThumb,
                        { left: `${Math.max(0, Math.min(97, progressPercent))}%`, backgroundColor: theme.primary },
                      ]}
                    />
                  </View>
                </Pressable>

                <View style={styles.timeRow}>
                  <Text style={styles.timeTextSmall}>{formatTime(currentTime)}</Text>
                  <Text style={styles.timeTextSmall}>{formatTime(duration)}</Text>
                </View>
              </View>

              {/* Bottom Play / Pause (Ảnh 2) */}
              <View style={styles.bottomPlaySection}>
                <Pressable
                  accessibilityLabel={isPlaying ? 'Tạm dừng' : 'Phát'}
                  onPress={togglePlay}
                  style={styles.centerPlayCircle}
                >
                  {isBuffering ? (
                    <ActivityIndicator color={theme.primaryOn} size="small" />
                  ) : (
                    <AppIcon
                      name={isPlaying ? 'pause' : 'play'}
                      color={theme.primaryOn}
                      size={26}
                    />
                  )}
                </Pressable>
              </View>
            </ScrollView>
          )}
        </View>

        {/* Bottom Sheet 3-Gạch (Ảnh 3) */}
        {queueSheetOpen ? <QueueBottomSheet
          visible={queueSheetOpen}
          onClose={() => setQueueSheetOpen(false)}
        /> : null}
      </View>
    </Modal>
  );
}

const baseStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#1E1210',
  },
  blurBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(28, 17, 17, 0.78)',
  },
  solidBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#1C1313',
  },
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },

  /* VIEW 1: FULL DETAILED LYRICS (ẢNH 1 / 3) */
  topBarFullLyrics: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topLeftTrack: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginRight: 10,
  },
  topThumb: {
    width: 38,
    height: 38,
    borderRadius: 6,
  },
  topThumbFallback: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topMeta: {
    flex: 1,
    gap: 2,
  },
  topTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  topArtist: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 11,
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  circleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lyricsArea: {
    flex: 1,
    justifyContent: 'center',
  },
  bottomControlsFullLyrics: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  playBtnLyrics: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* VIEW 2: NOW PLAYING SCREEN (ẢNH 2) */
  mainPlayerContent: {
    paddingHorizontal: 20,
    gap: 14,
  },
  topTabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  tabsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  topTabLabel: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 14,
    fontWeight: '600',
  },
  topTabLabelActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  tabsRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  minimizeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Running Lyrics Preview Box */
  runningLyricsBox: {
    paddingVertical: 6,
    gap: 4,
  },
  runningLyricActive: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 30,
  },
  runningLyricNext: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 24,
  },

  /* Artwork */
  artworkWrapper: {
    width: '100%',
    height: ARTWORK_HEIGHT,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  artworkImage: {
    width: '100%',
    height: '100%',
  },
  artworkFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Song Meta */
  songMetaSection: {
    gap: 4,
  },
  publisherRow: {
    flexDirection: 'row',
  },
  publisherPill: {
    backgroundColor: '#000000',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  publisherText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '700',
  },
  titleQualityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 2,
  },
  mainTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    flex: 1,
  },
  qualityBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  qualityText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 10,
    fontWeight: '700',
  },
  artistFollowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  artistName: {
    color: 'rgba(255, 255, 255, 0.72)',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  followBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  followBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  followBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  followBtnTextActive: {
    color: '#0F172A',
    fontWeight: '800',
  },

  /* Action Icons Row (Ảnh 2) */
  actionIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  actionGroupLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 22,
  },
  actionCol: {
    alignItems: 'center',
    gap: 3,
  },
  actionCount: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 10.5,
    fontWeight: '600',
  },
  actionGroupRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionIconBtn: {
    padding: 6,
  },

  /* Scrubber */
  scrubberBox: {
    gap: 4,
    marginTop: 4,
  },
  progressBarWrapper: {
    height: 24,
    justifyContent: 'center',
  },
  progressBarTrack: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    borderRadius: 1.5,
    position: 'relative',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 1.5,
  },
  progressThumb: {
    position: 'absolute',
    top: -4.5,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeTextSmall: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 10.5,
  },
  timeText: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 11,
    fontWeight: '600',
    minWidth: 34,
    textAlign: 'right',
  },

  /* Bottom Play button */
  bottomPlaySection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  centerPlayCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
});
