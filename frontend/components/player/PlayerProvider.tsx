'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

import { AUTH_TOKEN_STORAGE_KEY, getSong, getVisitorId, recordSongView, type Song, type SongArtistCredit, type SongAudioQuality } from '@/lib/api';
import { recordRecentItem, songPath } from '@/lib/recent-history';
import { useLoginModal } from '@/components/auth/LoginModalProvider';
import { VipAccessDialog } from '@/components/player/VipAccessDialog';

const PLAYER_SESSION_KEY = 'melodify_player_state';
const PLAYER_SYNC_CHANNEL = 'melodify_player_sync';

export type PlayerTrack = {
  id: string;
  queueEntryId?: string;
  slug?: string | null;
  title: string;
  artist: string;
  favoriteCount?: number;
  shareCount?: number;
  isFavorite?: boolean;
  artists?: SongArtistCredit[];
  coverUrl: string;
  durationSeconds: number | null;
  audioUrl: string | null;
  downloadUrl?: string | null;
  audioQualities?: SongAudioQuality[];
  selectedQualityId?: string | null;
  qualityLabel?: string | null;
  isHot: boolean;
  premiumOnly: boolean;
  previewLimitSeconds: number | null;
};

type PlayerContextValue = {
  track: PlayerTrack | null;
  isPremium: boolean;
  isPlaying: boolean;
  isLoading: boolean;
  queue: PlayerTrack[];
  currentIndex: number;
  shuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';
  volume: number;
  elapsed: number;
  duration: number;
  notice: string | null;
  requestVipAccess: () => void;
  playSong: (song: Song, queue?: Song[], viewSource?: 'player' | 'for_you') => void;
  refreshTrackMetadata: (song?: Song) => Promise<void>;
  togglePlay: () => void;
  playPrevious: () => void;
  playNext: () => void;
  seek: (seconds: number) => void;
  playAt: (index: number) => void;
  removeFromQueue: (index: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  setVolume: (volume: number) => void;
  setQuality: (qualityId: string) => void;
};

type PersistedPlayerState = {
  track: PlayerTrack;
  queue: PlayerTrack[];
  originalQueue?: PlayerTrack[];
  currentIndex: number;
  elapsed: number;
  isPlaying: boolean;
  shuffle?: boolean;
  repeatMode?: 'off' | 'all' | 'one';
  lastShuffleSignature?: string | null;
};

type PlayerSyncMessage =
  | { type: 'request-state'; source: string }
  | { type: 'state'; source: string; state: PersistedPlayerState; playbackIntent?: 'play' | 'pause' };

const PlayerContext = createContext<PlayerContextValue | null>(null);
const PlayerControlsContext = createContext<Omit<PlayerContextValue, 'elapsed'> | null>(null);

function persistPlayerState(
  track: PlayerTrack,
  queue: PlayerTrack[],
  currentIndex: number,
  elapsed: number,
  isPlaying: boolean,
  originalQueue: PlayerTrack[] = queue,
  shuffle = false,
  repeatMode: 'off' | 'all' | 'one' = 'off',
  lastShuffleSignature: string | null = null,
): PersistedPlayerState | null {
  if (typeof window === 'undefined') return null;

  const state = {
    track,
    queue: queue.length > 0 ? queue : [track],
    originalQueue: originalQueue.length > 0 ? originalQueue : [track],
    currentIndex,
    elapsed: Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0,
    isPlaying,
    shuffle,
    repeatMode,
    lastShuffleSignature,
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
  const audioQualities = song.audio_qualities ?? [];
  const playableQualities = audioQualities.filter((quality) => quality.available !== false && Boolean(quality.audio_url));
  const selectedQuality = playableQualities.find((quality) => !quality.premium_only)
    ?? (isPremium ? playableQualities[0] : null)
    ?? null;
  const vipRequired = premiumOnly || (playableQualities.length > 0 && !playableQualities.some((quality) => !quality.premium_only));
  const previewLimitSeconds = vipRequired && isPremium
    ? null
    : isHot || vipRequired ? (song.preview_limit_seconds ?? 30) : null;
  const rawAudioUrl = vipRequired && !isPremium
    ? song.preview_url || null
    : selectedQuality?.audio_url || song.audio_url || song.stream_url || song.preview_url || null;
  const rawDownloadUrl = selectedQuality?.download_url || song.download_url || null;
  const audioUrl = audioUrlWithAccessToken(rawAudioUrl, selectedQuality?.premium_only ?? premiumOnly, isPremium);
  const downloadUrl = audioUrlWithAccessToken(rawDownloadUrl, selectedQuality?.premium_only ?? premiumOnly, isPremium);

  return {
    id: song.id,
    queueEntryId: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
    slug: song.slug,
    title: song.title,
    artist: song.artists?.map((artist) => artist.name).filter(Boolean).join(', ') || song.artist?.name || 'Nghệ sĩ chưa cập nhật',
    favoriteCount: song.favorite_count ?? song.favorites ?? 0,
    shareCount: song.share_count ?? song.shares ?? 0,
    isFavorite: song.is_favorite ?? false,
    artists: song.artists?.length ? song.artists : song.artist ? [song.artist] : [],
    coverUrl: song.cover_url || '/images/cover-placeholder.svg',
    durationSeconds: song.duration_seconds === null || song.duration_seconds === undefined
      ? previewLimitSeconds
      : previewLimitSeconds === null ? song.duration_seconds : Math.min(song.duration_seconds, previewLimitSeconds),
    audioUrl,
    downloadUrl,
    audioQualities,
    selectedQualityId: selectedQuality?.quality_id ?? null,
    qualityLabel: selectedQuality?.label ?? song.audio_quality ?? null,
    isHot,
    premiumOnly: vipRequired,
    previewLimitSeconds,
  };
}

function queueEntryIndex(queue: PlayerTrack[], entry: PlayerTrack | null, sourceQueue: PlayerTrack[], sourceIndex: number) {
  if (!entry) return -1;
  if (entry.queueEntryId) return queue.findIndex((item) => item.queueEntryId === entry.queueEntryId);

  const occurrence = sourceQueue.slice(0, sourceIndex + 1).filter((item) => item.id === entry.id).length - 1;
  let seen = 0;
  return queue.findIndex((item) => {
    if (item.id !== entry.id) return false;
    return seen++ === Math.max(0, occurrence);
  });
}

function queueOrderSignature(queue: PlayerTrack[]) {
  const occurrences = new Map<string, number>();
  return queue.map((item) => {
    if (item.queueEntryId) return item.queueEntryId;
    const occurrence = occurrences.get(item.id) ?? 0;
    occurrences.set(item.id, occurrence + 1);
    return `${item.id}#${occurrence}`;
  }).join('|');
}

function shuffleUpcoming(queue: PlayerTrack[], currentIndex: number, previousShuffleSignature: string | null) {
  const prefix = queue.slice(0, currentIndex + 1);
  const remaining = queue.slice(currentIndex + 1);
  if (remaining.length < 2) return queue;

  const originalSignature = queueOrderSignature(remaining);
  const isUsefulOrder = (candidate: PlayerTrack[]) => {
    const signature = queueOrderSignature(candidate);
    return signature !== originalSignature && signature !== previousShuffleSignature;
  };

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = [...remaining];
    for (let index = candidate.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [candidate[index], candidate[swapIndex]] = [candidate[swapIndex], candidate[index]];
    }
    if (isUsefulOrder(candidate)) return [...prefix, ...candidate];
  }

  for (let offset = 1; offset < remaining.length; offset += 1) {
    const candidate = [...remaining.slice(offset), ...remaining.slice(0, offset)];
    if (isUsefulOrder(candidate)) return [...prefix, ...candidate];
  }
  for (let left = 0; left < remaining.length - 1; left += 1) {
    for (let right = left + 1; right < remaining.length; right += 1) {
      const candidate = [...remaining];
      [candidate[left], candidate[right]] = [candidate[right], candidate[left]];
      if (isUsefulOrder(candidate)) return [...prefix, ...candidate];
    }
  }

  // With only two remaining tracks there are only two possible orders, so it
  // is impossible to differ from both the normal order and the previous shuffle.
  const fallback = [...remaining];
  [fallback[0], fallback[1]] = [fallback[1], fallback[0]];
  return [...prefix, ...fallback];
}

function removeQueueEntry(queue: PlayerTrack[], removed: PlayerTrack, sourceQueue: PlayerTrack[], sourceIndex: number) {
  if (removed.queueEntryId) return queue.filter((item) => item.queueEntryId !== removed.queueEntryId);

  const occurrence = sourceQueue.slice(0, sourceIndex).filter((item) => item.id === removed.id).length;
  let seen = 0;
  return queue.filter((item) => {
    if (item.id !== removed.id) return true;
    return seen++ !== occurrence;
  });
}

function replaceQueueTrack(queue: PlayerTrack[], nextTrack: PlayerTrack) {
  return queue.map((item) => item.id === nextTrack.id
    ? { ...item, ...nextTrack, queueEntryId: item.queueEntryId ?? nextTrack.queueEntryId }
    : item);
}

function requiresVipForTrack(track: PlayerTrack | null | undefined) {
  if (!track) return false;
  const selectedQuality = track.audioQualities?.find((quality) => quality.quality_id === track.selectedQualityId);
  return track.premiumOnly || Boolean(selectedQuality?.premium_only);
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
  const router = useRouter();
  const { user } = useLoginModal();
  const isPremium = Number(user?.is_premium ?? 0) === 1;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const trackRef = useRef<PlayerTrack | null>(null);
  const queueRef = useRef<PlayerTrack[]>([]);
  const originalQueueRef = useRef<PlayerTrack[]>([]);
  const lastShuffleSignatureRef = useRef<string | null>(null);
  const currentIndexRef = useRef(0);
  const playNextRef = useRef<() => void>(() => undefined);
  const restoredElapsedRef = useRef(0);
  const tabIdRef = useRef<string | null>(null);
  const syncChannelRef = useRef<BroadcastChannel | null>(null);
  const isPremiumRef = useRef(false);
  const noticeTimerRef = useRef<number | null>(null);
  const shuffleRef = useRef(false);
  const repeatRef = useRef<'off' | 'all' | 'one'>('off');
  const viewRecordedRef = useRef(false);
  const viewSourceRef = useRef<'player' | 'for_you'>('player');
  const [track, setTrack] = useState<PlayerTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [queue, setQueue] = useState<PlayerTrack[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [volume, updateVolume] = useState(1);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [vipDialogOpen, setVipDialogOpen] = useState(false);

  const savePlayerState = useCallback((currentTrack: PlayerTrack, currentQueue: PlayerTrack[], index: number, position: number, playing: boolean) => (
    persistPlayerState(currentTrack, currentQueue, index, position, playing, originalQueueRef.current, shuffleRef.current, repeatRef.current, lastShuffleSignatureRef.current)
  ), []);

  useEffect(() => {
    const isPremium = Number(user?.is_premium ?? 0) === 1;
    isPremiumRef.current = isPremium;

    if (!isPremium && requiresVipForTrack(trackRef.current)) {
      audioRef.current?.pause();
      trackRef.current = null;
      queueRef.current = [];
      originalQueueRef.current = [];
      setQueue([]);
      setIsLoading(false);
      setTrack(null);
      setElapsed(0);
      setDuration(0);
      setIsPlaying(false);
      shuffleRef.current = false;
      repeatRef.current = 'off';
      setShuffle(false);
      setRepeatMode('off');
    }
  }, [user]);

  const requestVipAccess = useCallback(() => setVipDialogOpen(true), []);
  const closeVipDialog = useCallback(() => setVipDialogOpen(false), []);
  const upgradeVip = useCallback(() => {
    setVipDialogOpen(false);
    router.push('/mua-vip');
  }, [router]);

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

  const startTrack = useCallback((nextTrack: PlayerTrack, viewSource: 'player' | 'for_you' = 'player') => {
    if (requiresVipForTrack(nextTrack) && !isPremiumRef.current) {
      requestVipAccess();
      audioRef.current?.pause();
      trackRef.current = null;
      queueRef.current = [];
      originalQueueRef.current = [];
      setQueue([]);
      setIsLoading(false);
      setTrack(null);
      setElapsed(0);
      setDuration(0);
      setIsPlaying(false);
      shuffleRef.current = false;
      repeatRef.current = 'off';
      setShuffle(false);
      setRepeatMode('off');
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
    viewSourceRef.current = viewSource;
    restoredElapsedRef.current = 0;
    setTrack(nextTrack);
    setElapsed(0);
    setDuration(nextTrack.durationSeconds ?? 0);

    broadcastState(savePlayerState(nextTrack, queueRef.current, currentIndexRef.current, 0, false));

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
  }, [broadcastState, requestVipAccess, savePlayerState, showNotice]);

  const playAt = useCallback((index: number) => {
    const nextTrack = queueRef.current[index];
    if (!nextTrack) return;

    currentIndexRef.current = index;
    setCurrentIndex(index);
    startTrack(nextTrack);
  }, [startTrack]);

  const removeFromQueue = useCallback((index: number) => {
    const currentTrack = trackRef.current;
    const currentIndex = currentIndexRef.current;
    const currentQueue = queueRef.current;
    const removingCurrentTrack = index === currentIndex;
    if (!currentTrack || index < 0 || index >= currentQueue.length || (removingCurrentTrack && currentQueue.length === 1)) return;

    const removedTrack = currentQueue[index];
    const nextQueue = currentQueue.filter((_, itemIndex) => itemIndex !== index);
    originalQueueRef.current = removeQueueEntry(originalQueueRef.current, removedTrack, currentQueue, index);
    lastShuffleSignatureRef.current = null;
    const nextIndex = removingCurrentTrack
      ? Math.min(currentIndex, nextQueue.length - 1)
      : index < currentIndex ? currentIndex - 1 : currentIndex;
    queueRef.current = nextQueue;
    currentIndexRef.current = nextIndex;
    setQueue(nextQueue);
    setCurrentIndex(nextIndex);
    if (removingCurrentTrack) {
      startTrack(nextQueue[nextIndex]);
      return;
    }
    broadcastState(savePlayerState(
      currentTrack,
      nextQueue,
      nextIndex,
      audioRef.current?.currentTime ?? 0,
      Boolean(audioRef.current && !audioRef.current.paused),
    ));
  }, [broadcastState, savePlayerState, startTrack]);

  const playNext = useCallback(() => {
    const length = queueRef.current.length;
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
        const now = Date.now();
        if (now - lastBroadcastAt >= 1000) {
          lastBroadcastAt = now;
          const state = savePlayerState(currentTrack, queueRef.current, currentIndexRef.current, audio.currentTime, !audio.paused);
          broadcastState(state);
        }
      }
    };
    const handleTimeUpdate = () => {
      setElapsed(audio.currentTime);
      persistCurrentPosition();
    };
    const handlePlay = () => {
      setIsPlaying(true);
      const currentTrack = trackRef.current;
      if (currentTrack) {
        broadcastState(
          savePlayerState(currentTrack, queueRef.current, currentIndexRef.current, audio.currentTime, true),
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
        void recordSongView(currentTrack.slug || currentTrack.id, getVisitorId(), viewSourceRef.current).catch(() => undefined);
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
          setElapsed(resumeAt);
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
      } else if (repeatRef.current === 'all' || currentIndexRef.current + 1 < queueRef.current.length) playNextRef.current();
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
      const savedOriginalQueue = Array.isArray(savedState.originalQueue)
        ? savedState.originalQueue.filter(isPlayerTrack)
        : [];
      originalQueueRef.current = savedOriginalQueue.length > 0 ? savedOriginalQueue : restoredQueue;
      shuffleRef.current = savedState.shuffle === true;
      repeatRef.current = savedState.repeatMode === 'all' || savedState.repeatMode === 'one' ? savedState.repeatMode : 'off';
      setShuffle(shuffleRef.current);
      setRepeatMode(repeatRef.current);
      const restoredIndex = Math.min(Math.max(0, savedState.currentIndex), restoredQueue.length - 1);
      lastShuffleSignatureRef.current = typeof savedState.lastShuffleSignature === 'string'
        ? savedState.lastShuffleSignature
        : shuffleRef.current ? queueOrderSignature(restoredQueue.slice(restoredIndex + 1)) : null;
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
        setCurrentIndex(restoredIndex);
        trackRef.current = restoredTrack;
        setTrack(restoredTrack);
        setDuration(restoredTrack.durationSeconds ?? 0);
        // Passive position updates must not interrupt playback in this tab.
        if (audio.paused) setElapsed(restoredElapsed);
        setIsPlaying(!audio.paused);
        return;
      }

      audio.pause();
      queueRef.current = restoredQueue;
      setQueue(restoredQueue);
      currentIndexRef.current = restoredIndex;
      setCurrentIndex(restoredIndex);
      trackRef.current = restoredTrack;
      restoredElapsedRef.current = restoredElapsed;
      setTrack(restoredTrack);
      setElapsed(restoredElapsed);
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

        const state = savePlayerState(currentTrack, queueRef.current, currentIndexRef.current, audio.currentTime, !audio.paused);
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
        savePlayerState(message.state.track, message.state.queue, message.state.currentIndex, message.state.elapsed, message.state.isPlaying === true);
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
          const savedOriginalQueue = Array.isArray(savedState?.originalQueue)
            ? savedState.originalQueue.filter(isPlayerTrack)
            : [];
          originalQueueRef.current = savedOriginalQueue.length > 0 ? savedOriginalQueue : restoredQueue;
          shuffleRef.current = savedState?.shuffle === true;
          repeatRef.current = savedState?.repeatMode === 'all' || savedState?.repeatMode === 'one' ? savedState.repeatMode : 'off';
          setShuffle(shuffleRef.current);
          setRepeatMode(repeatRef.current);
          const restoredIndex = typeof savedState?.currentIndex === 'number'
            ? Math.min(Math.max(0, savedState.currentIndex), restoredQueue.length - 1)
            : 0;
          lastShuffleSignatureRef.current = typeof savedState?.lastShuffleSignature === 'string'
            ? savedState.lastShuffleSignature
            : shuffleRef.current ? queueOrderSignature(restoredQueue.slice(restoredIndex + 1)) : null;
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
          setCurrentIndex(restoredIndex);
          trackRef.current = restoredTrack;
          restoredElapsedRef.current = restoredElapsed;
          setTrack(restoredTrack);
          setElapsed(restoredElapsed);
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
  }, [broadcastState, playNext, savePlayerState, showNotice]);

  const playSong = useCallback((song: Song, queue: Song[] = [song], viewSource: 'player' | 'for_you' = 'player') => {
    const nextQueue = queue.length > 0
      ? queue.map((item) => toPlayerTrack(item, isPremiumRef.current))
      : [toPlayerTrack(song, isPremiumRef.current)];
    const index = Math.max(0, nextQueue.findIndex((item) => item.id === song.id));
    originalQueueRef.current = nextQueue;
    lastShuffleSignatureRef.current = null;
    const playbackQueue = shuffleRef.current ? shuffleUpcoming(nextQueue, index, null) : nextQueue;
    if (shuffleRef.current) lastShuffleSignatureRef.current = queueOrderSignature(playbackQueue.slice(index + 1));

    queueRef.current = playbackQueue;
    setQueue(playbackQueue);
    currentIndexRef.current = index;
    setCurrentIndex(index);
    startTrack(playbackQueue[index], viewSource);
  }, [startTrack]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (requiresVipForTrack(track) && !isPremiumRef.current) {
      requestVipAccess();
      return;
    }
    if (!audio || !track?.audioUrl) {
      return;
    }

    if (audio.paused) {
      if (track.previewLimitSeconds !== null && audio.currentTime >= track.previewLimitSeconds) {
        audio.currentTime = 0;
        setElapsed(0);
        broadcastState(savePlayerState(track, queueRef.current, currentIndexRef.current, 0, false));
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
      broadcastState(savePlayerState(track, queueRef.current, currentIndexRef.current, audio.currentTime, false), 'pause');
    }
  }, [broadcastState, requestVipAccess, savePlayerState, showNotice, track]);

  const seek = useCallback((seconds: number) => {
    if (!audioRef.current || !track || !Number.isFinite(seconds)) return;

    const limit = track.previewLimitSeconds ?? (duration || track.durationSeconds || Number.POSITIVE_INFINITY);
    const nextTime = Math.min(Math.max(0, seconds), limit);
    if (audioRef.current.readyState === 0) restoredElapsedRef.current = nextTime;
    else audioRef.current.currentTime = nextTime;
    setElapsed(nextTime);
    broadcastState(savePlayerState(track, queueRef.current, currentIndexRef.current, nextTime, Boolean(audioRef.current && !audioRef.current.paused)));
  }, [broadcastState, duration, savePlayerState, track]);

  const toggleShuffle = useCallback(() => {
    const currentTrack = trackRef.current;
    if (!currentTrack) return;

    const currentQueue = queueRef.current;
    const currentIndex = currentIndexRef.current;
    const enablingShuffle = !shuffleRef.current;
    const baseQueue = originalQueueRef.current.length > 0 ? originalQueueRef.current : currentQueue;
    const baseIndex = Math.max(0, queueEntryIndex(baseQueue, currentQueue[currentIndex] ?? currentTrack, currentQueue, currentIndex));

    if (enablingShuffle) {
      const nextQueue = shuffleUpcoming(baseQueue, baseIndex, lastShuffleSignatureRef.current);
      lastShuffleSignatureRef.current = queueOrderSignature(nextQueue.slice(baseIndex + 1));
      queueRef.current = nextQueue;
      setQueue(nextQueue);
      currentIndexRef.current = baseIndex;
      setCurrentIndex(baseIndex);
    } else {
      const restoredIndex = Math.max(0, queueEntryIndex(baseQueue, currentTrack, currentQueue, currentIndex));
      const restoredTrack = baseQueue[restoredIndex] ?? currentTrack;
      queueRef.current = baseQueue;
      setQueue(baseQueue);
      currentIndexRef.current = restoredIndex;
      setCurrentIndex(restoredIndex);
      trackRef.current = restoredTrack;
      setTrack(restoredTrack);
    }

    shuffleRef.current = enablingShuffle;
    setShuffle(enablingShuffle);
    const nextTrack = queueRef.current[currentIndexRef.current] ?? currentTrack;
    broadcastState(savePlayerState(
      nextTrack,
      queueRef.current,
      currentIndexRef.current,
      audioRef.current?.currentTime ?? 0,
      Boolean(audioRef.current && !audioRef.current.paused),
    ));
  }, [broadcastState, savePlayerState]);

  const cycleRepeat = useCallback(() => {
    repeatRef.current = repeatRef.current === 'off' ? 'all' : repeatRef.current === 'all' ? 'one' : 'off';
    setRepeatMode(repeatRef.current);
    const currentTrack = trackRef.current;
    if (currentTrack) {
      broadcastState(savePlayerState(
        currentTrack,
        queueRef.current,
        currentIndexRef.current,
        audioRef.current?.currentTime ?? 0,
        Boolean(audioRef.current && !audioRef.current.paused),
      ));
    }
  }, [broadcastState, savePlayerState]);

  const setVolume = useCallback((nextVolume: number) => {
    if (!Number.isFinite(nextVolume)) return;
    const value = Math.max(0, Math.min(1, nextVolume));
    updateVolume(value);
    if (audioRef.current) audioRef.current.volume = value;
  }, []);

  const setQuality = useCallback((qualityId: string) => {
    const currentTrack = trackRef.current;
    const option = currentTrack?.audioQualities?.find((quality) => quality.quality_id === qualityId);
    if (!currentTrack || !option || currentTrack.selectedQualityId === qualityId) return;

    if ((currentTrack.premiumOnly || option.premium_only) && !isPremiumRef.current) {
      requestVipAccess();
      return;
    }

    if (option.available === false || !option.audio_url) {
      showNotice('NCT có thông tin chất lượng VIP nhưng chưa trả luồng phát/tải cho yêu cầu này.');
      return;
    }

    const isPremium = isPremiumRef.current;
    const nextTrack: PlayerTrack = {
      ...currentTrack,
      audioUrl: audioUrlWithAccessToken(option.audio_url, option.premium_only, isPremium),
      downloadUrl: audioUrlWithAccessToken(option.download_url, option.premium_only, isPremium),
      selectedQualityId: option.quality_id,
      qualityLabel: option.label,
    };
    trackRef.current = nextTrack;
    queueRef.current = replaceQueueTrack(queueRef.current, nextTrack);
    originalQueueRef.current = replaceQueueTrack(originalQueueRef.current, nextTrack);
    setTrack(nextTrack);
    setQueue(queueRef.current);

    const audio = audioRef.current;
    if (audio && nextTrack.audioUrl && nextTrack.audioUrl !== currentTrack.audioUrl) {
      const wasPlaying = !audio.paused;
      const resumeAt = audio.currentTime;
      audio.pause();
      restoredElapsedRef.current = resumeAt;
      audio.src = nextTrack.audioUrl;
      audio.load();
      if (wasPlaying) {
        setIsLoading(true);
        void audio.play().catch(() => {
          if (trackRef.current?.id === nextTrack.id) {
            setIsLoading(false);
            showNotice('Không thể chuyển chất lượng lúc này. Hãy thử lại.');
          }
        });
      }
    }

    broadcastState(savePlayerState(nextTrack, queueRef.current, currentIndexRef.current, audio?.currentTime ?? 0, Boolean(audio && !audio.paused)));
  }, [broadcastState, requestVipAccess, savePlayerState, showNotice]);

  const refreshTrackMetadata = useCallback(async (song?: Song) => {
    const currentTrack = trackRef.current;
    if (!currentTrack) return;

    try {
      const freshSong = song ?? (await getSong(currentTrack.slug || currentTrack.id, getVisitorId())).data;
      const activeTrack = trackRef.current;
      if (!activeTrack || activeTrack.id !== freshSong.id) return;

      const refreshed = toPlayerTrack(freshSong, isPremiumRef.current);
      const selected = refreshed.audioQualities?.find((quality) =>
        quality.quality_id === activeTrack.selectedQualityId
        && quality.available !== false
        && Boolean(quality.audio_url),
      );
      const defaultQuality = refreshed.audioQualities?.find((quality) =>
        quality.quality_id === refreshed.selectedQualityId,
      );
      const quality = selected ?? defaultQuality;
      const keepVipPreview = refreshed.premiumOnly && !isPremiumRef.current;
      const nextTrack: PlayerTrack = {
        ...activeTrack,
        slug: refreshed.slug ?? activeTrack.slug,
        favoriteCount: refreshed.favoriteCount,
        shareCount: refreshed.shareCount,
        isFavorite: refreshed.isFavorite,
        audioQualities: refreshed.audioQualities,
        audioUrl: !keepVipPreview && quality?.audio_url
          ? audioUrlWithAccessToken(quality.audio_url, quality.premium_only, isPremiumRef.current)
          : activeTrack.audioUrl,
        downloadUrl: !keepVipPreview && quality?.download_url
          ? audioUrlWithAccessToken(quality.download_url, quality.premium_only, isPremiumRef.current)
          : refreshed.downloadUrl ?? activeTrack.downloadUrl,
        selectedQualityId: quality?.quality_id ?? activeTrack.selectedQualityId ?? null,
        qualityLabel: quality?.label ?? refreshed.qualityLabel ?? activeTrack.qualityLabel,
        premiumOnly: refreshed.premiumOnly,
        previewLimitSeconds: refreshed.previewLimitSeconds,
      };
      const audio = audioRef.current;
      const sourceChanged = Boolean(audio && nextTrack.audioUrl && nextTrack.audioUrl !== activeTrack.audioUrl);
      const wasPlaying = sourceChanged && audio ? !audio.paused : false;
      const resumeAt = sourceChanged && audio ? audio.currentTime : 0;

      trackRef.current = nextTrack;
      queueRef.current = replaceQueueTrack(queueRef.current, nextTrack);
      originalQueueRef.current = replaceQueueTrack(originalQueueRef.current, nextTrack);
      setTrack(nextTrack);
      setQueue(queueRef.current);
      broadcastState(savePlayerState(
        nextTrack,
        queueRef.current,
        currentIndexRef.current,
        audioRef.current?.currentTime ?? 0,
        Boolean(audioRef.current && !audioRef.current.paused),
      ));

      if (sourceChanged && audio && nextTrack.audioUrl) {
        audio.pause();
        restoredElapsedRef.current = resumeAt;
        audio.src = nextTrack.audioUrl;
        audio.load();
        if (wasPlaying) {
          setIsLoading(true);
          void audio.play().catch(() => {
            if (trackRef.current?.id === nextTrack.id) {
              setIsLoading(false);
              showNotice('Chất lượng cũ không còn khả dụng. Không thể chuyển luồng phát.');
            }
          });
        }
      }
    } catch {
      // Keep existing playback usable when the metadata refresh endpoint is unavailable.
    }
  }, [broadcastState, savePlayerState, showNotice]);

  const controls = useMemo(() => ({
    track,
    isPremium,
    isPlaying,
    isLoading,
    queue,
    currentIndex,
    shuffle,
    repeatMode,
    volume,
    duration,
    notice,
    requestVipAccess,
    playSong,
    refreshTrackMetadata,
    togglePlay,
    playPrevious,
    playNext,
    seek,
    playAt,
    removeFromQueue,
    toggleShuffle,
    cycleRepeat,
    setVolume,
    setQuality,
  }), [currentIndex, duration, isPlaying, isLoading, queue, shuffle, repeatMode, volume, notice, isPremium, requestVipAccess, playNext, playPrevious, playSong, refreshTrackMetadata, seek, togglePlay, track, playAt, removeFromQueue, toggleShuffle, cycleRepeat, setVolume, setQuality]);
  const value = useMemo(() => ({ ...controls, elapsed }), [controls, elapsed]);

  return <PlayerControlsContext.Provider value={controls}><PlayerContext.Provider value={value}>{children}<VipAccessDialog open={vipDialogOpen} onClose={closeVipDialog} onUpgrade={upgradeVip} /></PlayerContext.Provider></PlayerControlsContext.Provider>;
}

export function usePlayerControls() {
  const context = useContext(PlayerControlsContext);
  if (!context) throw new Error('usePlayerControls phải được dùng bên trong PlayerProvider.');
  return context;
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) throw new Error('usePlayer phải được dùng bên trong PlayerProvider.');
  return context;
}
