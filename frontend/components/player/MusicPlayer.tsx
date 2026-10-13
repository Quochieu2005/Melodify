'use client';

import Link from 'next/link';
import { useState } from 'react';

import { ArtistNames } from '@/components/artists';
import { songPath } from '@/lib/recent-history';

import { usePlayer } from './PlayerProvider';

function PlayerButton({ label, children, className = '', onClick, disabled = false }: { label: string; children: React.ReactNode; className?: string; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`grid shrink-0 place-items-center rounded-full text-white/65 outline-none transition-colors hover:text-white disabled:cursor-not-allowed disabled:text-white/25 disabled:hover:text-white/25 focus-visible:ring-2 focus-visible:ring-[#00d3e5] ${className}`}
    >
      {children}
    </button>
  );
}

function EmptyPlayerIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 fill-none stroke-current stroke-[1.7]"><path d="M5 12v2m3-5v8m4-11v14m4-10v6m3-4v2" strokeLinecap="round" /></svg>;
}

function ShuffleIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-none stroke-current stroke-[1.8]"><path d="M16 3h5v5m0-5-6.5 6.5M3 7h2.5c2.8 0 4.1 1.2 5.5 3m0 4c1.4 1.8 2.7 3 5.5 3H21m0 0-5 4m5-4-5-4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function PreviousIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 fill-current"><path d="M6 5h2v14H6zM19 6.3v11.4a1.3 1.3 0 0 1-2 1.05l-7.4-5.7a1.3 1.3 0 0 1 0-2.1L17 5.25a1.3 1.3 0 0 1 2 1.05Z" /></svg>;
}

function NextIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 fill-current"><path d="M16 5h2v14h-2zM5 6.3v11.4a1.3 1.3 0 0 0 2 1.05l7.4-5.7a1.3 1.3 0 0 0 0-2.1L7 5.25A1.3 1.3 0 0 0 5 6.3Z" /></svg>;
}

function RepeatIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-none stroke-current stroke-[1.8]"><path d="M4 8h13l-2.5-2.5M20 16H7l2.5 2.5M17 8l2.5 2.5L22 8M7 16l-2.5-2.5L2 16" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function VolumeIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-none stroke-current stroke-[1.7]"><path d="M4 10v4h3l4 3V7l-4 3H4Zm11.5-2.5a6.3 6.3 0 0 1 0 9M18 5a10 10 0 0 1 0 14" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function LyricsIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-none stroke-current stroke-[1.7]"><path d="M8 18.5a2.5 2.5 0 1 1-2-2.45V7l11-2v9.5a2.5 2.5 0 1 1-2-2.45V8.1L8 9.55v8.95Z" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function QueueIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-none stroke-current stroke-[1.8]"><path d="M4 6h16M4 12h16M4 18h10" strokeLinecap="round" /></svg>;
}

function HeartIcon({ filled }: { filled: boolean }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className={filled ? 'size-5 fill-[#ff6f91] stroke-[#ff6f91]' : 'size-5 fill-none stroke-current stroke-[1.7]'}><path d="M12 20.2 3.8 12A5.2 5.2 0 0 1 11.15 4.65L12 5.5l.85-.85A5.2 5.2 0 0 1 20.2 12L12 20.2Z" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = String(seconds % 60).padStart(2, '0');
  return `${String(minutes).padStart(2, '0')}:${remainder}`;
}

function playerArtists(track: { artist: string; artists?: { id: string | null; name: string; slug?: string | null }[] }) {
  if (track.artists?.length) return track.artists;

  return track.artist
    .split(',')
    .map((name) => name.trim())
    .filter((name) => name && name !== 'Nghệ sĩ chưa cập nhật')
    .map((name) => ({ name }));
}

