import { Image, StyleSheet, View } from 'react-native';
import { AppIcon } from '@/components/shared/AppIcon';

export default function Artwork({ uri, size = 56, round = false }: { uri?: string | null; size?: number; round?: boolean }) {
  return (
    <View style={[styles.fallback, { width: size, height: size, borderRadius: round ? size / 2 : 9 }]}>
      {uri ? <Image source={{ uri }} resizeMode="cover" style={[StyleSheet.absoluteFill, { borderRadius: round ? size / 2 : 9 }]} /> : <AppIcon name="music" color="#00D3E5" size={Math.min(28, size * 0.5)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: '#35413D' },
});
