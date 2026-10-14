import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { SongItem } from '@/constants/mockData';

interface MusicPlayerProps {
  track: SongItem | null;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onPressTrack?: () => void;
}

export default function MusicPlayer({
  track,
  isPlaying = true,
  onTogglePlay,
  onNext,
  onPrevious,
  onPressTrack,
}: MusicPlayerProps) {
  const [isLiked, setIsLiked] = useState(false);

  if (!track) {
    return null;
  }

  return (
    <View style={styles.dockWrapper}>
      <Pressable
        onPress={onPressTrack}
        style={({ pressed }) => [styles.container, pressed && styles.containerPressed]}
      >
        {/* Track Thumbnail */}
        <View style={styles.coverWrap}>
          <Image source={{ uri: track.coverUrl }} style={styles.coverImage} />
        </View>

        {/* Track Info */}
        <View style={styles.infoCol}>
          <View style={styles.titleRow}>
            <Text numberOfLines={1} style={styles.title}>
              {track.title}
            </Text>
            {track.isLossless && (
              <View style={styles.losslessBadge}>
                <Text style={styles.losslessText}>LOSSLESS</Text>
              </View>
            )}
          </View>
          <Text numberOfLines={1} style={styles.artist}>
            {track.artist}
          </Text>
        </View>

        {/* Action Controls */}
        <View style={styles.controlsRow}>
          {/* Heart Button */}
          <Pressable
            hitSlop={8}
            onPress={() => setIsLiked((prev) => !prev)}
            style={styles.iconButton}
          >
            <Text style={[styles.heartIcon, isLiked && styles.heartIconLiked]}>
              {isLiked ? '♥' : '♡'}
            </Text>
          </Pressable>

          {/* Previous */}
          {onPrevious && (
            <Pressable hitSlop={6} onPress={onPrevious} style={styles.iconButton}>
              <Text style={styles.navIcon}>⏮</Text>
            </Pressable>
          )}

          {/* Play/Pause Button */}
          <Pressable
            hitSlop={8}
            onPress={onTogglePlay}
            style={({ pressed }) => [styles.playButton, pressed && styles.pressed]}
          >
            <Text style={styles.playIcon}>{isPlaying ? '⏸' : '▶'}</Text>
          </Pressable>

          {/* Next */}
          {onNext && (
            <Pressable hitSlop={6} onPress={onNext} style={styles.iconButton}>
              <Text style={styles.navIcon}>⏭</Text>
            </Pressable>
          )}
        </View>
      </Pressable>

      {/* Progress Track at bottom */}
      <View style={styles.progressTrack}>
        <View style={styles.progressBar} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dockWrapper: {
    backgroundColor: '#16201E',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 12,
  },
  containerPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  coverWrap: {
    width: 44,
    height: 44,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#263230',
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
  },
  losslessBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    borderWidth: 0.8,
    borderColor: '#00D3E5',
  },
  losslessText: {
    color: '#00D3E5',
    fontSize: 7.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  artist: {
    color: '#8C968F',
    fontSize: 11,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconButton: {
    padding: 4,
  },
  heartIcon: {
    color: '#8C968F',
    fontSize: 18,
  },
  heartIconLiked: {
    color: '#FF6F91',
  },
  navIcon: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#00D3E5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00D3E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  playIcon: {
    color: '#072E31',
    fontSize: 13,
    fontWeight: '900',
    marginLeft: 1,
  },
  progressTrack: {
    height: 2.5,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    width: '100%',
  },
  progressBar: {
    height: '100%',
    width: '38%',
    backgroundColor: '#00D3E5',
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.95 }],
  },
});
