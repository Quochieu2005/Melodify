import { Pressable, StyleSheet, Text, View } from 'react-native';

interface HomeHeaderProps {
  onSearchPress?: () => void;
  onMusicPress?: () => void;
}

export function HomeHeader({ onSearchPress, onMusicPress }: HomeHeaderProps) {
  return (
    <View style={styles.container}>
      {/* Brand Title: Logo + "Mạng Xã Hội âm nhạc NCT" */}
      <View style={styles.brandRow}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoBars}>ılı.</Text>
        </View>
        <Text style={styles.brandText}>Mạng Xã Hội âm nhạc NCT</Text>
      </View>

      {/* Right Circular Action Buttons */}
      <View style={styles.actionsRow}>
        {/* Search Circle Button */}
        <Pressable
          accessibilityLabel="Tìm kiếm"
          accessibilityRole="button"
          onPress={onSearchPress}
          style={({ pressed }) => [styles.circleButton, pressed && styles.pressed]}
        >
          <Text style={styles.actionIcon}>🔍</Text>
        </Pressable>

        {/* Music Feed / Discover Circle Button */}
        <Pressable
          accessibilityLabel="Bộ sưu tập âm nhạc"
          accessibilityRole="button"
          onPress={onMusicPress}
          style={({ pressed }) => [styles.circleButton, pressed && styles.pressed]}
        >
          <Text style={styles.actionIcon}>♬</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBars: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: -1,
  },
  brandText: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  circleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  actionIcon: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.6,
  },
});
