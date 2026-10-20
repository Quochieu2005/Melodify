import { DefaultTheme, Slot, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { MusicProvider } from '@/components/music';

void SplashScreen.preventAutoHideAsync();

const MelodifyTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#151817',
    card: '#202A28',
    text: '#F5F7F6',
    border: '#35403C',
    primary: '#00D3E5',
  },
};

export default function RootProviders() {
  return (
    <ThemeProvider value={MelodifyTheme}>
      <MusicProvider>
        <AnimatedSplashOverlay />
        <Slot />
      </MusicProvider>
    </ThemeProvider>
  );
}
