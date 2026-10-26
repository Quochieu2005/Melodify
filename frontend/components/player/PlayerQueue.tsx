'use client';

import { useEffect, useRef } from 'react';

import { PlayGlyph } from '@/components/icons/PlayGlyph';
import { SongRowActionMenu } from '@/components/songs/SongRowActionMenu';
import type { Song } from '@/lib/api';

import { usePlayerControls, type PlayerTrack } from './PlayerProvider';

function QueueTrack({ track, current, playing, onClick, onRemoveFromQueue, onStatus }: { track: PlayerTrack; current?: boolean; playing?: boolean; onClick: () => void; onRemoveFromQueue?: () => void; onStatus?: (message: string) => void }) {
  const song: Song = {
    id: track.id,
    slug: track.slug ?? null,
    title: track.title,
    duration_seconds: track.durationSeconds,
    artist: track.artists?.[0] ?? { id: null, name: track.artist },
    artists: track.artists,
    cover_url: track.coverUrl,
    audio_url: track.audioUrl,
    download_url: track.downloadUrl ?? null,
    preview_url: null,
    premium_only: track.premiumOnly,
  };

  return <div className="song-row-menu-host group flex w-full items-center gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-[#383838] focus-within:bg-[#383838]">
    <button type="button" onClick={onClick} aria-current={current ? 'true' : undefined} aria-label={current ? `${playing ? 'Tạm dừng' : 'Phát'} ${track.title}` : `Phát ${track.title}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-300">
      <span className="relative size-12 shrink-0 overflow-hidden rounded-md bg-[#383838] bg-cover bg-center sm:size-14" style={{ backgroundImage: `url(${JSON.stringify(track.coverUrl)})` }}>
        <span aria-hidden="true" className="absolute inset-0 grid place-items-center bg-black/35 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">{playing ? <span className="flex gap-1"><span className="h-5 w-1.5 bg-white" /><span className="h-5 w-1.5 bg-white" /></span> : <PlayGlyph className="size-6" />}</span>
      </span>
      <span className="min-w-0 flex-1 pr-1"><span className={`block truncate text-[14px] font-bold transition-colors group-hover:text-[#00d3e5] ${current ? 'text-[#00d3e5]' : 'text-white'}`}>{track.title}</span><span className="mt-1 block truncate text-[12px] text-white/55">{track.artist}</span>{current ? <span className="mt-1 block text-[11px] text-white/50">{playing ? 'Đang phát' : 'Đang chọn'}</span> : null}</span>
    </button>
    <span className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
      <SongRowActionMenu song={song} onStatus={onStatus} onRemoveFromQueue={onRemoveFromQueue} menuClassName="w-[250px]" buttonClassName="pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100" />
    </span>
  </div>;
}

export default function PlayerQueue({ onClose, onStatus }: { onClose: () => void; onStatus?: (message: string) => void }) {
  const { track, queue, currentIndex, isPlaying, shuffle, repeatMode, playAt, removeFromQueue, togglePlay } = usePlayerControls();
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { closeRef.current?.focus(); }, []);
  const upcoming = queue.map((item, index) => ({ item, index })).slice(currentIndex + 1);
  const previous = queue.map((item, index) => ({ item, index })).slice(0, currentIndex);
  const selectTrack = (index: number) => {
    // The selected row moves out of "Tiếp theo" after playback starts. Keep
    // keyboard focus in the drawer instead of leaving it on a removed button.
    closeRef.current?.focus();
    playAt(index);
  };

  return <aside id="player-queue" aria-label="Danh sách phát" className="fixed top-0 right-0 bottom-[74px] z-[55] flex w-full max-w-[300px] flex-col border-l border-white/5 bg-[#202020] text-white shadow-[-12px_0_40px_rgba(0,0,0,0.18)]">
    <div className="flex shrink-0 items-center justify-between px-4 py-4"><h2 className="text-lg font-bold">Danh sách phát</h2><button ref={closeRef} type="button" aria-label="Đóng danh sách phát" onClick={onClose} className="grid size-9 place-items-center rounded-full text-white/75 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-cyan-300"><svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 fill-none stroke-current stroke-[1.5]"><path d="m5 5 14 14M19 5 5 19" strokeLinecap="round" /></svg></button></div>
    <div className="sidebar-scrollbar-hidden min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-6">
      {track ? <QueueTrack track={track} current playing={isPlaying} onClick={togglePlay} onRemoveFromQueue={queue.length > 1 ? () => removeFromQueue(currentIndex) : undefined} onStatus={onStatus} /> : null}
      <h3 className="mt-6 text-base font-bold">Tiếp theo</h3>
      {shuffle ? <p className="mt-1 text-xs text-white/55">Thứ tự các bài bên dưới đã được trộn.</p> : null}
      {upcoming.length ? <ol className="mt-2">{upcoming.map(({ item, index }) => <li key={`${item.id}-${index}`}><QueueTrack track={item} onClick={() => selectTrack(index)} onRemoveFromQueue={() => removeFromQueue(index)} onStatus={onStatus} /></li>)}</ol> : <p className="mt-3 text-sm leading-6 text-white/50">Chưa có bài tiếp theo. Chọn thêm bài hát từ album hoặc playlist.</p>}
      {repeatMode !== 'off' ? <p className="mt-3 text-xs text-white/55">{repeatMode === 'one' ? 'Đang lặp lại bài hiện tại.' : 'Toàn bộ danh sách sẽ phát lại từ đầu khi kết thúc.'}</p> : null}
      {previous.length ? <details className="mt-6 border-t border-white/10 pt-4"><summary className="cursor-pointer text-sm font-semibold text-white/60">Các bài trước ({previous.length})</summary><ol className="mt-2">{previous.map(({ item, index }) => <li key={`${item.id}-${index}`}><QueueTrack track={item} onClick={() => selectTrack(index)} onRemoveFromQueue={() => removeFromQueue(index)} onStatus={onStatus} /></li>)}</ol></details> : null}
    </div>
  </aside>;
}
