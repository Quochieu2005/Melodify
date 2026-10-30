import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useMusicControls } from './MusicProvider';
import Artwork from './Artwork';
import { AppIcon } from '@/components/shared/AppIcon';
import { getVisitorId, toggleSongFavorite, type Song } from '@/lib/api';
import { useAdaptiveStyles } from '@/hooks/use-adaptive-styles';
import { useTheme } from '@/hooks/use-theme';

export default function SongRow({ song, songs, showFavorite = false }: { song: Song; songs?: Song[]; showFavorite?: boolean }) {
  const styles = useAdaptiveStyles(baseStyles);
  const theme = useTheme();
  const { playSong, track, isPlaying } = useMusicControls();
  const [favorite, setFavorite] = useState(Boolean(song.is_favorite));
  const [busy, setBusy] = useState(false);
  const artists = song.artists?.map((artist) => artist.name).filter(Boolean).join(', ') || song.artist?.name || 'Nghệ sĩ chưa cập nhật';
  const preferredQuality = song.audio_qualities?.find((quality) => quality.premium_only && quality.available !== false)
    ?? song.audio_qualities?.find((quality) => quality.available !== false);
  const qualityLabel = preferredQuality?.label
    || (preferredQuality?.bitrate ? `${preferredQuality.bitrate} kbps` : null)
    || song.audio_quality;

  const toggleFavorite = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const visitorId = await getVisitorId();
      const result = await toggleSongFavorite(song.slug || song.id, visitorId);
      setFavorite(result.favorited);
    } catch {
      // Keep the saved server state when the request fails.
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.row}>
      <Pressable accessibilityRole="button" onPress={() => void playSong(song, songs)} style={styles.main}>
        <Artwork uri={song.cover_url} size={50} />
        <View style={styles.copy}>
          <Text numberOfLines={1} style={[styles.title, track?.id === song.id && styles.active]}>{song.title}</Text>
          <View style={styles.metadata}>
            {qualityLabel ? <Text numberOfLines={1} style={styles.qualityBadge}>{qualityLabel}</Text> : null}
            <Text numberOfLines={1} style={styles.artist}>{artists}</Text>
          </View>
          {song.publisher ? <Text numberOfLines={1} style={styles.publisher}>{song.publisher}</Text> : null}
        </View>
        {track?.id === song.id && isPlaying ? <AppIcon name="waveform" size={18} /> : <AppIcon name="play" color={theme.primary} size={17} />}
      </Pressable>
      {showFavorite ? <Pressable accessibilityLabel={favorite ? 'Bỏ yêu thích' : 'Yêu thích'} disabled={busy} onPress={() => void toggleFavorite()} style={styles.favorite}><AppIcon name="heart" color={favorite ? '#EF4444' : theme.textMuted} size={18} /></Pressable> : null}
    </View>
  );
}

const baseStyles = StyleSheet.create({
  row: { minHeight: 66, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  main: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 11 },
  copy: { flex: 1, gap: 3, minWidth: 0 },
  metadata: { flexDirection: 'row', alignItems: 'center', gap: 5, minWidth: 0 },
  qualityBadge: { overflow: 'hidden', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4, backgroundColor: '#E2E8F0', color: '#334155', fontSize: 9, fontWeight: '800' },
  title: { color: '#0F172A', fontSize: 14, fontWeight: '700' },
  artist: { color: '#64748B', fontSize: 12 },
  publisher: { color: '#94A3B8', fontSize: 10 },
  favorite: { width: 34, height: 42, alignItems: 'center', justifyContent: 'center' },
  active: { color: '#00B5AD', fontWeight: '800' },
});
