'use client';

import { useState } from 'react';

import { usePlayer } from './PlayerProvider';

const coverImage = 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=240&q=85';
const songDuration = 260;

function PlayerButton({ label, children, className = '', onClick }: { label: string; children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`grid shrink-0 place-items-center rounded-full text-white/65 outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-[#00d3e5] ${className}`}
    >
      {children}
    </button>
  );
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
  return <svg viewBox="0 0 24 24" aria-hidden="true" className={filled ? 'size-7 fill-[#ff6f91] stroke-[#ff6f91]' : 'size-7 fill-none stroke-current stroke-[1.7]'}><path d="M12 20.2 3.8 12A5.2 5.2 0 0 1 11.15 4.65L12 5.5l.85-.85A5.2 5.2 0 0 1 20.2 12L12 20.2Z" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = String(seconds % 60).padStart(2, '0');
  return `${String(minutes).padStart(2, '0')}:${remainder}`;
}

export default function MusicPlayer() {
  const { track, isPlaying, elapsed, duration, togglePlay, playPrevious, playNext, seek } = usePlayer();
  const [isLiked, setIsLiked] = useState(false);

  const displayTrack = track ?? {
    title: 'Nơi Này Có Anh',
    artist: 'Sơn Tùng M-TP',
    coverUrl: coverImage,
    durationSeconds: songDuration,
  };
  const displayDuration = track ? duration || track.durationSeconds || 0 : songDuration;
  const displayElapsed = track ? elapsed : 5;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 h-[100px] border-t border-white/[0.04] bg-[#242424] px-3 py-2.5 text-white shadow-[0_-12px_30px_rgba(0,0,0,0.2)] sm:px-4">
      <div className="grid h-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 lg:grid-cols-[minmax(280px,380px)_minmax(300px,1fr)_minmax(250px,380px)] lg:gap-6">
        <div className="flex min-w-0 items-center gap-3">
          <div role="img" aria-label={`Ảnh bìa ${displayTrack.title}`} className="size-[70px] shrink-0 rounded-lg bg-cover bg-center" style={{ backgroundImage: `url("${displayTrack.coverUrl}")` }} />
          <div className="min-w-0">
            <p className="truncate text-base font-bold">{displayTrack.title}</p>
            <p className="mt-1 truncate text-sm text-white/60">{displayTrack.artist}</p>
          </div>
          <div className="ml-auto hidden items-center gap-3 sm:flex">
            <button type="button" aria-label={isLiked ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'} aria-pressed={isLiked} onClick={() => setIsLiked((value) => !value)} className="grid size-9 place-items-center rounded-full text-white/65 outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-[#00d3e5]"><HeartIcon filled={isLiked} /></button>
            <PlayerButton label="Thêm tùy chọn" className="size-9 text-xl tracking-[0.18em]">•••</PlayerButton>
          </div>
        </div>

        <div className="hidden min-w-0 flex-col items-center justify-center gap-1.5 lg:flex">
          <div className="flex items-center gap-6">
            <PlayerButton label="Phát ngẫu nhiên" className="size-7"><ShuffleIcon /></PlayerButton>
            <PlayerButton label="Bài trước" className="size-8" onClick={playPrevious}><PreviousIcon /></PlayerButton>
            <button type="button" aria-label={isPlaying ? 'Tạm dừng' : 'Phát'} aria-pressed={isPlaying} onClick={togglePlay} className="grid size-12 place-items-center rounded-full bg-white text-[#202020] outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-[#00d3e5]">
              {isPlaying ? <span className="flex gap-1"><span className="h-5 w-1.5 rounded-full bg-current" /><span className="h-5 w-1.5 rounded-full bg-current" /></span> : <span className="ml-1 border-y-[10px] border-l-[15px] border-y-transparent border-l-current" />}
            </button>
            <PlayerButton label="Bài tiếp theo" className="size-8" onClick={playNext}><NextIcon /></PlayerButton>
            <PlayerButton label="Lặp lại" className="size-7"><RepeatIcon /></PlayerButton>
          </div>
          <div className="flex w-full max-w-[540px] items-center gap-2 text-[11px] text-white/45">
            <span>{formatTime(displayElapsed)}</span>
            <input aria-label="Tiến trình bài hát" type="range" min="0" max={displayDuration} value={Math.min(displayElapsed, displayDuration)} onChange={(event) => seek(Number(event.target.value))} className="h-1 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-white/15 accent-white" />
            <span>{formatTime(displayDuration)}</span>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-4">
          <span className="hidden rounded bg-white/75 px-1.5 py-0.5 text-[11px] font-semibold text-[#202020] sm:inline-block">128 kbps</span>
          <PlayerButton label="Âm lượng" className="size-9"><VolumeIcon /></PlayerButton>
          <PlayerButton label="Lời bài hát" className="hidden size-9 sm:grid"><LyricsIcon /></PlayerButton>
          <PlayerButton label="Danh sách phát" className="size-9"><QueueIcon /></PlayerButton>
        </div>
      </div>
    </div>
  );
}
