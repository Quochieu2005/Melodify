import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function MusicPlayer() {
  return (
    <ThemedView style={styles.container} type="backgroundElement">
      <ThemedText type="default">Chưa phát bài hát</ThemedText>
      <ThemedText style={styles.description}>Trình phát sẽ được kết nối với API sau.</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, borderRadius: 16, gap: 4 },
  description: { opacity: 0.65 },
});
