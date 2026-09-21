import { Pressable, StyleSheet, Text, View } from 'react-native';

type FeaturedMixSectionProps = {
  onPlay: (title: string) => void;
};

export function FeaturedMixSection({ onPlay }: FeaturedMixSectionProps) {
  return (
    <View style={styles.card}>
      <View style={styles.orb} />
      <View style={styles.copy}>
        <Text style={styles.label}>Mix dành cho bạn</Text>
        <Text style={styles.title}>Đêm nay, nghe gì?</Text>
        <Text style={styles.description}>Một set nhạc dịu, sâu và vừa đủ để bạn thả lỏng.</Text>
        <Pressable accessibilityLabel="Phát mix Đêm nay, nghe gì" onPress={() => onPlay('Đêm nay, nghe gì?')} style={styles.button}>
          <Text style={styles.buttonIcon}>▶</Text>
          <Text style={styles.buttonText}>Phát ngay</Text>
        </Pressable>
      </View>
      <Text style={styles.mixNumber}>01</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#D9FF45',
    borderRadius: 28,
    minHeight: 262,
    overflow: 'hidden',
    padding: 24,
    position: 'relative',
  },
  orb: {
    backgroundColor: '#B8E71F',
    borderRadius: 120,
    height: 210,
    opacity: 0.85,
    position: 'absolute',
    right: -64,
    top: -42,
    width: 210,
  },
  copy: { maxWidth: 255, zIndex: 1 },
  label: {
    color: '#35420D',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  title: {
    color: '#10140C',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -1.2,
    lineHeight: 36,
    marginTop: 14,
  },
  description: {
    color: '#35420D',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },
  button: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#12150F',
    borderRadius: 22,
    flexDirection: 'row',
    gap: 8,
    marginTop: 22,
    paddingHorizontal: 15,
    paddingVertical: 11,
  },
  buttonIcon: { color: '#D9FF45', fontSize: 12 },
  buttonText: { color: '#F5F6F0', fontSize: 13, fontWeight: '800' },
  mixNumber: {
    bottom: 18,
    color: '#8BAE16',
    fontSize: 68,
    fontWeight: '900',
    position: 'absolute',
    right: 20,
  },
});
