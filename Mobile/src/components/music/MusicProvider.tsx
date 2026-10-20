import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';

import { getAudioSource, getVisitorId, recordSongView, type Song } from '@/lib/api';
import { recordRecentSong } from '@/lib/recent-history';

type MusicContextValue = {
  track: Song | null;
  queue: Song[];
  isPlaying: boolean;
  isBuffering: boolean;
  currentTime: number;
  duration: number;
  error: string;
  playSong: (song: Song, songs?: Song[]) => Promise<void>;
  togglePlay: () => void;
  next: () => void;
  previous: () => void;
  seekTo: (seconds: number) => void;
};

const MusicContext = createContext<MusicContextValue | null>(null);

export function MusicProvider({ children }: PropsWithChildren) {
  const player = useAudioPlayer(null, { updateInterval: 500 });
  const status = useAudioPlayerStatus(player);
  const [track, setTrack] = useState<Song | null>(null);
  const [queue, setQueue] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'doNotMix',
    }).catch(() => undefined);
  }, []);

  const loadSong = useCallback(async (song: Song, nextQueue: Song[], index: number) => {
    setError('');
    setTrack(song);
    setQueue(nextQueue);
    setCurrentIndex(index);
    try {
      const source = await getAudioSource(song);
      player.replace(source);
      player.play();
      void recordRecentSong(song).catch(() => undefined);
      void getVisitorId()
        .then((visitorId) => recordSongView(song.slug || song.id, visitorId))
        .catch(() => undefined);
    } catch {
      setError('Bài hát chưa có luồng phát hoặc máy chủ không thể tải âm thanh.');
      player.pause();
    }
  }, [player]);

  const playSong = useCallback(async (song: Song, songs: Song[] = [song]) => {
    const nextQueue = songs.length > 0 ? songs : [song];
    const index = Math.max(0, nextQueue.findIndex((item) => item.id === song.id));
    await loadSong(song, nextQueue, index);
  }, [loadSong]);

  const togglePlay = useCallback(() => {
    if (!track) {
      return;
    }
    if (status.playing) {
      player.pause();
    } else {
      player.play();
    }
  }, [player, status.playing, track]);

  const playAt = useCallback((index: number) => {
    const song = queue[index];
    if (song) {
      void loadSong(song, queue, index);
    }
  }, [loadSong, queue]);

  const next = useCallback(() => {
    if (queue.length > 0) {
      playAt((currentIndex + 1) % queue.length);
    }
  }, [currentIndex, playAt, queue.length]);

  const previous = useCallback(() => {
    if (status.currentTime > 3) {
      void player.seekTo(0);
      return;
    }
    if (queue.length > 0) {
      playAt((currentIndex - 1 + queue.length) % queue.length);
    }
  }, [currentIndex, playAt, player, queue.length, status.currentTime]);

  const seekTo = useCallback((seconds: number) => {
    void player.seekTo(Math.max(0, Math.min(seconds, status.duration || seconds)));
  }, [player, status.duration]);

  const value = useMemo<MusicContextValue>(() => ({
    track,
    queue,
    isPlaying: status.playing,
    isBuffering: status.isBuffering,
    currentTime: status.currentTime,
    duration: status.duration,
    error: error || status.error || '',
    playSong,
    togglePlay,
    next,
    previous,
    seekTo,
  }), [error, next, playSong, previous, queue, seekTo, status, togglePlay, track]);

  return <MusicContext.Provider value={value}>{children}</MusicContext.Provider>;
}

export function useMusic(): MusicContextValue {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error('useMusic must be used inside MusicProvider');
  }
  return context;
}
