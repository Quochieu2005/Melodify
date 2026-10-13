'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import type { Song } from '@/lib/api';

const PLAYER_STORAGE_KEY = 'melodify_player_state';

export type PlayerTrack = {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  durationSeconds: number | null;
  audioUrl: string | null;
  isHot: boolean;
  previewLimitSeconds: number | null;
};

type PlayerContextValue = {
  track: PlayerTrack | null;
  isPlaying: boolean;
  elapsed: number;
  duration: number;
  playSong: (song: Song, queue?: Song[]) => void;
  togglePlay: () => void;
  playPrevious: () => void;
  playNext: () => void;
  seek: (seconds: number) => void;
};

type PersistedPlayerState = {
  track: PlayerTrack;
  queue: PlayerTrack[];
  currentIndex: number;
  elapsed: number;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

function persistPlayerState(track: PlayerTrack, queue: PlayerTrack[], currentIndex: number, elapsed: number) {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify({
    track,
    queue: queue.length > 0 ? queue : [track],
    currentIndex,
    elapsed: Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0,
  } satisfies PersistedPlayerState));
}

function toPlayerTrack(song: Song): PlayerTrack {
  const isHot = Number(song.is_hot ?? 0) === 1;
  const previewLimitSeconds = isHot ? (song.preview_limit_seconds ?? 30) : null;

  return {
    id: song.id,
    title: song.title,
    artist: song.artists?.map((artist) => artist.name).filter(Boolean).join(', ') || song.artist?.name || 'Nghệ sĩ chưa cập nhật',
    coverUrl: song.cover_url || '/topics/genre/vpop_600.png',
    durationSeconds: song.duration_seconds === null || song.duration_seconds === undefined
      ? previewLimitSeconds
      : previewLimitSeconds === null ? song.duration_seconds : Math.min(song.duration_seconds, previewLimitSeconds),
    audioUrl: song.audio_url || song.stream_url || song.preview_url || null,
    isHot,
    previewLimitSeconds,
  };
}

function isPlayerTrack(value: unknown): value is PlayerTrack {
  if (!value || typeof value !== 'object') return false;

  const track = value as Partial<PlayerTrack>;
  return typeof track.id === 'string'
    && typeof track.title === 'string'
    && typeof track.artist === 'string'
    && typeof track.coverUrl === 'string'
    && (typeof track.durationSeconds === 'number' || track.durationSeconds === null)
    && (typeof track.audioUrl === 'string' || track.audioUrl === null)
    && typeof track.isHot === 'boolean'
    && (typeof track.previewLimitSeconds === 'number' || track.previewLimitSeconds === null);
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const trackRef = useRef<PlayerTrack | null>(null);
  const queueRef = useRef<PlayerTrack[]>([]);
  const currentIndexRef = useRef(0);
  const playNextRef = useRef<() => void>(() => undefined);
  const restoredElapsedRef = useRef(0);
  const [track, setTrack] = useState<PlayerTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);

  const startTrack = useCallback((nextTrack: PlayerTrack) => {
    trackRef.current = nextTrack;
    restoredElapsedRef.current = 0;
    setTrack(nextTrack);
    setElapsed(0);
    setDuration(nextTrack.durationSeconds ?? 0);

    persistPlayerState(nextTrack, queueRef.current, currentIndexRef.current, 0);

    const audio = audioRef.current;
    if (!audio || !nextTrack.audioUrl) {
      setIsPlaying(false);
      return;
    }

    audio.pause();
    audio.src = nextTrack.audioUrl;
    audio.load();
    void audio.play()
      .then(() => setIsPlaying(true))
      .catch(() => setIsPlaying(false));
  }, []);

  const playAt = useCallback((index: number) => {
    const nextTrack = queueRef.current[index];
    if (!nextTrack) return;

    currentIndexRef.current = index;
    startTrack(nextTrack);
  }, [startTrack]);

  const playNext = useCallback(() => {
    const nextIndex = currentIndexRef.current + 1;
    if (nextIndex < queueRef.current.length) playAt(nextIndex);
  }, [playAt]);

  const playPrevious = useCallback(() => {
    const previousIndex = currentIndexRef.current - 1;
    if (previousIndex >= 0) playAt(previousIndex);
  }, [playAt]);

  useEffect(() => {
    playNextRef.current = playNext;
    const audio = new Audio();
    audio.preload = 'metadata';
    audioRef.current = audio;

    const persistCurrentPosition = () => {
      const currentTrack = trackRef.current;
      if (currentTrack) {
        persistPlayerState(currentTrack, queueRef.current, currentIndexRef.current, audio.currentTime);
      }
    };
    const handleTimeUpdate = () => {
      setElapsed(Math.floor(audio.currentTime));
      persistCurrentPosition();
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
      if (currentIndexRef.current + 1 < queueRef.current.length) playNextRef.current();
      else setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('timeupdate', handleLimitedPlayback);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('seeking', handleSeeking);
    audio.addEventListener('ended', handleEnded);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') persistCurrentPosition();
    };

    window.addEventListener('pagehide', persistCurrentPosition);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    if (typeof window !== 'undefined') {
      try {
        const savedState = JSON.parse(window.localStorage.getItem(PLAYER_STORAGE_KEY) || 'null') as Partial<PersistedPlayerState> | null;
        const savedTrack = savedState?.track;
        const savedQueue = Array.isArray(savedState?.queue) ? savedState.queue.filter(isPlayerTrack) : [];

        if (isPlayerTrack(savedTrack)) {
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
      } catch {
        window.localStorage.removeItem(PLAYER_STORAGE_KEY);
      }
    }

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('timeupdate', handleLimitedPlayback);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('seeking', handleSeeking);
      audio.removeEventListener('ended', handleEnded);
      window.removeEventListener('pagehide', persistCurrentPosition);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      audioRef.current = null;
    };
  }, [playNext]);

  const playSong = useCallback((song: Song, queue: Song[] = [song]) => {
    const nextQueue = queue.length > 0 ? queue.map(toPlayerTrack) : [toPlayerTrack(song)];
    const index = Math.max(0, nextQueue.findIndex((item) => item.id === song.id));

    queueRef.current = nextQueue;
    currentIndexRef.current = index;
    startTrack(nextQueue[index]);
  }, [startTrack]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !track?.audioUrl) return;

    if (audio.paused) {
      if (track.previewLimitSeconds !== null && audio.currentTime >= track.previewLimitSeconds) {
        audio.currentTime = 0;
        setElapsed(0);
        persistPlayerState(track, queueRef.current, currentIndexRef.current, 0);
      }
      void audio.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }, [track]);

  const seek = useCallback((seconds: number) => {
    if (!audioRef.current || !track) return;

    const limit = track.previewLimitSeconds ?? duration;
    const nextTime = Math.min(Math.max(0, seconds), limit);
    audioRef.current.currentTime = nextTime;
    setElapsed(nextTime);
    persistPlayerState(track, queueRef.current, currentIndexRef.current, nextTime);
  }, [duration, track]);

  const value = useMemo(() => ({
    track,
    isPlaying,
    elapsed,
    duration,
    playSong,
    togglePlay,
    playPrevious,
    playNext,
    seek,
  }), [duration, elapsed, isPlaying, playNext, playPrevious, playSong, seek, togglePlay, track]);

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) throw new Error('usePlayer phải được dùng bên trong PlayerProvider.');
  return context;
}
