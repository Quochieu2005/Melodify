/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { createContext, useContext } from 'react';
import { Colors } from '@/constants/theme';

export type ThemeMode = keyof typeof Colors;
export const ThemeModeContext = createContext<ThemeMode>('light');

export function useTheme() {
  const scheme = useContext(ThemeModeContext);
  return Colors[scheme];
}

export function useThemeMode() {
  return useContext(ThemeModeContext);
}
