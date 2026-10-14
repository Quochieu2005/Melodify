import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AlbumItem, MOCK_ALBUMS } from '@/constants/mockData';

interface AlbumHotSectionProps {
  onAlbumPress?: (album: AlbumItem) => void;
}

export function AlbumHotSection({ onAlbumPress }: AlbumHotSectionProps) {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headingRow}>
        <View style={styles.titleWithBar}>
          <View style={styles.accentBar} />
          <Text style={styles.heading}>Album Hot</Text>
        </View>
        <Pressable hitSlop={8} style={({ pressed }) => pressed && styles.pressed}>
          <Text style={styles.more}>Thêm ›</Text>
        </Pressable>
      </View>

      {/* Horizontal Album List */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
      >
        {MOCK_ALBUMS.map((album) => (
          <Pressable
            key={album.id}
            onPress={() => onAlbumPress?.(album)}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          >
            {/* Square Cover Art with Play Button Overlay */}
            <View style={styles.coverWrap}>
              <Image source={{ uri: album.coverUrl }} style={styles.coverImage} />
              <View style={styles.gradientOverlay} />

              {/* Floating Play Button */}
              <View style={styles.playButton}>
                <Text style={styles.playIcon}>▶</Text>
              </View>

              {album.year && (
                <View style={styles.yearBadge}>
                  <Text style={styles.yearText}>{album.year}</Text>
                </View>
              )}
            </View>

            {/* Title & Artist */}
            <Text numberOfLines={1} style={styles.title}>
              {album.title}
            </Text>
            <Text numberOfLines={1} style={styles.artist}>
              {album.artist}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleWithBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accentBar: {
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: '#00D3E5',
  },
  heading: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  more: {
    color: '#BDBDBD',
    fontSize: 13,
    fontWeight: '600',
  },
  list: {
    gap: 14,
    paddingRight: 6,
  },
  card: {
    width: 136,
  },
  coverWrap: {
    width: 136,
    height: 136,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#16201E',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  playButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#00D3E5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  playIcon: {
    color: '#072E31',
    fontSize: 12,
    marginLeft: 2,
  },
  yearBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  yearText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
  },
  artist: {
    color: '#BDBDBD',
    fontSize: 11,
    marginTop: 2,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
});
