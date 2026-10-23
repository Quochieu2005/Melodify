'use client';

import Link from 'next/link';

import { usePlayerControls } from '@/components/player';
import { PlayGlyph } from '@/components/icons/PlayGlyph';
import { SongRowActionMenu } from '@/components/songs/SongRowActionMenu';
import { type ChartRecord, type ChartSong } from '@/lib/api';
import { recentSongItem, recordRecentItem, songPath } from '@/lib/recent-history';

function ChartPlayIcon() {
  return <PlayGlyph className="svg-icon chart-play-btn size-5" />;
}

function PauseIcon() {
  return <span aria-hidden="true" className="flex gap-1"><span className="h-4 w-1.5 rounded-sm bg-current" /><span className="h-4 w-1.5 rounded-sm bg-current" /></span>;
}

function Trend({ value }: { value: ChartSong['trend'] }) {
  if (value === 'up') return <span className="text-[10px] text-cyan-300">▲</span>;
  if (value === 'down') return <span className="text-[10px] text-rose-400">▼</span>;
  return <span className="text-xs text-white/45">−</span>;
}

function PublisherMark() {
  return <span aria-hidden="true" className="grid size-4 shrink-0 place-items-center rounded-full bg-black/70"><span className="size-2 rounded-full bg-[#e43f3f]" /></span>;
}

function toneClass(tone: ChartRecord['tone']) {
  if (tone === 'purple') return 'bg-gradient-to-b from-[#512e58] to-[#25232d]';
  if (tone === 'olive') return 'bg-gradient-to-b from-[#515b25] to-[#25291e]';
  return 'bg-gradient-to-b from-[#513c3e] to-[#292322]';
}

export default function ChartCard({ chart, className = '' }: { chart: ChartRecord; className?: string }) {
  const { track, isPlaying, playSong, togglePlay } = usePlayerControls();
  const songs = chart.songs ?? [];
  const visibleSongs = songs.slice(0, 5);
  const chartHasCurrentTrack = Boolean(track && songs.some((song) => song.id === track.id));
  const chartIsPlaying = Boolean(track && isPlaying && chartHasCurrentTrack);

  const handlePlayAll = () => {
    if (songs.length === 0) return;
    if (chartHasCurrentTrack) {
      togglePlay();
      return;
    }
    playSong(songs[0], songs);
  };

  const handlePlaySong = (song: ChartSong) => {
    if (track?.id === song.id) {
      togglePlay();
      return;
    }
    playSong(song, songs);
  };

  return (
    <article className={`min-h-[410px] rounded-[12px] p-4 text-white sm:p-5 ${toneClass(chart.tone)} ${className}`.trim()}>
      <div className="flex items-center justify-between gap-3">
        <Link href={`/charts/${encodeURIComponent(chart.slug)}`} className="flex min-w-0 items-center gap-1.5 outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
          <h2 className="truncate text-base font-extrabold sm:text-lg">{chart.title}</h2>
          <span aria-hidden="true" className="shrink-0 text-xl font-normal leading-none">›</span>
        </Link>
        <button type="button" onClick={handlePlayAll} disabled={songs.length === 0} className="flex h-9 shrink-0 items-center gap-2 rounded-full bg-white/15 px-4 text-sm font-bold transition-colors hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
          {chartIsPlaying ? 'Đang phát' : 'Phát'}
          <span className="text-cyan-300">{chartIsPlaying ? <PauseIcon /> : <ChartPlayIcon />}</span>
        </button>
      </div>

      {visibleSongs.length > 0 ? (
        <ol className="mt-3 space-y-1">
          {visibleSongs.map((song) => {
            const isCurrent = track?.id === song.id;
            const artists = song.artists?.map((artist) => artist.name).join(', ') || song.artist?.name || 'Nghệ sĩ chưa cập nhật';
            return (
              <li key={`${chart.slug}-${song.id}`} className="group relative z-0 grid grid-cols-[24px_56px_minmax(0,1fr)] items-center gap-3 rounded-[14px] px-1 py-2 transition-colors hover:z-20 hover:bg-white/10 focus-within:z-20 focus-within:bg-white/10">
                <div className="flex h-[54px] flex-col items-center justify-center gap-1 text-center">
                  <span className="text-lg font-bold">{song.rank}</span>
                  <Trend value={song.trend} />
                </div>
                <div className="relative size-14 overflow-hidden rounded-[6px] bg-black/20 bg-cover bg-center" style={{ backgroundImage: `url("${song.cover_url || '/images/cover-placeholder.svg'}")` }}>
                  <button type="button" onClick={() => handlePlaySong(song)} aria-label={isCurrent && isPlaying ? `Tạm dừng ${song.title}` : `Phát ${song.title}`} className="pointer-events-none absolute inset-0 grid place-items-center bg-black/35 text-white opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
                    <span className="grid size-9 place-items-center rounded-full bg-white text-[#202a28]">{isCurrent && isPlaying ? <PauseIcon /> : <PlayGlyph className="size-4" />}</span>
                  </button>
                </div>
                <div className="min-w-0 pr-7">
                  <Link href={songPath(song)} onClick={() => recordRecentItem(recentSongItem(song))} className={`block truncate text-sm font-bold transition-colors hover:text-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${isCurrent ? 'text-cyan-300' : 'text-white'}`}>{song.title}</Link>
                  <p className="mt-1 truncate text-xs text-white/55">{artists}</p>
                  <p className="mt-1 flex min-w-0 items-center gap-1 truncate text-[11px] text-white/75"><PublisherMark />{song.publisher || 'Melodify'}</p>
                </div>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"><SongRowActionMenu song={song} buttonClassName="pointer-events-none opacity-100 group-hover:pointer-events-auto group-focus-within:pointer-events-auto" /></div>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="mt-8 rounded-lg bg-black/15 px-4 py-5 text-sm text-white/65">Chưa có bài hát trong bảng này.</p>
      )}
    </article>
  );
}
