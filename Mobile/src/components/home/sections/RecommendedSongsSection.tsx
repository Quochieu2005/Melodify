import { Pressable, StyleSheet, Text, View } from 'react-native';

const songs = [
  { title: 'Vệt nắng cuối ngày', artist: 'Lê Minh', color: '#F0A56B', duration: '3:42' },
  { title: 'Một chút bình yên', artist: 'Nhã An', color: '#6D9DE8', duration: '4:08' },
  { title: 'Cà phê sau mưa', artist: 'The June Club', color: '#B77AD9', duration: '3:16' },
];

type RecommendedSongsSectionProps = {
  onPlay: (title: string) => void;
};

export function RecommendedSongsSection({ onPlay }: RecommendedSongsSectionProps) {
  return (
    <View>
      <Text style={styles.heading}>Dành cho bạn</Text>
      <View style={styles.list}>
        {songs.map((song, index) => (
          <Pressable key={song.title} onPress={() => onPlay(song.title)} style={styles.row}>
            <View style={[styles.art, { backgroundColor: song.color }]}>
              <Text style={styles.artText}>{String(index + 1).padStart(2, '0')}</Text>
            </View>
            <View style={styles.copy}>
              <Text numberOfLines={1} style={styles.title}>{song.title}</Text>
              <Text numberOfLines={1} style={styles.artist}>{song.artist}</Text>
            </View>
            <Text style={styles.duration}>{song.duration}</Text>
            <Text style={styles.play}>▶</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { color: '#F5F6F0', fontSize: 20, fontWeight: '800' },
  list: { gap: 10, marginTop: 14 },
  row: { alignItems: 'center', flexDirection: 'row', minHeight: 58 },
  art: { alignItems: 'center', borderRadius: 14, height: 54, justifyContent: 'center', width: 54 },
  artText: { color: '#10140C', fontSize: 13, fontWeight: '900' },
  copy: { flex: 1, marginLeft: 12 },
  title: { color: '#F5F6F0', fontSize: 14, fontWeight: '800' },
  artist: { color: '#8F988A', fontSize: 12, marginTop: 4 },
  duration: { color: '#737B70', fontSize: 11, marginRight: 16 },
  play: { color: '#D9FF45', fontSize: 12, width: 18 },
});
