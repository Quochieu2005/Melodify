import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';

type AppButtonProps = { label: string; onPress?: () => void };

export default function AppButton({ label, onPress }: AppButtonProps) {
  return (
    <Pressable onPress={onPress} style={styles.button}>
      <ThemedText style={styles.label}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10, backgroundColor: '#16a34a' },
  label: { color: '#ffffff', textAlign: 'center', fontWeight: '600' },
});
