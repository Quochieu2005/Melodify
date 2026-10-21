import type { PropsWithChildren, ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export function ScrollPage({ children, padded = true }: PropsWithChildren<{ padded?: boolean }>) {
  return (
    <ScrollView
      contentContainerStyle={[styles.page, !padded && styles.noPadding]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

export function PageHeading({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <View style={styles.pageHeading}>
      <View style={styles.headingCopy}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}

export function SectionHeading({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action}
    </View>
  );
}

export function InlineAction({ label, onPress }: { label: string; onPress: () => void }) {
  return <Pressable onPress={onPress}><Text style={styles.action}>{label}</Text></Pressable>;
}

export function StateMessage({ loading, error, empty, onRetry }: { loading?: boolean; error?: string; empty?: string; onRetry?: () => void }) {
  if (loading) {
    return <View style={styles.state}><ActivityIndicator color="#00B5AD" /><Text style={styles.stateText}>Đang tải dữ liệu…</Text></View>;
  }
  if (error) {
    return <View style={styles.state}><Text style={styles.stateText}>{error}</Text>{onRetry ? <Pressable onPress={onRetry}><Text style={styles.action}>Thử lại</Text></Pressable> : null}</View>;
  }
  if (empty) return <View style={styles.state}><Text style={styles.stateText}>{empty}</Text></View>;
  return null;
}

export function PrimaryButton({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable disabled={disabled} onPress={onPress} style={[styles.primaryButton, disabled && styles.disabled]}><Text style={styles.primaryText}>{label}</Text></Pressable>;
}

export const surfaceStyles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  body: { padding: 14 },
  muted: { color: '#64748B', fontSize: 13, lineHeight: 19 },
  title: { color: '#0F172A', fontSize: 15, fontWeight: '800' },
});

const styles = StyleSheet.create({
  page: { width: '100%', maxWidth: 980, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 22, gap: 20 },
  noPadding: { paddingHorizontal: 0 },
  pageHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  headingCopy: { flex: 1, gap: 5 },
  title: { color: '#0F172A', fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  subtitle: { color: '#64748B', fontSize: 13, lineHeight: 19 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sectionTitle: { color: '#0F172A', fontSize: 18, fontWeight: '900' },
  action: { color: '#00B5AD', fontSize: 13, fontWeight: '700', paddingVertical: 5 },
  state: { minHeight: 100, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16, backgroundColor: '#F8FAFC', borderRadius: 14 },
  stateText: { color: '#64748B', fontSize: 13, textAlign: 'center', lineHeight: 19 },
  primaryButton: { minHeight: 46, paddingHorizontal: 18, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#00B5AD' },
  primaryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  disabled: { opacity: 0.5 },
});
