import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { MusicProvider } from '@/components/music';
import { Colors } from '@/constants/theme';
import { ThemeModeContext, type ThemeMode } from '@/hooks/use-theme';

void SplashScreen.preventAutoHideAsync();

const vietnamHourFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Ho_Chi_Minh',
  hour: '2-digit',
  hourCycle: 'h23',
});

function getTimeTheme(): ThemeMode {
  const hour = Number(vietnamHourFormatter.format(new Date()));
  return hour >= 6 && hour < 18 ? 'light' : 'dark';
}

export default function RootProviders() {
  const [mode, setMode] = useState<ThemeMode>(getTimeTheme);
  useEffect(() => {
    const refresh = () => setMode(getTimeTheme());
    refresh();
    let minuteInterval: ReturnType<typeof setInterval> | undefined;
    const firstMinute = setTimeout(() => {
      refresh();
      minuteInterval = setInterval(refresh, 60_000);
    }, 60_000 - (Date.now() % 60_000));
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      clearTimeout(firstMinute);
      if (minuteInterval) clearInterval(minuteInterval);
      subscription.remove();
    };
  }, []);

  const navigationTheme = useMemo(() => ({
    ...DefaultTheme,
    dark: mode === 'dark',
    colors: {
      ...DefaultTheme.colors,
      background: Colors[mode].background,
      card: Colors[mode].backgroundCard,
      text: Colors[mode].text,
      border: Colors[mode].border,
      primary: Colors[mode].primary,
    },
  }), [mode]);

  return (
    <ThemeModeContext.Provider value={mode}>
      <ThemeProvider value={navigationTheme}>
        <MusicProvider>
          <AnimatedSplashOverlay />
          <Stack
            screenOptions={{
              headerShown: false,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              animation: 'slide_from_right',
            }}
          />
        </MusicProvider>
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}
