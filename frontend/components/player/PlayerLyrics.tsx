'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { getSongLyrics, type Lyric } from '@/lib/api';
import { activeLyricIndex, formatPlaybackTime, getPlainLyrics, parseSyncedLyrics } from '@/lib/lyrics';

import type { PlayerTrack } from './PlayerProvider';
import { LyricText } from './LyricText';

// Reopening a song must not wait behind its media stream on the dev server.
// Cache only briefly and by song; never share lyrics across different tracks.
const lyricCache = new Map<string, { lyrics: Lyric[]; expiresAt: number }>();
const pendingLyrics = new Map<string, Promise<Lyric[]>>();

function cachedLyrics(songId: string) {
  const cached = lyricCache.get(songId);
  return cached && cached.expiresAt > Date.now() ? cached.lyrics : undefined;
}

function loadLyrics(songId: string): Promise<Lyric[]> {
  const cached = cachedLyrics(songId);
  if (cached) return Promise.resolve(cached);
  const pending = pendingLyrics.get(songId);
  if (pending) return pending;
  const request = getSongLyrics(songId).then(({ data }) => {
    lyricCache.delete(songId);
    lyricCache.set(songId, { lyrics: data, expiresAt: Date.now() + 60_000 });
    if (lyricCache.size > 12) lyricCache.delete(lyricCache.keys().next().value!);
    return data;
  }).finally(() => pendingLyrics.delete(songId));
  pendingLyrics.set(songId, request);
  return request;
}

