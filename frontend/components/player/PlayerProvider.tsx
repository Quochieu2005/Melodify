'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import type { Song } from '@/lib/api';

export type PlayerTrack = {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  durationSeconds: number | null;
  audioUrl: string | null;
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

const PlayerContext = createContext<PlayerContextValue | null>(null);

function toPlayerTrack(song: Song): PlayerTrack {
  return {
    id: song.id,
    title: song.title,
    artist: song.artists?.map((artist) => artist.name).filter(Boolean).join(', ') || song.artist?.name || 'Nghệ sĩ chưa cập nhật',
    coverUrl: song.cover_url || '/topics/genre/vpop_600.png',
    durationSeconds: song.duration_seconds,
    audioUrl: song.audio_url || song.stream_url || song.preview_url || null,
  };
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const queueRef = useRef<PlayerTrack[]>([]);
  const currentIndexRef = useRef(0);
  const playNextRef = useRef<() => void>(() => undefined);
  const [track, setTrack] = useState<PlayerTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);

  const startTrack = useCallback((nextTrack: PlayerTrack) => {
    setTrack(nextTrack);
    setElapsed(0);
    setDuration(nextTrack.durationSeconds ?? 0);

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

    const handleTimeUpdate = () => setElapsed(Math.floor(audio.currentTime));
    const handleLoadedMetadata = () => {
      if (Number.isFinite(audio.duration)) setDuration(Math.floor(audio.duration));
    };
    const handleEnded = () => {
      if (currentIndexRef.current + 1 < queueRef.current.length) playNextRef.current();
      else setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
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

    audioRef.current.currentTime = seconds;
    setElapsed(seconds);
  }, [track]);

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
