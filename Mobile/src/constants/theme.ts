import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#17191C',
    textSecondary: '#4B5563',
    textMuted: '#818A96',
    background: '#FFFFFF',
    backgroundElement: '#F4F5F6',
    backgroundCard: '#FFFFFF',
    backgroundSelected: '#E5F8F8',
    primary: '#00AEBB',
    primaryDark: '#008B95',
    primaryOn: '#062C30',
    accent: '#00B5AD',
    gradientMint: '#FFFFFF',
    gradientYellow: '#FFB84D',
    border: '#E4E7EB',
    borderHover: 'rgba(0, 174, 187, 0.35)',
    tint: '#17191C',
    playerDock: '#F0F1F2',
  },
  dark: {
    text: '#F5F7F6',
    textSecondary: '#B6B6B6',
    textMuted: '#858585',
    background: '#111111',
    backgroundElement: '#1D1D1F',
    backgroundCard: '#242424',
    backgroundSelected: '#333333',
    primary: '#00D3E5',
    primaryDark: '#00AEBB',
    primaryOn: '#062C30',
    accent: '#00D3E5',
    gradientMint: '#111111',
    gradientYellow: '#FFB84D',
    border: '#383838',
    borderHover: 'rgba(0, 211, 229, 0.4)',
    tint: '#F5F7F6',
    playerDock: '#222222',
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