function LyricLines({ songId, elapsed, seekLimit, onSeek }: {
  songId: string;
  elapsed: number;
  seekLimit: number | null;
  onSeek: (seconds: number) => void;
}) {
  const [result, setResult] = useState<{ lyrics: Lyric[]; error: boolean } | null>(() => {
    const cached = cachedLyrics(songId);
    return cached ? { lyrics: cached, error: false } : null;
  });
  const [attempt, setAttempt] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef(new Map<number, HTMLButtonElement>());
  const manualScroll = useRef(false);
  const lines = useMemo(() => parseSyncedLyrics(result?.lyrics ?? []), [result]);
  const activeIndex = activeLyricIndex(lines, elapsed);
  const plainLyrics = getPlainLyrics(result?.lyrics ?? []);

  useEffect(() => {
    let cancelled = false;
    void loadLyrics(songId).then((lyrics) => {
      if (!cancelled) setResult({ lyrics, error: false });
    }).catch(() => {
      if (!cancelled) setResult({ lyrics: [], error: true });
    });
    return () => { cancelled = true; };
  }, [songId, attempt]);

  useEffect(() => {
    const container = scrollRef.current;
    const line = lineRefs.current.get(activeIndex);
    if (!container || !line || manualScroll.current) return;
    const top = container.scrollTop + line.getBoundingClientRect().top - container.getBoundingClientRect().top;
    container.scrollTo({
      top: Math.max(0, top - (container.clientHeight - line.clientHeight) / 2),
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
  }, [activeIndex]);

  if (!result) return <div role="status" className="flex h-full items-center justify-center gap-3 text-white/80"><span aria-hidden="true" className="size-5 animate-spin rounded-full border-2 border-white/20 border-t-white motion-reduce:animate-none" />Đang tải lời bài hát…</div>;
  if (result.error) return <div role="alert" className="flex h-full flex-col items-center justify-center gap-4 text-center text-white/80"><p>Không tải được lời bài hát.</p><button type="button" onClick={() => { setResult(null); setAttempt((value) => value + 1); }} className="rounded-full border border-white/30 px-5 py-2 text-sm font-semibold hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-cyan-300">Thử lại</button></div>;
  if (!lines.length && !plainLyrics) return <div className="flex h-full items-center justify-center text-center text-white/70">Bài hát chưa có lời. Bạn vẫn có thể phát nhạc bằng nút bên dưới.</div>;

  return <div
    ref={scrollRef}
    role="region"
    aria-label="Nội dung lời bài hát"
    tabIndex={0}
    onWheel={() => { manualScroll.current = true; }}
    onTouchMove={() => { manualScroll.current = true; }}
    onPointerDown={() => { manualScroll.current = true; }}
    onKeyDown={(event) => {
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(event.key)) manualScroll.current = true;
    }}
    className="lyric-scroll h-full min-h-0 overflow-y-auto overscroll-contain rounded-lg px-1 outline-none focus-visible:ring-2 focus-visible:ring-white/40"
  >
    {lines.length ? <div className="space-y-5 py-[min(25vh,160px)] sm:space-y-6">
      {lines.map((line, index) => {
        const unavailable = seekLimit !== null && line.time >= seekLimit;
        return <button
          type="button"
          key={`${line.time}-${index}`}
          ref={(element) => { if (element) lineRefs.current.set(index, element); else lineRefs.current.delete(index); }}
          aria-current={index === activeIndex ? 'true' : undefined}
          data-lyric-time={line.time}
          aria-label={line.text}
          disabled={unavailable}
          title={unavailable ? 'Câu này nằm ngoài đoạn âm thanh có thể nghe' : `Tua đến ${formatPlaybackTime(line.time)}`}
          onClick={() => { manualScroll.current = false; onSeek(line.time); }}
          className={`block w-full rounded-md text-left text-[clamp(22px,2.5vw,40px)] font-bold leading-[1.5] tracking-[-0.01em] outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-white/60 disabled:cursor-not-allowed disabled:opacity-30 motion-reduce:transition-none ${index === activeIndex ? 'text-white' : 'text-white/55 hover:text-white/85'}`}
        ><LyricText line={line} elapsed={elapsed} active={index === activeIndex} /></button>;
      })}
    </div> : <div className="py-8 sm:py-16"><p className="mb-6 text-sm text-white/60">Lời chưa có mốc thời gian nên chưa thể bấm để tua.</p><p className="whitespace-pre-line text-[clamp(22px,2.5vw,40px)] font-bold leading-[1.8] text-white/80">{plainLyrics}</p></div>}
  </div>;
}

export default function PlayerLyrics({ track, elapsed, duration, onSeek, onClose, actions }: {
  track: PlayerTrack;
  elapsed: number;
  duration: number;
  onSeek: (seconds: number) => void;
  onClose: () => void;
  actions: ReactNode;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { closeRef.current?.focus(); }, []);

  return <section id="player-lyrics" aria-label="Lời bài hát đang phát" className="fixed inset-0 z-[45] overflow-hidden bg-[#353936] text-white">
    <div aria-hidden="true" className="pointer-events-none absolute -inset-16 scale-110 bg-cover bg-center opacity-55 blur-[70px]" style={{ backgroundImage: `url(${JSON.stringify(track.coverUrl)})` }} />
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[#202020]/60" />
    <button ref={closeRef} type="button" aria-label="Thu gọn lời bài hát" onClick={onClose} className="absolute top-4 right-4 z-10 grid size-11 place-items-center rounded-full bg-white/10 text-white/90 transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-cyan-300 sm:top-6 sm:right-7">
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 fill-none stroke-current stroke-[1.6]"><path d="m5 9 7 7 7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </button>
    <div className="relative mx-auto flex h-[calc(100%_-_98px)] w-full max-w-[1160px] flex-col gap-5 px-6 pt-20 pb-12 sm:px-10 md:flex-row md:items-center md:gap-10 md:pt-16 lg:gap-14">
      <div className="flex shrink-0 items-center gap-4 md:block md:w-[30%] md:max-w-[320px]">
        <div role="img" aria-label={`Ảnh bìa ${track.title}`} className="size-20 shrink-0 rounded-lg bg-[#454545] bg-cover bg-center shadow-lg sm:size-28 md:aspect-square md:h-auto md:w-full" style={{ backgroundImage: `url(${JSON.stringify(track.coverUrl)})` }} />
        <div className="min-w-0 md:mt-4">
          <h2 className="text-lg leading-snug font-bold sm:text-xl lg:text-2xl">{track.title}</h2>
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-white/80 md:line-clamp-none">{track.artist}</p>
          <div className="mt-3 flex items-center gap-2 md:mt-4 md:gap-3">{actions}</div>
        </div>
      </div>
      <div className="min-h-0 min-w-0 flex-1 md:h-full">
        <LyricLines key={track.id} songId={track.slug || track.id} elapsed={elapsed} seekLimit={track.previewLimitSeconds ?? (duration > 0 ? duration : null)} onSeek={onSeek} />
      </div>
    </div>
  </section>;
}
