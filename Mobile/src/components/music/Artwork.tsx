import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { AppIcon } from '@/components/shared/AppIcon';
import { useAdaptiveStyles } from '@/hooks/use-adaptive-styles';
import { useTheme } from '@/hooks/use-theme';

export default function Artwork({ uri, size = 56, round = false }: { uri?: string | null; size?: number; round?: boolean }) {
  const styles = useAdaptiveStyles(baseStyles);
  const theme = useTheme();
  return (
    <View style={[styles.fallback, { width: size, height: size, borderRadius: round ? size / 2 : 9 }]}>
      {uri ? <Image source={{ uri }} contentFit="cover" cachePolicy="memory-disk" recyclingKey={uri} style={[StyleSheet.absoluteFill, { borderRadius: round ? size / 2 : 9 }]} /> : <AppIcon name="music" color={theme.primary} size={Math.min(28, size * 0.5)} />}
    </View>
  );
}

const baseStyles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: '#35413D' },
});