export default function MusicPlayer() {
  const { track, isPlaying, elapsed, duration, togglePlay, playPrevious, playNext, seek } = usePlayer();
  const [isLiked, setIsLiked] = useState(false);
  const displayDuration = duration || track?.durationSeconds || 0;
  const displayElapsed = Math.min(elapsed, displayDuration);
  const visibleArtists = track ? playerArtists(track) : [];

  return (
    <div className="fixed bottom-0 left-0 z-50 h-[74px] w-full border-t border-white/[0.04] bg-[#242424] px-2.5 py-1.5 text-white shadow-[0_-12px_30px_rgba(0,0,0,0.2)] sm:px-3">
      <div className="grid h-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 lg:grid-cols-[minmax(240px,350px)_minmax(280px,1fr)_minmax(220px,350px)] lg:gap-4">
        {track ? (
          <div className="flex min-w-0 items-center gap-2.5">
            <div role="img" aria-label={`Ảnh bìa ${track.title}`} className="size-[46px] shrink-0 rounded-md bg-cover bg-center" style={{ backgroundImage: `url("${track.coverUrl}")` }} />
            <div className="min-w-0">
              <Link href={songPath({ id: track.id, slug: track.slug ?? null, title: track.title })} className="block truncate text-sm font-bold transition-colors hover:text-[#00d3e5] focus-visible:text-[#00d3e5] focus-visible:outline-none">{track.title}</Link>
              <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
                {visibleArtists.length ? <ArtistNames artists={visibleArtists} className="truncate text-xs text-white/60" /> : <span className="truncate text-xs text-white/60">{track.artist}</span>}
                {track.isHot ? <span className="shrink-0 rounded bg-[#ffcf66]/20 px-1 text-[9px] font-bold text-[#ffcf66]">30s</span> : null}
              </div>
            </div>
            <div className="ml-auto hidden items-center gap-2 sm:flex">
              <button type="button" aria-label={isLiked ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'} aria-pressed={isLiked} onClick={() => setIsLiked((value) => !value)} className="grid size-7 place-items-center rounded-full text-white/65 outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-[#00d3e5]"><HeartIcon filled={isLiked} /></button>
              <PlayerButton label="Thêm tùy chọn" className="size-7 text-base tracking-[0.1em]">•••</PlayerButton>
            </div>
          </div>
        ) : (
          <div className="flex min-w-0 items-center gap-2.5 text-white/75">
            <div className="grid size-[46px] shrink-0 place-items-center rounded-md bg-white/20 text-white/45"><EmptyPlayerIcon /></div>
            <p className="truncate text-sm font-bold">Chọn bài hát để phát</p>
          </div>
        )}

        <div className="hidden min-w-0 flex-col items-center justify-center gap-1 lg:flex">
          <div className="flex items-center gap-3">
            <PlayerButton label="Phát ngẫu nhiên" className="size-5" disabled={!track}><ShuffleIcon /></PlayerButton>
            <PlayerButton label="Bài trước" className="size-6" onClick={playPrevious} disabled={!track}><PreviousIcon /></PlayerButton>
            <button type="button" aria-label={isPlaying ? 'Tạm dừng' : 'Phát'} aria-pressed={isPlaying} onClick={togglePlay} disabled={!track} className="grid size-9 place-items-center rounded-full bg-white text-[#202020] outline-none transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:bg-white/25 disabled:text-white/40 disabled:hover:scale-100 focus-visible:ring-2 focus-visible:ring-[#00d3e5]">
              {isPlaying ? <span className="flex gap-0.5"><span className="h-3.5 w-0.5 rounded-full bg-current" /><span className="h-3.5 w-0.5 rounded-full bg-current" /></span> : <span className="ml-0.5 border-y-[7px] border-l-[11px] border-y-transparent border-l-current" />}
            </button>
            <PlayerButton label="Bài tiếp theo" className="size-6" onClick={playNext} disabled={!track}><NextIcon /></PlayerButton>
            <PlayerButton label="Lặp lại" className="size-5" disabled={!track}><RepeatIcon /></PlayerButton>
          </div>
          {track ? <div className="flex w-full max-w-[500px] items-center gap-1.5 text-[10px] text-white/45">
            <span>{formatTime(displayElapsed)}</span>
            <input aria-label="Tiến trình bài hát" type="range" min="0" max={displayDuration} value={displayElapsed} onChange={(event) => seek(Number(event.target.value))} className="h-1 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-white/15 accent-white" />
            <span>{formatTime(displayDuration)}</span>
          </div> : null}
        </div>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
          {track ? <span className="hidden rounded bg-white/75 px-1.5 py-0.5 text-[10px] font-semibold text-[#202020] sm:inline-block">128 kbps</span> : null}
          <PlayerButton label="Âm lượng" className="size-7" disabled={!track}><VolumeIcon /></PlayerButton>
          <PlayerButton label="Lời bài hát" className="hidden size-7 sm:grid" disabled={!track}><LyricsIcon /></PlayerButton>
          <PlayerButton label="Danh sách phát" className="size-7" disabled={!track}><QueueIcon /></PlayerButton>
        </div>
      </div>
    </div>
  );
}
