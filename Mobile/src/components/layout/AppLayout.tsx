import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';

import { ThemedView } from '@/components/themed-view';

type AppLayoutProps = { children: ReactNode };

export default function AppLayout({ children }: AppLayoutProps) {
  return <ThemedView style={styles.container}>{children}</ThemedView>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
