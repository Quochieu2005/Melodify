'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { AUTH_TOKEN_STORAGE_KEY, recordSongView, type Song, type SongArtistCredit } from '@/lib/api';
import { recordRecentItem, songPath } from '@/lib/recent-history';
import { useLoginModal } from '@/components/auth/LoginModalProvider';

const PLAYER_SESSION_KEY = 'melodify_player_state';
const PLAYER_SYNC_CHANNEL = 'melodify_player_sync';

export type PlayerTrack = {
  id: string;
  slug?: string | null;
  title: string;
  artist: string;
  artists?: SongArtistCredit[];
  coverUrl: string;
  durationSeconds: number | null;
  audioUrl: string | null;
  isHot: boolean;
  premiumOnly: boolean;
  previewLimitSeconds: number | null;
};

type PlayerContextValue = {
  track: PlayerTrack | null;
  isPlaying: boolean;
  isLoading: boolean;
  queue: PlayerTrack[];
  shuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';
  volume: number;
  elapsed: number;
  duration: number;
  notice: string | null;
  playSong: (song: Song, queue?: Song[]) => void;
  togglePlay: () => void;
  playPrevious: () => void;
  playNext: () => void;
  seek: (seconds: number) => void;
  playAt: (index: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  setVolume: (volume: number) => void;
};

type PersistedPlayerState = {
  track: PlayerTrack;
  queue: PlayerTrack[];
  currentIndex: number;
  elapsed: number;
  isPlaying: boolean;
};

type PlayerSyncMessage =
  | { type: 'request-state'; source: string }
  | { type: 'state'; source: string; state: PersistedPlayerState; playbackIntent?: 'play' | 'pause' };

const PlayerContext = createContext<PlayerContextValue | null>(null);

function persistPlayerState(track: PlayerTrack, queue: PlayerTrack[], currentIndex: number, elapsed: number, isPlaying: boolean): PersistedPlayerState | null {
  if (typeof window === 'undefined') return null;

  const state = {
    track,
    queue: queue.length > 0 ? queue : [track],
    currentIndex,
    elapsed: Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0,
    isPlaying,
  } satisfies PersistedPlayerState;

  window.sessionStorage.setItem(PLAYER_SESSION_KEY, JSON.stringify(state));
  return state;
}

function audioUrlWithAccessToken(audioUrl: string | null, premiumOnly: boolean, isPremium: boolean): string | null {
  if (!audioUrl || !premiumOnly || !isPremium || typeof window === 'undefined') return audioUrl;

  const token = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  if (!token) return audioUrl;

  const separator = audioUrl.includes('?') ? '&' : '?';
  return `${audioUrl}${separator}access_token=${encodeURIComponent(token)}`;
}

function toPlayerTrack(song: Song, isPremium: boolean): PlayerTrack {
  const isHot = Number(song.is_hot ?? 0) === 1;
  const premiumOnly = Boolean(song.premium_only);
  const previewLimitSeconds = premiumOnly && isPremium
    ? null
    : isHot || premiumOnly ? (song.preview_limit_seconds ?? 30) : null;
  const rawAudioUrl = premiumOnly && !isPremium
    ? song.preview_url || null
    : song.audio_url || song.stream_url || song.preview_url || null;
  const audioUrl = audioUrlWithAccessToken(rawAudioUrl, premiumOnly, isPremium);

  return {
    id: song.id,
    slug: song.slug,
    title: song.title,
    artist: song.artists?.map((artist) => artist.name).filter(Boolean).join(', ') || song.artist?.name || 'Nghệ sĩ chưa cập nhật',
    artists: song.artists?.length ? song.artists : song.artist ? [song.artist] : [],
    coverUrl: song.cover_url || '/images/cover-placeholder.svg',
    durationSeconds: song.duration_seconds === null || song.duration_seconds === undefined
      ? previewLimitSeconds
      : previewLimitSeconds === null ? song.duration_seconds : Math.min(song.duration_seconds, previewLimitSeconds),
    audioUrl,
    isHot,
    premiumOnly,
    previewLimitSeconds,
  };
}

function isPlayerTrack(value: unknown): value is PlayerTrack {
  if (!value || typeof value !== 'object') return false;

  const track = value as Partial<PlayerTrack>;
  return typeof track.id === 'string'
    && (typeof track.slug === 'string' || track.slug === null || typeof track.slug === 'undefined')
    && typeof track.title === 'string'
    && typeof track.artist === 'string'
    && (typeof track.artists === 'undefined' || Array.isArray(track.artists))
    && typeof track.coverUrl === 'string'
    && (typeof track.durationSeconds === 'number' || track.durationSeconds === null)
    && (typeof track.audioUrl === 'string' || track.audioUrl === null)
    && typeof track.isHot === 'boolean'
    && typeof track.premiumOnly === 'boolean'
    && (typeof track.previewLimitSeconds === 'number' || track.previewLimitSeconds === null);
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const { user, openLogin } = useLoginModal();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const trackRef = useRef<PlayerTrack | null>(null);
  const queueRef = useRef<PlayerTrack[]>([]);
  const currentIndexRef = useRef(0);
  const playNextRef = useRef<() => void>(() => undefined);
  const restoredElapsedRef = useRef(0);
  const tabIdRef = useRef<string | null>(null);
  const syncChannelRef = useRef<BroadcastChannel | null>(null);
  const isPremiumRef = useRef(false);
  const userRef = useRef(user);
  const openLoginRef = useRef(openLogin);
  const noticeTimerRef = useRef<number | null>(null);
  const shuffleRef = useRef(false);
  const repeatRef = useRef<'off' | 'all' | 'one'>('off');
  const viewRecordedRef = useRef(false);
  const [track, setTrack] = useState<PlayerTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [queue, setQueue] = useState<PlayerTrack[]>([]);
  const [shuffle, setShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [volume, updateVolume] = useState(1);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const isPremium = Number(user?.is_premium ?? 0) === 1;
    isPremiumRef.current = isPremium;
    userRef.current = user;
    openLoginRef.current = openLogin;

    if (!isPremium && trackRef.current?.premiumOnly) {
      audioRef.current?.pause();
      trackRef.current = null;
      queueRef.current = [];
      setQueue([]);
      setIsLoading(false);
      setTrack(null);
      setElapsed(0);
      setDuration(0);
      setIsPlaying(false);
    }
  }, [openLogin, user]);

  const showNotice = useCallback((message: string) => {
    setNotice(message);
    if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => setNotice(null), 4000);
  }, []);

  const broadcastState = useCallback((state: PersistedPlayerState | null, playbackIntent?: 'play' | 'pause') => {
    const source = tabIdRef.current;
    if (!state || !source || !syncChannelRef.current) return;

    syncChannelRef.current.postMessage({
      type: 'state',
      source,
      state,
      playbackIntent,
    } satisfies PlayerSyncMessage);
  }, []);

  const startTrack = useCallback((nextTrack: PlayerTrack) => {
    if (nextTrack.premiumOnly && !isPremiumRef.current && !nextTrack.audioUrl) {
      showNotice(userRef.current ? 'Bài hát này cần tài khoản VIP đã nạp để nghe full.' : 'Hãy đăng nhập và nạp VIP để nghe bài hát này full.');
      if (!userRef.current) openLoginRef.current();
      audioRef.current?.pause();
      trackRef.current = null;
      queueRef.current = [];
      setQueue([]);
      setIsLoading(false);
      setTrack(null);
      setElapsed(0);
      setDuration(0);
      setIsPlaying(false);
      return;
    }

    recordRecentItem({
      id: nextTrack.id,
      category: 'song',
      title: nextTrack.title,
      subtitle: nextTrack.artist,
      imageUrl: nextTrack.coverUrl,
      href: songPath({ id: nextTrack.id, slug: nextTrack.slug ?? null, title: nextTrack.title }),
      publisher: 'Melodify',
      durationSeconds: nextTrack.durationSeconds,
      artists: nextTrack.artists,
    });
    trackRef.current = nextTrack;
    viewRecordedRef.current = false;
    restoredElapsedRef.current = 0;
    setTrack(nextTrack);
    setElapsed(0);
    setDuration(nextTrack.durationSeconds ?? 0);

    broadcastState(persistPlayerState(nextTrack, queueRef.current, currentIndexRef.current, 0, false));

    const audio = audioRef.current;
    audio?.pause();
    if (!audio || !nextTrack.audioUrl) {
      if (audio) {
        audio.removeAttribute('src');
        audio.load();
      }
      setIsPlaying(false);
      setIsLoading(false);
      showNotice('Bài hát chưa có âm thanh. Vui lòng chọn bài khác.');
      return;
    }

    audio.src = nextTrack.audioUrl;
    setIsLoading(true);
    audio.load();
    void audio.play()
      .then(() => {
        if (audioRef.current === audio && trackRef.current?.id === nextTrack.id) {
          setIsPlaying(!audio.paused);
        }
      })
      .catch((error: unknown) => {
        if (audioRef.current === audio && trackRef.current?.id === nextTrack.id) {
          setIsPlaying(!audio.paused);
          // Rapid track changes cancel the previous play promise normally.
          if (!(error instanceof DOMException && error.name === 'AbortError')) {
            setIsLoading(false);
            showNotice('Không thể phát âm thanh. Hãy thử lại hoặc chọn bài khác.');
          }
        }
      });
  }, [broadcastState, showNotice]);

  const playAt = useCallback((index: number) => {
    const nextTrack = queueRef.current[index];
    if (!nextTrack) return;

    currentIndexRef.current = index;
    startTrack(nextTrack);
  }, [startTrack]);

  const playNext = useCallback(() => {
    const length = queueRef.current.length;
    if (shuffleRef.current && length > 1) {
      const offset = 1 + Math.floor(Math.random() * (length - 1));
      playAt((currentIndexRef.current + offset) % length);
      return;
    }
    const nextIndex = currentIndexRef.current + 1;
    if (nextIndex < queueRef.current.length) playAt(nextIndex);
    else if (repeatRef.current === 'all' && length > 0) playAt(0);
  }, [playAt]);

  const playPrevious = useCallback(() => {
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      setElapsed(0);
      return;
    }
    const previousIndex = currentIndexRef.current - 1;
    if (previousIndex >= 0) playAt(previousIndex);
    else if (repeatRef.current === 'all') playAt(queueRef.current.length - 1);
  }, [playAt]);

  useEffect(() => {
    playNextRef.current = playNext;
    const audio = new Audio();
    audio.preload = 'metadata';
    audioRef.current = audio;
    const syncChannel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(PLAYER_SYNC_CHANNEL);
    syncChannelRef.current = syncChannel;
    const tabId = tabIdRef.current || `player-tab-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    tabIdRef.current = tabId;
    let lastBroadcastAt = 0;

    const persistCurrentPosition = () => {
      const currentTrack = trackRef.current;
      if (currentTrack) {
        const state = persistPlayerState(currentTrack, queueRef.current, currentIndexRef.current, audio.currentTime, !audio.paused);
        const now = Date.now();
        if (now - lastBroadcastAt >= 1000) {
          lastBroadcastAt = now;
          broadcastState(state);
        }
      }
    };
    const handleTimeUpdate = () => {
      setElapsed(Math.floor(audio.currentTime));
      persistCurrentPosition();
    };
    const handlePlay = () => {
      setIsPlaying(true);
      const currentTrack = trackRef.current;
      if (currentTrack) {
        broadcastState(
          persistPlayerState(currentTrack, queueRef.current, currentIndexRef.current, audio.currentTime, true),
          'play',
        );
      }
    };
    const handlePlaying = () => {
      setIsLoading(false);
      setIsPlaying(true);
      const currentTrack = trackRef.current;
      if (currentTrack && !viewRecordedRef.current) {
        viewRecordedRef.current = true;
        // Start statistics only after media starts, not in front of the audio request.
        void recordSongView(currentTrack.slug || currentTrack.id, undefined, 'player').catch(() => undefined);
      }
    };
    const handleWaiting = () => { if (!audio.paused) setIsLoading(true); };
    const handlePause = () => { setIsPlaying(false); setIsLoading(false); };
    const handleAudioError = () => {
      setIsPlaying(false);
      setIsLoading(false);
      showNotice('Không tải được âm thanh. Hãy thử lại hoặc chọn bài khác.');
    };
    const handleLoadedMetadata = () => {
      if (Number.isFinite(audio.duration)) {
        const limit = trackRef.current?.previewLimitSeconds;
        const nextDuration = Math.floor(limit === null || limit === undefined ? audio.duration : Math.min(audio.duration, limit));
        setDuration(nextDuration);

        if (restoredElapsedRef.current > 0) {
          const resumeAt = Math.min(restoredElapsedRef.current, nextDuration);
          audio.currentTime = resumeAt;
          setElapsed(Math.floor(resumeAt));
          restoredElapsedRef.current = 0;
          persistCurrentPosition();
        }
      }
    };
    const handleSeeking = () => {
      const limit = trackRef.current?.previewLimitSeconds;
      if (limit !== null && limit !== undefined && audio.currentTime > limit) {
        audio.currentTime = limit;
        persistCurrentPosition();
      }
    };
    const handleLimitedPlayback = () => {
      const limit = trackRef.current?.previewLimitSeconds;
      if (limit === null || limit === undefined || audio.currentTime < limit) return;

      audio.currentTime = limit;
      audio.pause();
      setElapsed(limit);
      setDuration(limit);
      setIsPlaying(false);
      persistCurrentPosition();
    };
    const handleEnded = () => {
      if (repeatRef.current === 'one') {
        audio.currentTime = 0;
        void audio.play().catch(handleAudioError);
      } else if (shuffleRef.current || repeatRef.current === 'all' || currentIndexRef.current + 1 < queueRef.current.length) playNextRef.current();
      else {
        setIsPlaying(false);
        persistCurrentPosition();
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('timeupdate', handleLimitedPlayback);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleAudioError);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('seeking', handleSeeking);
    audio.addEventListener('ended', handleEnded);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') persistCurrentPosition();
    };

    window.addEventListener('pagehide', persistCurrentPosition);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    let cancelled = false;
    const applySyncedState = (savedState: PersistedPlayerState, playbackIntent?: 'play' | 'pause') => {
      const savedTrack = savedState.track;
      const savedQueue = savedState.queue.filter(isPlayerTrack);
      if (!isPlayerTrack(savedTrack)) return;
      if (savedTrack.premiumOnly && !isPremiumRef.current) return;

      const restoredQueue = savedQueue.length > 0 ? savedQueue : [savedTrack];
      const restoredIndex = Math.min(Math.max(0, savedState.currentIndex), restoredQueue.length - 1);
      const restoredTrack = restoredQueue[restoredIndex] || savedTrack;
      const restoreLimit = restoredTrack.previewLimitSeconds ?? restoredTrack.durationSeconds;
      const restoredElapsed = restoreLimit === null || restoreLimit === undefined
        ? Math.max(0, savedState.elapsed)
        : Math.min(Math.max(0, savedState.elapsed), restoreLimit);

      const isSameTrack = trackRef.current?.id === restoredTrack.id;
      if (isSameTrack) {
        if (playbackIntent) audio.pause();
        queueRef.current = restoredQueue;
        setQueue(restoredQueue);
        currentIndexRef.current = restoredIndex;
        trackRef.current = restoredTrack;
        setTrack(restoredTrack);
        setDuration(restoredTrack.durationSeconds ?? 0);
        // Passive position updates must not interrupt playback in this tab.
        if (audio.paused) setElapsed(Math.floor(restoredElapsed));
        setIsPlaying(!audio.paused);
        return;
      }

      audio.pause();
      queueRef.current = restoredQueue;
      setQueue(restoredQueue);
      currentIndexRef.current = restoredIndex;
      trackRef.current = restoredTrack;
      restoredElapsedRef.current = restoredElapsed;
      setTrack(restoredTrack);
      setElapsed(Math.floor(restoredElapsed));
      setDuration(restoredTrack.durationSeconds ?? 0);
      setIsPlaying(false);

      if (restoredTrack.audioUrl) {
        audio.src = restoredTrack.audioUrl;
        audio.load();
      }
    };

    const handleSyncMessage = (event: MessageEvent<PlayerSyncMessage>) => {
      const message = event.data;
      if (!message || message.source === tabId) return;

      if (message.type === 'request-state') {
        const currentTrack = trackRef.current;
        if (!currentTrack || !syncChannel) return;

        const state = persistPlayerState(currentTrack, queueRef.current, currentIndexRef.current, audio.currentTime, !audio.paused);
        if (state) {
          syncChannel.postMessage({
            type: 'state',
            source: tabId,
            state,
          } satisfies PlayerSyncMessage);
        }
        return;
      }

      if (message.type === 'state' && message.state && isPlayerTrack(message.state.track) && Array.isArray(message.state.queue)) {
        applySyncedState(message.state, message.playbackIntent);
        persistPlayerState(message.state.track, message.state.queue, message.state.currentIndex, message.state.elapsed, message.state.isPlaying === true);
      }
    };

    syncChannel?.addEventListener('message', handleSyncMessage);

    const restoreSavedState = () => {
      if (cancelled || typeof window === 'undefined') return;

      try {
        const savedState = JSON.parse(window.sessionStorage.getItem(PLAYER_SESSION_KEY) || 'null') as Partial<PersistedPlayerState> | null;
        const savedTrack = savedState?.track;
        const savedQueue = Array.isArray(savedState?.queue) ? savedState.queue.filter(isPlayerTrack) : [];

        if (isPlayerTrack(savedTrack) && (!savedTrack.premiumOnly || isPremiumRef.current)) {
          const restoredQueue = savedQueue.length > 0 ? savedQueue : [savedTrack];
          const restoredIndex = typeof savedState?.currentIndex === 'number'
            ? Math.min(Math.max(0, savedState.currentIndex), restoredQueue.length - 1)
            : 0;
          const restoredTrack = restoredQueue[restoredIndex] || savedTrack;
          const savedElapsed = typeof savedState?.elapsed === 'number' && Number.isFinite(savedState.elapsed)
            ? Math.max(0, savedState.elapsed)
            : 0;
          const restoreLimit = restoredTrack.previewLimitSeconds ?? restoredTrack.durationSeconds;
          const restoredElapsed = restoreLimit === null || restoreLimit === undefined
            ? savedElapsed
            : Math.min(savedElapsed, restoreLimit);

          queueRef.current = restoredQueue;
          setQueue(restoredQueue);
          currentIndexRef.current = restoredIndex;
          trackRef.current = restoredTrack;
          restoredElapsedRef.current = restoredElapsed;
          setTrack(restoredTrack);
          setElapsed(Math.floor(restoredElapsed));
          setDuration(restoredTrack.durationSeconds ?? 0);

          if (restoredTrack.audioUrl) {
            audio.src = restoredTrack.audioUrl;
            audio.load();
          }
        }

        syncChannel?.postMessage({ type: 'request-state', source: tabId } satisfies PlayerSyncMessage);
      } catch {
        window.sessionStorage.removeItem(PLAYER_SESSION_KEY);
      }
    };

    queueMicrotask(restoreSavedState);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('timeupdate', handleLimitedPlayback);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('error', handleAudioError);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('seeking', handleSeeking);
      audio.removeEventListener('ended', handleEnded);
      window.removeEventListener('pagehide', persistCurrentPosition);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      syncChannel?.removeEventListener('message', handleSyncMessage);
      syncChannel?.close();
      syncChannelRef.current = null;
      cancelled = true;
      audioRef.current = null;
      audio.removeAttribute('src');
      audio.load();
    };
  }, [broadcastState, playNext, showNotice]);

  const playSong = useCallback((song: Song, queue: Song[] = [song]) => {
    const nextQueue = queue.length > 0
      ? queue.map((item) => toPlayerTrack(item, isPremiumRef.current))
      : [toPlayerTrack(song, isPremiumRef.current)];
    const index = Math.max(0, nextQueue.findIndex((item) => item.id === song.id));

    queueRef.current = nextQueue;
    setQueue(nextQueue);
    currentIndexRef.current = index;
    startTrack(nextQueue[index]);
  }, [startTrack]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !track?.audioUrl) {
      if (track?.premiumOnly && !isPremiumRef.current) {
        showNotice(userRef.current ? 'Bài hát này cần tài khoản VIP đã nạp để nghe full.' : 'Hãy đăng nhập và nạp VIP để nghe bài hát này full.');
        if (!userRef.current) openLoginRef.current();
      }
      return;
    }

    if (audio.paused) {
      if (track.previewLimitSeconds !== null && audio.currentTime >= track.previewLimitSeconds) {
        audio.currentTime = 0;
        setElapsed(0);
        broadcastState(persistPlayerState(track, queueRef.current, currentIndexRef.current, 0, false));
      }
      setIsLoading(true);
      void audio.play()
        .then(() => {
          if (audioRef.current === audio && trackRef.current?.id === track.id) {
            setIsPlaying(!audio.paused);
          }
        })
        .catch((error: unknown) => {
          if (audioRef.current === audio && trackRef.current?.id === track.id) {
            setIsPlaying(!audio.paused);
            if (!(error instanceof DOMException && error.name === 'AbortError')) {
              setIsLoading(false);
              showNotice('Không thể phát âm thanh. Hãy thử lại hoặc chọn bài khác.');
            }
          }
        });
    } else {
      audio.pause();
      setIsPlaying(false);
      broadcastState(persistPlayerState(track, queueRef.current, currentIndexRef.current, audio.currentTime, false), 'pause');
    }
  }, [broadcastState, showNotice, track]);

  const seek = useCallback((seconds: number) => {
    if (!audioRef.current || !track || !Number.isFinite(seconds)) return;

    const limit = track.previewLimitSeconds ?? duration;
    const nextTime = Math.min(Math.max(0, seconds), limit);
    if (audioRef.current.readyState === 0) restoredElapsedRef.current = nextTime;
    else audioRef.current.currentTime = nextTime;
    setElapsed(nextTime);
    broadcastState(persistPlayerState(track, queueRef.current, currentIndexRef.current, nextTime, Boolean(audioRef.current && !audioRef.current.paused)));
  }, [broadcastState, duration, track]);

  const toggleShuffle = useCallback(() => {
    shuffleRef.current = !shuffleRef.current;
    setShuffle(shuffleRef.current);
  }, []);

  const cycleRepeat = useCallback(() => {
    repeatRef.current = repeatRef.current === 'off' ? 'all' : repeatRef.current === 'all' ? 'one' : 'off';
    setRepeatMode(repeatRef.current);
  }, []);

  const setVolume = useCallback((nextVolume: number) => {
    if (!Number.isFinite(nextVolume)) return;
    const value = Math.max(0, Math.min(1, nextVolume));
    updateVolume(value);
    if (audioRef.current) audioRef.current.volume = value;
  }, []);

  const value = useMemo(() => ({
    track,
    isPlaying,
    isLoading,
    queue,
    shuffle,
    repeatMode,
    volume,
    elapsed,
    duration,
    notice,
    playSong,
    togglePlay,
    playPrevious,
    playNext,
    seek,
    playAt,
    toggleShuffle,
    cycleRepeat,
    setVolume,
  }), [duration, elapsed, isPlaying, isLoading, queue, shuffle, repeatMode, volume, notice, playNext, playPrevious, playSong, seek, togglePlay, track, playAt, toggleShuffle, cycleRepeat, setVolume]);

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) throw new Error('usePlayer phải được dùng bên trong PlayerProvider.');
  return context;
}
