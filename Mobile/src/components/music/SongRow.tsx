import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useMusic } from './MusicProvider';
import Artwork from './Artwork';
import { AppIcon } from '@/components/shared/AppIcon';
import { getVisitorId, toggleSongFavorite, type Song } from '@/lib/api';

export default function SongRow({ song, songs, showFavorite = false }: { song: Song; songs?: Song[]; showFavorite?: boolean }) {
  const { playSong, track, isPlaying } = useMusic();
  const [favorite, setFavorite] = useState(Boolean(song.is_favorite));
  const [busy, setBusy] = useState(false);
  const artists = song.artists?.map((artist) => artist.name).filter(Boolean).join(', ') || song.artist?.name || 'Nghệ sĩ chưa cập nhật';

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
        <Artwork uri={song.cover_url} size={54} />
        <View style={styles.copy}>
          <Text numberOfLines={1} style={[styles.title, track?.id === song.id && styles.active]}>{song.title}</Text>
          <Text numberOfLines={1} style={styles.artist}>{artists}</Text>
          {song.publisher ? <Text numberOfLines={1} style={styles.publisher}>{song.publisher}</Text> : null}
        </View>
        {track?.id === song.id && isPlaying ? <AppIcon name="waveform" size={18} /> : <AppIcon name="play" color="#00D3E5" size={17} />}
      </Pressable>
      {showFavorite ? <Pressable accessibilityLabel={favorite ? 'Bỏ yêu thích' : 'Yêu thích'} disabled={busy} onPress={() => void toggleFavorite()} style={styles.favorite}><AppIcon name="heart" color={favorite ? '#00D3E5' : '#9CA8A2'} size={18} /></Pressable> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 70, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.055)' },
  main: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 11 },
  copy: { flex: 1, gap: 3, minWidth: 0 },
  title: { color: '#F5F7F6', fontSize: 14, fontWeight: '800' },
  artist: { color: '#B2BCB7', fontSize: 12 },
  publisher: { color: '#87938D', fontSize: 10 },
  favorite: { width: 34, height: 42, alignItems: 'center', justifyContent: 'center' },
  active: { color: '#00D3E5' },
});
