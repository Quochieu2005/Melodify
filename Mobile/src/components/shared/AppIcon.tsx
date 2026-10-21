import Svg, { Circle, Path, Rect } from 'react-native-svg';

type IconName =
  | 'home'
  | 'waveform'
  | 'for-you'
  | 'user'
  | 'library'
  | 'search'
  | 'music'
  | 'play'
  | 'pause'
  | 'next'
  | 'chevron'
  | 'heart'
  | 'crown'
  | 'logout'
  | 'repeat'
  | 'repeat-one'
  | 'shuffle'
  | 'previous'
  | 'chevron-down'
  | 'disc'
  | 'menu'
  | 'queue'
  | 'sparkles'
  | 'trash'
  | 'plus'
  | 'check'
  | 'close'
  | 'pencil'
  | 'share'
  | 'bell'
  | 'download'
  | 'playlist-add'
  | 'equalizer'
  | 'comment'
  | 'facebook'
  | 'settings'
  | 'scan'
  | 'history'
  | 'calendar'
  | 'upload'
  | 'copy'
  | 'sort';

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

  if (name === 'crown') {
    return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="m3 6 4.5 4L12 4l4.5 6L21 6l-1.5 12h-15L3 6Zm3.2 10h11.6l.4-3.2-2.6 2.2L12 9.8l-3.6 5.2-2.6-2.2.4 3.2Z" fill={color} /></Svg>;
  }

  if (name === 'logout') {
    return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></Svg>;
  }

  if (name === 'repeat') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="m17 1 4 4-4 4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M21 13v2a4 4 0 0 1-4 4H3" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  if (name === 'repeat-one') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="m17 1 4 4-4 4" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M21 13v2a4 4 0 0 1-4 4H3" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M11.5 10.5 13 9.5v5.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  if (name === 'shuffle') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M16 3h5v5M4 20l17-17M21 16v5h-5M15 15l6 6M4 4l5 5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  if (name === 'previous') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M20 18.6a1.2 1.2 0 0 1-1.8 1l-9.2-6.6a1.2 1.2 0 0 1 0-2l9.2-6.6a1.2 1.2 0 0 1 1.8 1v13.2Z" fill={color} />
        <Rect x="3.5" y="4" width="2.5" height="16" rx="1.2" fill={color} />
      </Svg>
    );
  }

  if (name === 'chevron-down') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="m6 9 6 6 6-6" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  if (name === 'disc') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
        <Circle cx="12" cy="12" r="4" stroke={color} strokeWidth="2" />
        <Circle cx="12" cy="12" r="1.5" fill={color} />
      </Svg>
    );
  }

  if (name === 'menu') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M4 6h16M4 12h16M4 18h16" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      </Svg>
    );
  }

  if (name === 'queue') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M3 6h18M3 12h12M3 18h12M17 13.5l5 3-5 3v-6Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  if (name === 'trash') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  if (name === 'plus') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      </Svg>
    );
  }

  if (name === 'check') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="m5 13 4 4L19 7" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  if (name === 'sparkles') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      </Svg>
    );
  }

  if (name === 'close') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M18 6 6 18M6 6l12 12" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      </Svg>
    );
  }

  if (name === 'pencil') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  if (name === 'share') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  if (name === 'bell') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  if (name === 'download') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  if (name === 'playlist-add') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Rect x="3" y="3" width="18" height="18" rx="3.5" stroke={color} strokeWidth="2" />
        <Path d="M12 8v8M8 12h8" stroke={color} strokeWidth="2" strokeLinecap="round" />
      </Svg>
    );
  }

  if (name === 'equalizer') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Rect x="3" y="7" width="2.5" height="10" rx="1.25" fill={color} />
        <Rect x="8.5" y="4" width="2.5" height="16" rx="1.25" fill={color} />
        <Rect x="14" y="9" width="2.5" height="8" rx="1.25" fill={color} />
      </Svg>
    );
  }

  if (name === 'comment') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  if (name === 'facebook') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle cx="12" cy="12" r="11" fill={color === '#FFFFFF' ? '#1877F2' : color} />
        <Path d="M16 12.5h-2.5V20h-3v-7.5H8.5V9.8h2V8.2c0-2.4 1.4-3.7 3.6-3.7 1 0 2 .1 2.2.1v2.5h-1.3c-1.1 0-1.5.7-1.5 1.5v1.2h2.8l-.3 2.7Z" fill="#FFFFFF" />
      </Svg>
    );
  }

  if (name === 'settings') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth="2" />
        <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  if (name === 'scan') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M7 3H5a2 2 0 0 0-2 2v2M17 3h2a2 2 0 0 1 2 2v2M7 21H5a2 2 0 0 1-2-2v-2M17 21h2a2 2 0 0 0 2-2v-2" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M7 12h10" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      </Svg>
    );
  }

  if (name === 'history') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" />
        <Path d="M12 7v5l3.5 2" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  if (name === 'calendar') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Rect x="3" y="4" width="18" height="18" rx="3.5" stroke={color} strokeWidth="2" />
        <Path d="M16 2v4M8 2v4M3 10h18" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <Circle cx="12" cy="15" r="1.5" fill={color} />
      </Svg>
    );
  }

  if (name === 'upload') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  if (name === 'copy') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Rect x="8" y="8" width="13" height="13" rx="2.5" stroke={color} strokeWidth="2" />
        <Path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M12 14.5h5M14.5 12l2.5 2.5-2.5 2.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  if (name === 'sort') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M4 6h16M4 12h11M4 18h7" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
        <Path d="M18 14v7M15.5 18.5 18 21l2.5-2.5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="m8 5 7 7-7 7" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}
