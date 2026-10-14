import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { SongItem } from '@/constants/mockData';

interface NowPlayingBarProps {
  track: SongItem;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  onPressTrack?: () => void;
}

export function NowPlayingBar({
  track,
  isPlaying = true,
  onTogglePlay,
  onPressTrack,
}: NowPlayingBarProps) {
  const [isLiked, setIsLiked] = useState(true); // Solid black heart in screenshot

  return (
    <View style={styles.dockContainer}>
      <Pressable
        onPress={onPressTrack}
        style={({ pressed }) => [styles.dockPill, pressed && styles.pressed]}
      >
        {/* Track Thumbnail */}
        <View style={styles.coverWrap}>
          <Image source={{ uri: track.coverUrl }} style={styles.coverImage} />
        </View>

        {/* Track Info */}
        <View style={styles.infoCol}>
          <Text numberOfLines={1} style={styles.title}>
            {track.title}
          </Text>
          <Text numberOfLines={1} style={styles.artist}>
            {track.artist}
          </Text>
        </View>

        {/* Action Controls: Heart + Play */}
        <View style={styles.controlsRow}>
          {/* Heart Button */}
          <Pressable
            hitSlop={10}
            onPress={() => setIsLiked((prev) => !prev)}
            style={styles.actionBtn}
          >
            <Text style={[styles.heartIcon, isLiked && styles.heartIconActive]}>
              {isLiked ? '♥' : '♡'}
            </Text>
          </Pressable>

          {/* Play/Pause Button */}
          <Pressable hitSlop={10} onPress={onTogglePlay} style={styles.actionBtn}>
            <Text style={styles.playIcon}>{isPlaying ? '⏸' : '▶'}</Text>
          </Pressable>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  dockContainer: {
    paddingHorizontal: 14,
    paddingBottom: 6,
    backgroundColor: '#FFFFFF',
  },
  dockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#CBD5E1',
    borderRadius: 14,
    paddingVertical: 7,
    paddingHorizontal: 10,
    gap: 12,
  },
  coverWrap: {
    width: 44,
    height: 44,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1E293B',
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
  title: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '800',
  },
  artist: {
    color: '#4B5563',
    fontSize: 12,
    fontWeight: '500',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingRight: 4,
  },
  actionBtn: {
    padding: 2,
  },
  heartIcon: {
    color: '#111827',
    fontSize: 22,
  },
  heartIconActive: {
    color: '#111827',
  },
  playIcon: {
    color: '#111827',
    fontSize: 18,
  },
  pressed: {
    opacity: 0.85,
  },
});
