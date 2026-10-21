import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Alert } from 'react-native';

import { getAudioSource, getSavedAuthUser, getSong, getVisitorId, recordSongView, type Lyric, type Song, type SongAudioQuality } from '@/lib/api';
import { findActiveLyricIndex, parseLrcLyrics, type ParsedLyricLine } from '@/lib/lyrics';
import { recordRecentSong } from '@/lib/recent-history';

export type RepeatMode = 'off' | 'all' | 'one';

type MusicContextValue = {
  track: Song | null;
  queue: Song[];
  currentIndex: number;
  isPlaying: boolean;
  isBuffering: boolean;
  currentTime: number;
  duration: number;
  error: string;
  qualityOptions: SongAudioQuality[];
  selectedQualityId: string | null;
  setQuality: (qualityId: string) => Promise<boolean>;
  repeatMode: RepeatMode;
  isShuffle: boolean;
  parsedLyrics: ParsedLyricLine[];
  activeLyricIndex: number;
  playSong: (song: Song, songs?: Song[]) => Promise<void>;
  playAt: (index: number) => void;
  addToQueue: (song: Song) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  togglePlay: () => void;
  next: () => void;
  previous: () => void;
  seekTo: (seconds: number) => void;
  toggleRepeat: () => void;
  toggleShuffle: () => void;
};

const MusicContext = createContext<MusicContextValue | null>(null);

