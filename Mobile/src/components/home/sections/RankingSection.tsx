import { Dimensions, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { MOCK_RANKING_BOARDS, SongItem } from '@/constants/mockData';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.84; // Allows next ranking board to peek on the right

interface RankingSectionProps {
  onPlaySong?: (song: SongItem) => void;
  activeSongId?: string;
}

export function RankingSection({ onPlaySong, activeSongId }: RankingSectionProps) {
  return (
    <View style={styles.container}>
      {/* Heading Row */}
      <View style={styles.headingRow}>
        <Text style={styles.heading}>Bảng Xếp Hạng</Text>
        <Pressable hitSlop={8} style={({ pressed }) => pressed && styles.pressed}>
          <Text style={styles.more}>Thêm</Text>
        </Pressable>
      </View>

      {/* Horizontal Carousel of Ranking Board Cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH + 14}
        contentContainerStyle={styles.scrollContent}
      >
        {MOCK_RANKING_BOARDS.map((board) => (
          <View key={board.id} style={styles.boardCard}>
            {/* Card Header: Title + Play Circular Button */}
            <View style={styles.cardHeader}>
              <Text style={styles.boardTitle}>
                {board.title} <Text style={styles.chevron}>›</Text>
              </Text>
              <Pressable
                onPress={() => onPlaySong?.(board.songs[0])}
                style={({ pressed }) => [styles.playAllButton, pressed && styles.pressed]}
              >
                <Text style={styles.playAllIcon}>▶</Text>
              </Pressable>
            </View>

            {/* 3 Songs in the Board */}
            <View style={styles.songsList}>
              {board.songs.slice(0, 3).map((song, index) => {
                const rank = index + 1;
                const isPlayingThis = activeSongId === song.id;

                return (
                  <Pressable
                    key={song.id}
                    onPress={() => onPlaySong?.(song)}
                    style={({ pressed }) => [
                      styles.songRow,
                      isPlayingThis && styles.songRowPlaying,
                      pressed && styles.pressed,
                    ]}
                  >
                    {/* Rank Number & Indicator */}
                    <View style={styles.rankCol}>
                      <Text style={styles.rankNumber}>{rank}</Text>
                      {song.trend === 'up' ? (
                        <Text style={styles.trendUp}>▲</Text>
                      ) : song.trend === 'down' ? (
                        <Text style={styles.trendDown}>▼</Text>
                      ) : (
                        <Text style={styles.trendSame}>—</Text>
                      )}
                    </View>

                    {/* Cover Art */}
                    <View style={styles.coverWrap}>
                      <Image source={{ uri: song.coverUrl }} style={styles.coverImage} />
                    </View>

                    {/* Song Details */}
                    <View style={styles.infoCol}>
                      <Text numberOfLines={1} style={styles.songTitle}>
                        {song.title}
                      </Text>
                      <Text numberOfLines={1} style={styles.artistName}>
                        {song.artist}
                      </Text>
                      {song.publisher && (
                        <View style={styles.publisherRow}>
                          <View
                            style={[
                              styles.publisherDot,
                              song.publisherType === 'domusic' && styles.publisherDotRed,
                            ]}
                          />
                          <Text numberOfLines={1} style={styles.publisherText}>
                            {song.publisher}
                          </Text>
                        </View>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 22,
    gap: 12,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heading: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  more: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
  },
  scrollContent: {
    paddingRight: 16,
    gap: 14,
  },
  boardCard: {
    width: CARD_WIDTH,
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 2,
  },
  boardTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  chevron: {
    color: '#9CA3AF',
    fontSize: 18,
    fontWeight: '400',
  },
  playAllButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#D1F1F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playAllIcon: {
    color: '#00BDCF',
    fontSize: 12,
    marginLeft: 2,
  },
  songsList: {
    gap: 10,
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  songRowPlaying: {
    backgroundColor: 'rgba(0, 189, 207, 0.08)',
  },
  rankCol: {
    width: 20,
    alignItems: 'center',
    gap: 1,
  },
  rankNumber: {
    color: '#4B5563',
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 20,
  },
  trendSame: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '700',
  },
  trendUp: {
    color: '#10B981',
    fontSize: 10,
  },
  trendDown: {
    color: '#EF4444',
    fontSize: 10,
  },
  coverWrap: {
    width: 50,
    height: 50,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  infoCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  songTitle: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '700',
  },
  artistName: {
    color: '#6B7280',
    fontSize: 12,
  },
  publisherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 1,
  },
  publisherDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#111827',
  },
  publisherDotRed: {
    backgroundColor: '#DC2626',
  },
  publisherText: {
    color: '#6B7280',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  pressed: {
    opacity: 0.6,
  },
});
