import Svg, { Circle, Path, Rect } from 'react-native-svg';

type IconName = 'home' | 'waveform' | 'for-you' | 'user' | 'library' | 'search' | 'music' | 'play' | 'pause' | 'next' | 'chevron' | 'heart';

export function AppIcon({ name, color = '#F5F7F6', size = 22 }: { name: IconName; color?: string; size?: number }) {
  if (name === 'waveform') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Rect x="1" y="9" width="2" height="6" rx="1" fill="#49cbd5" />
        <Rect x="4.5" y="6" width="2" height="12" rx="1" fill="#5cd9df" />
        <Rect x="8" y="3" width="2" height="18" rx="1" fill="#f4f2e9" />
        <Rect x="11.5" y="7" width="2" height="10" rx="1" fill="#55c8db" />
        <Rect x="15" y="4" width="2" height="16" rx="1" fill="#9edb80" />
        <Rect x="18.5" y="7" width="2" height="10" rx="1" fill="#f2c865" />
        <Rect x="22" y="10" width="1.5" height="4" rx="0.75" fill="#67d5e0" />
      </Svg>
    );
  }

  if (name === 'for-you') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Rect x="2" y="10" width="2.5" height="10" rx="1.25" fill={color} />
        <Rect x="6.5" y="6" width="2.5" height="14" rx="1.25" fill={color} />
        <Rect x="11" y="8" width="2.5" height="12" rx="1.25" fill={color} />
        <Rect x="15.5" y="10" width="2.5" height="10" rx="1.25" fill={color} />
        <Path d="m19 11.2-4.15-3.96a2.9 2.9 0 0 1 4.1-4.1l.05.05.05-.05a2.9 2.9 0 0 1 4.1 4.1L19 11.2Z" fill={color} />
      </Svg>
    );
  }

  if (name === 'search') {
    return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Circle cx="10.5" cy="10.5" r="7" stroke={color} strokeWidth="2" /><Path d="m16 16 5 5" stroke={color} strokeWidth="2" strokeLinecap="round" /></Svg>;
  }

  if (name === 'user') {
    return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M12 12.25a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0-2.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5ZM3 21.75a9 9 0 0 1 18 0h-2.5a6.5 6.5 0 0 0-13 0H3Z" fill={color} /></Svg>;
  }

  if (name === 'home') {
    return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="m3.5 10.5 8.5-7 8.5 7v9a1.5 1.5 0 0 1-1.5 1.5h-5v-6h-4v6H5a1.5 1.5 0 0 1-1.5-1.5v-9Z" stroke={color} strokeWidth="2" strokeLinejoin="round" /></Svg>;
  }

  if (name === 'library') {
    return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M5 5h15M5 10h15M5 15h15M5 20h15" stroke={color} strokeWidth="2" strokeLinecap="round" /><Circle cx="2.5" cy="5" r="1" fill={color} /><Circle cx="2.5" cy="10" r="1" fill={color} /><Circle cx="2.5" cy="15" r="1" fill={color} /><Circle cx="2.5" cy="20" r="1" fill={color} /></Svg>;
  }

  if (name === 'music') {
    return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M9 18V5l12-2v13" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><Circle cx="6" cy="18" r="3" fill={color} /><Circle cx="18" cy="16" r="3" fill={color} /></Svg>;
  }

  if (name === 'play') {
    return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M7 4.8a1.4 1.4 0 0 1 2.1-1.2l11 7.2a1.4 1.4 0 0 1 0 2.4l-11 7.2A1.4 1.4 0 0 1 7 19.2V4.8Z" fill={color} /></Svg>;
  }

  if (name === 'pause') {
    return <Svg width={size} height={size} viewBox="0 0 24 24"><Rect x="5" y="4" width="5" height="16" rx="1.5" fill={color} /><Rect x="14" y="4" width="5" height="16" rx="1.5" fill={color} /></Svg>;
  }

  if (name === 'next') {
    return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M4 5.4a1.2 1.2 0 0 1 1.8-1l9.2 6.6a1.2 1.2 0 0 1 0 2L5.8 19.6a1.2 1.2 0 0 1-1.8-1V5.4Z" fill={color} /><Rect x="18" y="4" width="2.5" height="16" rx="1.2" fill={color} /></Svg>;
  }

  if (name === 'heart') {
    return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M20.8 4.7a5.4 5.4 0 0 0-7.6 0L12 5.9l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6l1.2 1.2L12 21l7.6-7.5 1.2-1.2a5.4 5.4 0 0 0 0-7.6Z" fill={color} /></Svg>;
  }

  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="m8 5 7 7-7 7" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}
