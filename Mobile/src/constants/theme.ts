import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#111827',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    background: '#FFFFFF',
    backgroundElement: '#F3F4F6',
    backgroundCard: '#F8F9FA',
    backgroundSelected: '#E5E7EB',
    primary: '#00D3E5',
    primaryDark: '#0097A7',
    accent: '#4DD0E1',
    gradientMint: '#8BF5C8',
    gradientYellow: '#FEF08A',
    border: '#E5E7EB',
    borderHover: 'rgba(0, 211, 229, 0.4)',
    tint: '#111827',
    playerDock: '#CBD5E1',
  },
  dark: {
    text: '#111827',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    background: '#FFFFFF',
    backgroundElement: '#F3F4F6',
    backgroundCard: '#F8F9FA',
    backgroundSelected: '#E5E7EB',
    primary: '#00D3E5',
    primaryDark: '#0097A7',
    accent: '#4DD0E1',
    gradientMint: '#8BF5C8',
    gradientYellow: '#FEF08A',
    border: '#E5E7EB',
    borderHover: 'rgba(0, 211, 229, 0.4)',
    tint: '#111827',
    playerDock: '#CBD5E1',
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
