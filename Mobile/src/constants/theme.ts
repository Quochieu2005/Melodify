import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#F5F7F6',
    textSecondary: '#C2C8C5',
    textMuted: '#8F9994',
    background: '#151817',
    backgroundElement: '#202A28',
    backgroundCard: '#29322F',
    backgroundSelected: '#34403C',
    primary: '#00D3E5',
    primaryDark: '#00AEBB',
    accent: '#52DDE8',
    gradientMint: '#8BF5C8',
    gradientYellow: '#FFB84D',
    border: '#35403C',
    borderHover: 'rgba(0, 211, 229, 0.4)',
    tint: '#F5F7F6',
    playerDock: '#202624',
  },
  dark: {
    text: '#F5F7F6',
    textSecondary: '#C2C8C5',
    textMuted: '#8F9994',
    background: '#151817',
    backgroundElement: '#202A28',
    backgroundCard: '#29322F',
    backgroundSelected: '#34403C',
    primary: '#00D3E5',
    primaryDark: '#00AEBB',
    accent: '#52DDE8',
    gradientMint: '#8BF5C8',
    gradientYellow: '#FFB84D',
    border: '#35403C',
    borderHover: 'rgba(0, 211, 229, 0.4)',
    tint: '#F5F7F6',
    playerDock: '#202624',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
