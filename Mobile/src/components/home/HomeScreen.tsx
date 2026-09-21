import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';

import { SongCard } from '@/components/music';
import { AppLayout } from '@/components/layout';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function HomeScreen() {
  return (
    <AppLayout>
      <SafeAreaView style={styles.content}>
        <ThemedText type="title">Melodify</ThemedText>
        <ThemedText style={styles.subtitle}>Nghe nhạc theo cách của bạn</ThemedText>
        <ThemedView style={styles.list}>
          <SongCard title="Bài hát nổi bật" artist="Melodify Artist" />
          <SongCard title="Giai điệu mới" artist="Melodify Artist" />
        </ThemedView>
      </SafeAreaView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: 24, gap: 8 },
  subtitle: { opacity: 0.7 },
  list: { gap: 12, marginTop: 24 },
});
