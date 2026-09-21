import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

type SongCardProps = { title: string; artist: string };

export default function SongCard({ title, artist }: SongCardProps) {
  return (
    <ThemedView style={styles.card} type="backgroundElement">
      <ThemedText type="default">{title}</ThemedText>
      <ThemedText style={styles.artist}>{artist}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 16, gap: 4 },
  artist: { opacity: 0.65 },
});
