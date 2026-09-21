import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const items = [
  { title: 'Midnight Drive', meta: '12 bài hát', color: '#7B6BFF', mark: 'MD' },
  { title: 'Soft Focus', meta: '8 bài hát', color: '#E58C73', mark: 'SF' },
  { title: 'After Rain', meta: '14 bài hát', color: '#4E9B8A', mark: 'AR' },
];

type ContinueListeningSectionProps = {
  onPlay: (title: string) => void;
};

export function ContinueListeningSection({ onPlay }: ContinueListeningSectionProps) {
  return (
    <View>
      <View style={styles.headingRow}>
        <Text style={styles.heading}>Nghe tiếp</Text>
        <Text style={styles.more}>Xem tất cả</Text>
      </View>
      <ScrollView contentContainerStyle={styles.list} horizontal showsHorizontalScrollIndicator={false}>
        {items.map((item) => (
          <Pressable key={item.title} onPress={() => onPlay(item.title)} style={styles.card}>
            <View style={[styles.art, { backgroundColor: item.color }]}>
              <Text style={styles.mark}>{item.mark}</Text>
              <Text style={styles.artNote}>♫</Text>
            </View>
            <Text numberOfLines={1} style={styles.title}>{item.title}</Text>
            <Text style={styles.meta}>{item.meta}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  headingRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  heading: { color: '#F5F6F0', fontSize: 20, fontWeight: '800' },
  more: { color: '#A3B833', fontSize: 12, fontWeight: '700' },
  list: { gap: 14, paddingBottom: 4, paddingTop: 16 },
  card: { width: 148 },
  art: {
    borderRadius: 18,
    height: 148,
    justifyContent: 'space-between',
    overflow: 'hidden',
    padding: 14,
  },
  mark: { color: '#FFFFFF', fontSize: 17, fontWeight: '900', letterSpacing: 1 },
  artNote: { alignSelf: 'flex-end', color: 'rgba(255,255,255,0.75)', fontSize: 42, lineHeight: 42 },
  title: { color: '#F5F6F0', fontSize: 14, fontWeight: '800', marginTop: 10 },
  meta: { color: '#8F988A', fontSize: 12, marginTop: 4 },
});
