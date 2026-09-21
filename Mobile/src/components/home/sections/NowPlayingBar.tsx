import { Pressable, StyleSheet, Text, View } from 'react-native';

type NowPlayingBarProps = { title: string };

export function NowPlayingBar({ title }: NowPlayingBarProps) {
  return (
    <View style={styles.bar}>
      <View style={styles.cover}><Text style={styles.note}>♫</Text></View>
      <View style={styles.copy}>
        <Text style={styles.playing}>Đang phát</Text>
        <Text numberOfLines={1} style={styles.title}>{title}</Text>
      </View>
      <Pressable accessibilityLabel="Tạm dừng" style={styles.pause}>
        <Text style={styles.pauseText}>Ⅱ</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    alignItems: 'center',
    backgroundColor: '#1D221B',
    borderColor: '#384131',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    marginHorizontal: 18,
    padding: 10,
  },
  cover: { alignItems: 'center', backgroundColor: '#D9FF45', borderRadius: 12, height: 42, justifyContent: 'center', width: 42 },
  note: { color: '#151A11', fontSize: 22, fontWeight: '800' },
  copy: { flex: 1, marginLeft: 11 },
  playing: { color: '#99A777', fontSize: 10, fontWeight: '700' },
  title: { color: '#F5F6F0', fontSize: 13, fontWeight: '800', marginTop: 3 },
  pause: { alignItems: 'center', borderColor: '#67714E', borderRadius: 17, borderWidth: 1, height: 34, justifyContent: 'center', width: 34 },
  pauseText: { color: '#D9FF45', fontSize: 13, fontWeight: '900' },
});