export function MusicProvider({ children }: PropsWithChildren) {
  const player = useAudioPlayer(null, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const [track, setTrack] = useState<Song | null>(null);
  const [queue, setQueue] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState('');
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('all');
  const [isShuffle, setIsShuffle] = useState(false);
  const [selectedQualityId, setSelectedQualityId] = useState<string | null>(null);

  const repeatModeRef = useRef(repeatMode);
  const nextRef = useRef<() => void>(() => {});

  useEffect(() => {
    repeatModeRef.current = repeatMode;
  }, [repeatMode]);

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'doNotMix',
    }).catch(() => undefined);
  }, []);

  const loadSong = useCallback(
    async (song: Song, nextQueue: Song[], index: number) => {
      setError('');
      setTrack(song);
      setQueue(nextQueue);
      setCurrentIndex(index);

      try {
        const savedUser = await getSavedAuthUser();
        const isPremium = Number(savedUser?.is_premium ?? 0) === 1;
        const playableQualities = song.audio_qualities?.filter((quality) => quality.available !== false && Boolean(quality.audio_url)) ?? [];
        const defaultQuality = playableQualities.find((quality) => !quality.premium_only)
          ?? (isPremium ? playableQualities[0] : undefined);
        setSelectedQualityId(defaultQuality?.quality_id ?? null);
        const source = await getAudioSource(song, defaultQuality?.quality_id);
        player.replace(source);
        player.play();
        void recordRecentSong(song).catch(() => undefined);
        void getVisitorId()
          .then((visitorId) => recordSongView(song.slug || song.id, visitorId))
          .catch(() => undefined);

        // Fetch full lyrics in background if not already present
        if (!song.lyrics?.length) {
          void getSong(song.slug || song.id)
            .then((res) => {
              if (res.data?.lyrics?.length) {
                setTrack((current) =>
                  current && (current.id === song.id || current.slug === song.slug)
                    ? { ...current, lyrics: res.data.lyrics }
                    : current
                );
              }
            })
            .catch(() => undefined);
        }
      } catch {
        setError('Bài hát chưa có luồng phát hoặc máy chủ không thể tải âm thanh.');
        player.pause();
      }
    },
    [player]
  );

  const playSong = useCallback(
    async (song: Song, songs: Song[] = [song]) => {
      const nextQueue = songs.length > 0 ? songs : [song];
      const index = Math.max(0, nextQueue.findIndex((item) => item.id === song.id));
      await loadSong(song, nextQueue, index);
    },
    [loadSong]
  );

  const setQuality = useCallback(async (qualityId: string) => {
    if (!track || selectedQualityId === qualityId) return true;
    const quality = track.audio_qualities?.find((item) => item.quality_id === qualityId);
    if (!quality) return false;

    if (quality.available === false || !quality.audio_url) {
      Alert.alert('Chất lượng chưa khả dụng', 'NCT có thông tin chất lượng VIP nhưng chưa trả luồng phát/tải cho yêu cầu này.');
      return false;
    }

    try {
      if (track.premium_only || quality.premium_only) {
        const user = await getSavedAuthUser();
        if (Number(user?.is_premium ?? 0) !== 1) {
          Alert.alert(
            'Chất lượng VIP',
            user ? 'Bạn cần mua hoặc gia hạn gói VIP để nghe/tải chất lượng này.' : 'Đăng nhập và mua gói VIP để nghe/tải chất lượng này.',
          );
          return false;
        }
      }

      const wasPlaying = status.playing;
      const position = status.currentTime;
      const source = await getAudioSource(track, qualityId);
      player.pause();
      player.replace(source);
      setSelectedQualityId(qualityId);
      if (position > 0) void player.seekTo(position);
      if (wasPlaying) player.play();
      setError('');
      return true;
    } catch {
      setError('Không thể chuyển chất lượng phát lúc này. Vui lòng thử lại.');
      return false;
    }
  }, [player, selectedQualityId, status.currentTime, status.playing, track]);

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

  const playAt = useCallback(
    (index: number) => {
      const song = queue[index];
      if (song) {
        void loadSong(song, queue, index);
      }
    },
    [loadSong, queue]
  );

  const addToQueue = useCallback((song: Song) => {
    setQueue((prev) => {
      if (prev.some((s) => s.id === song.id || (s.slug && s.slug === song.slug))) {
        return prev;
      }
      return [...prev, song];
    });
  }, []);

  const removeFromQueue = useCallback((indexToRemove: number) => {
    setQueue((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, idx) => idx !== indexToRemove);
    });
    setCurrentIndex((prevIndex) => {
      if (indexToRemove < prevIndex) {
        return Math.max(0, prevIndex - 1);
      }
      return prevIndex;
    });
  }, []);

  const clearQueue = useCallback(() => {
    if (track) {
      setQueue([track]);
      setCurrentIndex(0);
    }
  }, [track]);

  const next = useCallback(() => {
    if (queue.length === 0) return;

    if (isShuffle && queue.length > 1) {
      let randomIndex = Math.floor(Math.random() * queue.length);
      while (randomIndex === currentIndex) {
        randomIndex = Math.floor(Math.random() * queue.length);
      }
      playAt(randomIndex);
      return;
    }

    if (repeatModeRef.current === 'off' && currentIndex >= queue.length - 1) {
      player.pause();
      void player.seekTo(0);
      return;
    }

    playAt((currentIndex + 1) % queue.length);
  }, [currentIndex, isShuffle, playAt, player, queue.length]);

  useEffect(() => {
    nextRef.current = next;
  }, [next]);

  const previous = useCallback(() => {
    if (status.currentTime > 3) {
      void player.seekTo(0);
      return;
    }
    if (queue.length > 0) {
      playAt((currentIndex - 1 + queue.length) % queue.length);
    }
  }, [currentIndex, playAt, player, queue.length, status.currentTime]);

  const seekTo = useCallback(
    (seconds: number) => {
      void player.seekTo(Math.max(0, Math.min(seconds, status.duration || seconds)));
    },
    [player, status.duration]
  );

  const toggleRepeat = useCallback(() => {
    setRepeatMode((current) => {
      if (current === 'all') return 'one';
      if (current === 'one') return 'off';
      return 'all';
    });
  }, []);

  const toggleShuffle = useCallback(() => {
    setIsShuffle((current) => !current);
  }, []);

  // Handle external playbackStatusUpdate event from native audio player
  useEffect(() => {
    const sub = player.addListener('playbackStatusUpdate', (audioStatus) => {
      if (audioStatus.didJustFinish) {
        if (repeatModeRef.current === 'one') {
          void player.seekTo(0);
          player.play();
        } else {
          nextRef.current();
        }
      }
    });

    return () => {
      sub.remove();
    };
  }, [player]);

  // Parse lyrics from track
  const parsedLyrics = useMemo<ParsedLyricLine[]>(() => {
    const lyricsList: Lyric[] = track?.lyrics ?? [];
    if (!lyricsList.length) return [];

    // Find first synced lyric
    const synced = lyricsList.find((l) => l.is_synced && l.synced_lyrics);
    if (synced?.synced_lyrics) {
      return parseLrcLyrics(synced.synced_lyrics);
    }

    // Fallback: check content for LRC formatting
    const lrcContent = lyricsList.find((l) => l.content && l.content.includes('[0'));
    if (lrcContent?.content) {
      return parseLrcLyrics(lrcContent.content);
    }

    return [];
  }, [track?.lyrics]);

  const activeLyricIndex = useMemo(
    () => findActiveLyricIndex(parsedLyrics, status.currentTime),
    [parsedLyrics, status.currentTime]
  );

  const value = useMemo<MusicContextValue>(
    () => ({
      track,
      queue,
      currentIndex,
      isPlaying: status.playing,
      isBuffering: status.isBuffering,
      currentTime: status.currentTime,
      duration: status.duration,
      error: error || status.error || '',
      qualityOptions: track?.audio_qualities ?? [],
      selectedQualityId,
      setQuality,
      repeatMode,
      isShuffle,
      parsedLyrics,
      activeLyricIndex,
      playSong,
      playAt,
      addToQueue,
      removeFromQueue,
      clearQueue,
      togglePlay,
      next,
      previous,
      seekTo,
      toggleRepeat,
      toggleShuffle,
    }),
    [
      activeLyricIndex,
      addToQueue,
      clearQueue,
      currentIndex,
      error,
      isShuffle,
      next,
      parsedLyrics,
      playAt,
      playSong,
      previous,
      queue,
      removeFromQueue,
      repeatMode,
      seekTo,
      status,
      selectedQualityId,
      setQuality,
      togglePlay,
      toggleRepeat,
      toggleShuffle,
      track,
    ]
  );

  return <MusicContext.Provider value={value}>{children}</MusicContext.Provider>;
}

export function useMusic(): MusicContextValue {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error('useMusic must be used inside MusicProvider');
  }
  return context;
}
