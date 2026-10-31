import { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type Palette = ReturnType<typeof useTheme>;
type StyleRecord = Record<string, unknown>;

const textColors: Record<string, keyof Palette> = {
  '#092326': 'text', '#0F172A': 'text', '#1E293B': 'text', '#334155': 'textSecondary', '#475569': 'textSecondary',
  '#64716B': 'textMuted', '#64748B': 'textMuted', '#6B7973': 'textMuted', '#6F7C77': 'textMuted', '#6F7E78': 'textMuted', '#75817B': 'textMuted', '#8E9C96': 'textMuted', '#8F9994': 'textMuted',
  '#94A3B8': 'textMuted', '#9CA8A2': 'textMuted', '#AEB8B3': 'textSecondary', '#B6C4BF': 'textSecondary',
  '#C2C8C5': 'textSecondary', '#E7ECE9': 'text', '#E9EEEC': 'text', '#F5F7F6': 'text',
  '#00B5AD': 'primary', '#00D3E5': 'primary', '#082326': 'primaryOn',
  '#909F99': 'textMuted', '#8B9893': 'textMuted', '#93A49E': 'textMuted',
  '#7D8C86': 'textMuted', '#82918B': 'textMuted', '#7F8E88': 'textMuted',
};

const surfaces: Record<string, keyof Palette> = {
  '#FFFFFF': 'backgroundCard', '#F8FAFC': 'backgroundElement', '#F1F5F9': 'backgroundElement',
  '#E2E8F0': 'border', '#CBD5E1': 'backgroundElement', '#E6FAF7': 'backgroundSelected',
  '#151817': 'background', '#151D1A': 'background', '#151C1A': 'background',
  '#202A28': 'backgroundCard', '#202624': 'backgroundCard', '#1E2824': 'backgroundCard',
  '#1E2825': 'backgroundCard', '#202C27': 'backgroundCard', '#242F2C': 'backgroundCard',
  '#22302B': 'backgroundCard', '#29322F': 'backgroundCard', '#29332F': 'backgroundCard', '#293B34': 'backgroundCard', '#35413D': 'backgroundElement', '#35433E': 'backgroundElement',
  '#1E1210': 'background', '#1C1313': 'background', '#19221F': 'background', '#1B2421': 'backgroundElement',
  '#222222': 'backgroundCard', '#242424': 'backgroundCard', '#252525': 'backgroundCard',
  '#2F2F2F': 'backgroundElement', '#303030': 'border', '#333333': 'backgroundSelected',
  '#383838': 'border', '#203332': 'backgroundSelected', '#2F3C37': 'backgroundSelected',
  '#E2F4EF': 'backgroundSelected', '#ECEFF1': 'backgroundCard', '#1C2925': 'backgroundElement',
  '#24302C': 'backgroundCard', '#1E2724': 'backgroundCard',
  '#35403C': 'border', '#26342F': 'border', '#2A3732': 'border', '#364540': 'border', '#DDE8E4': 'border',
};

function adaptStyle(style: StyleRecord, palette: Palette, styleName = ''): StyleRecord {
  const next = { ...style };
  const isDark = palette.background !== '#FFFFFF';
  for (const [property, value] of Object.entries(next)) {
    if (typeof value !== 'string') continue;
    if (value.startsWith('rgba(')) {
      if (property === 'color' && value.startsWith('rgba(255, 255, 255')) {
        const opacity = Number(value.match(/,\s*([\d.]+)\s*\)$/)?.[1] ?? 1);
        next[property] = isDark ? value : opacity < 0.5 ? palette.textMuted : opacity < 0.75 ? palette.textSecondary : palette.text;
      } else if (property === 'backgroundColor' && value.startsWith('rgba(28, 17, 17')) {
        next[property] = isDark ? value : 'rgba(255, 255, 255, 0.9)';
      } else if (property === 'backgroundColor' && value.startsWith('rgba(255, 255, 255')) {
        next[property] = isDark ? value : palette.backgroundSelected;
      }
      continue;
    }
    if (!value.startsWith('#')) continue;
    const color = value.toUpperCase();
    if (property === 'color' || property === 'placeholderTextColor') {
      const token = textColors[color];
      if (token) next[property] = palette[token];
      else if (color === '#FFFFFF' && !isDark && !['bannerTitle', 'artistName', 'avatarFallbackText'].includes(styleName)) next[property] = palette.text;
    } else if (property.toLowerCase().includes('border') && property.toLowerCase().includes('color')) {
      if (['#F1F5F9', '#E2E8F0', '#DDE8E4', '#35403C', '#26342F', '#2A3732', '#364540'].includes(color)) {
        next[property] = palette.border;
      }
    } else if (property === 'backgroundColor') {
      const token = surfaces[color];
      if (token) next[property] = palette[token];
    }
  }
  return next;
}

/** Converts the existing light/dark literals in a screen's StyleSheet into shared time-based tokens. */
export function useAdaptiveStyles<T extends Record<string, unknown>>(baseStyles: T): T {
  const palette = useTheme();
  return useMemo(() => {
    const themed = Object.fromEntries(Object.entries(baseStyles).map(([key, value]) => {
      const flattened = StyleSheet.flatten(value as never) as StyleRecord | undefined;
      return [key, flattened ? adaptStyle(flattened, palette, key) : value];
    }));
    return StyleSheet.create(themed as never) as T;
  }, [baseStyles, palette]);
}

export function useAdaptiveStyle<T>(baseStyle: T): T {
  const palette = useTheme();
  return useMemo(() => {
    const flattened = StyleSheet.flatten(baseStyle as never) as StyleRecord | undefined;
    return (flattened ? adaptStyle(flattened, palette) : baseStyle) as T;
  }, [baseStyle, palette]);
}
