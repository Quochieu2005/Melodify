import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { AppShell } from '@/components/layout';
import { useMusicControls } from '@/components/music';
import { AppIcon } from '@/components/shared/AppIcon';
import { useAdaptiveStyles } from '@/hooks/use-adaptive-styles';
import { useTheme } from '@/hooks/use-theme';
import { listDownloadedSongs, removeDownloadedSong, toOfflineSong, type DownloadedSong } from '@/lib/downloads';

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getArtistNames(song: DownloadedSong['song']) {
  return song.artists?.map((artist) => artist.name).join(', ') || song.artist?.name || 'Melodify';
}

export function DownloadsScreen() {
  const styles = useAdaptiveStyles(baseStyles);
  const theme = useTheme();
  const router = useRouter();
  const { playSong } = useMusicControls();
  const [downloads, setDownloads] = useState<DownloadedSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      setDownloads(await listDownloadedSongs());
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void refresh();
  }, [refresh]));

  const handlePlay = (item: DownloadedSong) => {
    const selected = toOfflineSong(item);
    const seenSongIds = new Set([selected.id]);
    const offlineQueue = [selected, ...downloads
      .filter((download) => {
        if (seenSongIds.has(download.song.id)) return false;
        seenSongIds.add(download.song.id);
        return true;
      })
      .map(toOfflineSong)];
    void playSong(selected, offlineQueue);
  };

  const handleDelete = (item: DownloadedSong) => {
    Alert.alert('Xóa bài đã tải?', `“${item.song.title}” sẽ bị xóa khỏi thiết bị.`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setDeletingId(item.downloadId);
            try {
              await removeDownloadedSong(item.downloadId);
              setDownloads((current) => current.filter((download) => download.downloadId !== item.downloadId));
            } catch {
              Alert.alert('Không thể xóa', 'Vui lòng thử lại.');
            } finally {
              setDeletingId(null);
            }
          })();
        },
      },
    ]);
  };

  return (
    <AppShell>
      <View style={styles.page}>
        <View style={styles.headingRow}>
          <View style={styles.headingCopy}>
            <Text style={[styles.title, { color: theme.text }]}>Nhạc đã tải</Text>
            <Text style={[styles.subtitle, { color: theme.textMuted }]}>Nghe ngoại tuyến trên thiết bị này</Text>
          </View>
          <View style={[styles.countPill, { backgroundColor: theme.backgroundSelected }]}>
            <AppIcon name="download" color={theme.primary} size={16} />
            <Text style={[styles.countText, { color: theme.text }]}>{downloads.length}</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={theme.primary} />
            <Text style={[styles.stateText, { color: theme.textMuted }]}>Đang đọc nhạc đã tải…</Text>
          </View>
        ) : loadError ? (
          <View style={styles.centerState}>
            <AppIcon name="download" color={theme.textMuted} size={32} />
            <Text style={[styles.stateTitle, { color: theme.text }]}>Không tải được thư viện</Text>
            <Text style={[styles.stateText, { color: theme.textMuted }]}>Hãy thử tải lại danh sách trên thiết bị.</Text>
            <Pressable onPress={() => void refresh()} style={[styles.primaryButton, { backgroundColor: theme.primary }]}>
              <Text style={[styles.primaryButtonText, { color: theme.primaryOn }]}>Thử lại</Text>
            </Pressable>
          </View>
        ) : downloads.length === 0 ? (
          <View style={styles.centerState}>
            <View style={[styles.emptyIcon, { backgroundColor: theme.backgroundCard }]}>
              <AppIcon name="download" color={theme.primary} size={30} />
            </View>
            <Text style={[styles.stateTitle, { color: theme.text }]}>Chưa có bài hát tải về</Text>
            <Text style={[styles.stateText, { color: theme.textMuted }]}>Mở menu bài hát hoặc trình phát rồi chọn Tải về để lưu nhạc trên máy.</Text>
            <Pressable onPress={() => router.push('/home' as never)} style={[styles.primaryButton, { backgroundColor: theme.primary }]}>
              <Text style={[styles.primaryButtonText, { color: theme.primaryOn }]}>Khám phá nhạc</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
            {downloads.map((item) => (
              <View key={item.downloadId} style={[styles.songCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
                <Pressable accessibilityLabel={`Phát ${item.song.title} ngoại tuyến`} onPress={() => handlePlay(item)} style={styles.songMain}>
                  {item.song.cover_url ? (
                    <Image source={{ uri: item.song.cover_url }} style={styles.cover} />
                  ) : (
                    <View style={[styles.cover, styles.coverFallback, { backgroundColor: theme.backgroundElement }]}>
                      <AppIcon name="music" color={theme.textMuted} size={23} />
                    </View>
                  )}
                  <View style={styles.songCopy}>
                    <Text numberOfLines={1} style={[styles.songTitle, { color: theme.text }]}>{item.song.title}</Text>
                    <Text numberOfLines={1} style={[styles.artist, { color: theme.textSecondary }]}>{getArtistNames(item.song)}</Text>
                    <View style={styles.metaRow}>
                      <Text numberOfLines={1} style={[styles.quality, { color: theme.primary }]}>{item.qualityLabel}</Text>
                      <Text style={[styles.dot, { color: theme.textMuted }]}>·</Text>
                      <Text style={[styles.size, { color: theme.textMuted }]}>{formatFileSize(item.bytes)}</Text>
                    </View>
                  </View>
                  <View style={[styles.playButton, { backgroundColor: theme.primary }]}>
                    <AppIcon name="play" color={theme.primaryOn} size={15} />
                  </View>
                </Pressable>
                <Pressable
                  accessibilityLabel={`Xóa ${item.song.title} khỏi nhạc đã tải`}
                  disabled={deletingId === item.downloadId}
                  onPress={() => handleDelete(item)}
                  style={styles.deleteButton}
                >
                  {deletingId === item.downloadId
                    ? <ActivityIndicator color={theme.textMuted} size="small" />
                    : <AppIcon name="trash" color={theme.textMuted} size={18} />}
                </Pressable>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </AppShell>
  );
}

const baseStyles = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: 20, paddingTop: 24 },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  headingCopy: { flex: 1, paddingRight: 12 },
  title: { fontSize: 28, fontWeight: '800' },
  subtitle: { fontSize: 14, marginTop: 5 },
  countPill: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 },
  countText: { fontSize: 14, fontWeight: '700' },
  centerState: { flex: 1, minHeight: 320, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  emptyIcon: { width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  stateTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginTop: 14 },
  stateText: { fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 8 },
  primaryButton: { minWidth: 160, alignItems: 'center', borderRadius: 24, paddingHorizontal: 20, paddingVertical: 12, marginTop: 20 },
  primaryButtonText: { fontSize: 14, fontWeight: '700' },
  listContent: { paddingBottom: 28, gap: 10 },
  songCard: { minHeight: 88, flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, paddingLeft: 10, paddingRight: 8 },
  songMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  cover: { width: 62, height: 62, borderRadius: 10 },
  coverFallback: { alignItems: 'center', justifyContent: 'center' },
  songCopy: { flex: 1, minWidth: 0, marginLeft: 12, marginRight: 8 },
  songTitle: { fontSize: 15, fontWeight: '700' },
  artist: { fontSize: 13, marginTop: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  quality: { flexShrink: 1, fontSize: 11, fontWeight: '600' },
  dot: { marginHorizontal: 6, fontSize: 12 },
  size: { fontSize: 11 },
  playButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  deleteButton: { width: 42, height: 54, alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
});
