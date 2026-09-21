import { Pressable, StyleSheet, Text, View } from 'react-native';

export function HomeHeader() {
  return (
    <View style={styles.row}>
      <View>
        <Text style={styles.kicker}>Melodify</Text>
        <Text style={styles.subtitle}>Âm nhạc cho nhịp sống của bạn</Text>
      </View>

      <Pressable accessibilityLabel="Mở hồ sơ" style={styles.profile}>
        <Text style={styles.profileText}>QH</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  kicker: {
    color: '#D9FF45',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  subtitle: {
    color: '#9DA49A',
    fontSize: 12,
    marginTop: 4,
  },
  profile: {
    alignItems: 'center',
    backgroundColor: '#242923',
    borderColor: '#394136',
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  profileText: {
    color: '#F5F6F0',
    fontSize: 12,
    fontWeight: '800',
  },
});
