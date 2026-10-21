import { useCallback, useEffect, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useMusic } from '@/components/music';
import { AppIcon } from '@/components/shared/AppIcon';
import { getVisitorId, listSongs, toggleSongFavorite, type Song } from '@/lib/api';

type QueueBottomSheetProps = {
  visible: boolean;
  onClose: () => void;
};

export function QueueBottomSheet({ visible, onClose }: QueueBottomSheetProps) {
  const {
    track,
    queue,
    currentIndex,
    repeatMode,
    playAt,
    playSong,
    toggleRepeat,
  } = useMusic();

  const [favorite, setFavorite] = useState(Boolean(track?.is_favorite));
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const [suggestions, setSuggestions] = useState<Song[]>([]);

  // Load recommended suggestions if queue is short
  useEffect(() => {
    if (visible && track) {
      const query = track.artist?.name || track.title;
      void listSongs({ query, perPage: 8 })
        .then((res) => {
          const filtered = (res.data || []).filter((s) => s.id !== track.id);
          setSuggestions(filtered);
        })
        .catch(() => undefined);
    }
  }, [visible, track]);

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

  const handlePlaySong = useCallback(
    (song: Song) => {
      void playSong(song, [song, ...suggestions]);
      onClose();
    },
    [playSong, suggestions, onClose]
  );

  const handleSelectQueueItem = useCallback(
    (index: number) => {
      playAt(index);
      onClose();
    },
    [playAt, onClose]
  );

  if (!track) return null;

  const repeatLabel =
    repeatMode === 'one'
      ? 'Phát 1 lần'
      : repeatMode === 'all'
      ? 'Lặp tất cả'
      : 'Không lặp';

  // Determine upcoming songs to show
  const upcomingQueue = queue.slice(currentIndex + 1);
  const showSuggestions = upcomingQueue.length === 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <SafeAreaView edges={['bottom']} style={styles.sheetContainer}>
          {/* Top Grab Handle */}
          <View style={styles.grabHandle} />

          {/* Action Row - 5 Circular Buttons (Ảnh 3) */}
          <View style={styles.actionRow}>
            {/* Repeat Toggle */}
            <Pressable onPress={toggleRepeat} style={styles.actionBtn}>
              <View
                style={[
                  styles.circleIcon,
                  repeatMode !== 'off' && styles.circleIconActive,
                ]}
              >
                <AppIcon
                  name={repeatMode === 'one' ? 'repeat-one' : 'repeat'}
                  color={repeatMode !== 'off' ? '#00B5AD' : '#475569'}
                  size={20}
                />
              </View>
              <Text style={styles.actionLabel}>{repeatLabel}</Text>
            </Pressable>

            {/* Add to Playlist */}
            <Pressable style={styles.actionBtn}>
              <View style={styles.circleIcon}>
                <AppIcon name="playlist-add" color="#475569" size={20} />
              </View>
              <Text style={styles.actionLabel}>Thêm vào{'\n'}playlist</Text>
            </Pressable>

            {/* Favorite */}
            <Pressable
              disabled={favoriteBusy}
              onPress={() => void handleToggleFavorite()}
              style={styles.actionBtn}
            >
              <View
                style={[
                  styles.circleIcon,
                  favorite && styles.circleIconFavorite,
                ]}
              >
                <AppIcon
                  name="heart"
                  color={favorite ? '#EF4444' : '#475569'}
                  size={20}
                />
              </View>
              <Text style={styles.actionLabel}>
                {favorite ? 'Đã thích' : 'Yêu thích'}
              </Text>
            </Pressable>

            {/* Download */}
            <Pressable style={styles.actionBtn}>
              <View style={styles.circleIcon}>
                <AppIcon name="download" color="#475569" size={20} />
              </View>
              <Text style={styles.actionLabel}>Tải về</Text>
            </Pressable>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Section Header: Dành cho bạn (không giới hạn) ⓘ */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Dành cho bạn (không giới hạn)
            </Text>
            <View style={styles.infoBadge}>
              <Text style={styles.infoText}>ⓘ</Text>
            </View>
          </View>

          {/* Song List (Scrollable) */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.songScroll}
            contentContainerStyle={styles.songListContent}
          >
            {/* Currently Playing Item */}
            <View style={styles.songRowPlaying}>
              {track.cover_url ? (
                <Image source={{ uri: track.cover_url }} style={styles.songCover} />
              ) : (
                <View style={[styles.songCover, styles.coverFallback]}>
                  <AppIcon name="music" color="#00B5AD" size={20} />
                </View>
              )}

              <View style={styles.songMeta}>
                <View style={styles.titleRow}>
                  <AppIcon name="equalizer" color="#00B5AD" size={15} />
                  <Text numberOfLines={1} style={styles.songTitlePlaying}>
                    {track.title}
                  </Text>
                </View>
                <Text numberOfLines={1} style={styles.songArtist}>
                  {track.artists?.map((a) => a.name).join(', ') ||
                    track.artist?.name ||
                    'Melodify'}
                </Text>
                {track.publisher ? (
                  <Text numberOfLines={1} style={styles.publisherText}>
                    ● {track.publisher}
                  </Text>
                ) : null}
              </View>
            </View>

            {/* Upcoming Queue Items */}
            {!showSuggestions
              ? upcomingQueue.map((song, idx) => {
                  const targetIndex = currentIndex + 1 + idx;
                  return (
                    <Pressable
                      key={`queue-${song.id}-${idx}`}
                      onPress={() => handleSelectQueueItem(targetIndex)}
                      style={styles.songRow}
                    >
                      {song.cover_url ? (
                        <Image source={{ uri: song.cover_url }} style={styles.songCover} />
                      ) : (
                        <View style={[styles.songCover, styles.coverFallback]}>
                          <AppIcon name="music" color="#94A3B8" size={18} />
                        </View>
                      )}

                      <View style={styles.songMeta}>
                        <Text numberOfLines={1} style={styles.songTitle}>
                          {song.title}
                        </Text>
                        <Text numberOfLines={1} style={styles.songArtist}>
                          {song.artists?.map((a) => a.name).join(', ') ||
                            song.artist?.name ||
                            'Melodify'}
                        </Text>
                        {song.publisher ? (
                          <Text numberOfLines={1} style={styles.publisherText}>
                            ● {song.publisher}
                          </Text>
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })
              : suggestions.map((song) => (
                  <Pressable
                    key={`sug-${song.id}`}
                    onPress={() => handlePlaySong(song)}
                    style={styles.songRow}
                  >
                    {song.cover_url ? (
                      <Image source={{ uri: song.cover_url }} style={styles.songCover} />
                    ) : (
                      <View style={[styles.songCover, styles.coverFallback]}>
                        <AppIcon name="music" color="#94A3B8" size={18} />
                      </View>
                    )}

                    <View style={styles.songMeta}>
                      <Text numberOfLines={1} style={styles.songTitle}>
                        {song.title}
                      </Text>
                      <Text numberOfLines={1} style={styles.songArtist}>
                        {song.artists?.map((a) => a.name).join(', ') ||
                          song.artist?.name ||
                          'Melodify'}
                      </Text>
                      {song.publisher ? (
                        <Text numberOfLines={1} style={styles.publisherText}>
                          ● {song.publisher}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                ))}

            {/* Footer recommendation note */}
            <Text style={styles.recommendationHint}>
              ••• Luôn luôn đề xuất cho bạn •••
            </Text>
          </ScrollView>

          {/* Bottom Cancel Button */}
          <Pressable onPress={onClose} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Hủy</Text>
          </Pressable>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingHorizontal: 20,
    maxHeight: '82%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
  },
  grabHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 16,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  actionBtn: {
    alignItems: 'center',
    width: 62,
  },
  circleIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  circleIconActive: {
    backgroundColor: '#E6FAF7',
  },
  circleIconFavorite: {
    backgroundColor: '#FEE2E2',
  },
  actionLabel: {
    color: '#334155',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 14,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '700',
  },
  infoBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  songScroll: {
    maxHeight: 290,
  },
  songListContent: {
    gap: 12,
    paddingBottom: 8,
  },
  songRowPlaying: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 12,
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  songCover: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  coverFallback: {
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  songMeta: {
    flex: 1,
    gap: 2,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  songTitlePlaying: {
    color: '#00B5AD',
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
  },
  songTitle: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
  },
  songArtist: {
    color: '#64748B',
    fontSize: 12,
  },
  publisherText: {
    color: '#94A3B8',
    fontSize: 11,
  },
  recommendationHint: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  cancelBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 6,
  },
  cancelText: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '700',
  },
});
