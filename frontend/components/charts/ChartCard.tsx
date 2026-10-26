'use client';

import Link from 'next/link';
import { useState } from 'react';

import { usePlayerControls } from '@/components/player';
import { PlayGlyph } from '@/components/icons/PlayGlyph';
import { SongRowActionMenu } from '@/components/songs/SongRowActionMenu';
import { getChart, type ChartRecord, type ChartSong } from '@/lib/api';
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
  const { track, isPlaying, queue, playSong, togglePlay } = usePlayerControls();
  const songs = chart.songs ?? [];
  const visibleSongs = songs.slice(0, 5);
  const [fullSongs, setFullSongs] = useState<ChartSong[] | null>(null);
  const [openActionSongId, setOpenActionSongId] = useState<string | null>(null);
  const [isLoadingFullChart, setIsLoadingFullChart] = useState(false);
  const [loadError, setLoadError] = useState('');
  const playbackSongs = fullSongs ?? songs;
  const chartHasCurrentTrack = Boolean(track && playbackSongs.some((song) => song.id === track.id));
  const chartIsPlaying = Boolean(track && isPlaying && chartHasCurrentTrack);

  const loadFullChart = async () => {
    setIsLoadingFullChart(true);
    setLoadError('');
    try {
      const result = await getChart(chart.slug);
      const completeSongs = result.data.songs ?? [];
      setFullSongs(completeSongs);
      if (completeSongs.length === 0) setLoadError('Bảng này hiện chưa có bài hát.');
      return completeSongs;
    } catch {
      setLoadError('Không tải được đầy đủ danh sách bài hát. Vui lòng thử lại.');
      return [];
    } finally {
      setIsLoadingFullChart(false);
    }
  };

  const queueContainsWholeChart = (completeSongs: ChartSong[]) => {
    if (queue.length !== completeSongs.length) return false;
    const remainingIds = new Map<string, number>();
    for (const song of completeSongs) remainingIds.set(song.id, (remainingIds.get(song.id) ?? 0) + 1);
    for (const queuedTrack of queue) {
      const count = remainingIds.get(queuedTrack.id) ?? 0;
      if (count === 0) return false;
      remainingIds.set(queuedTrack.id, count - 1);
    }
    return true;
  };

  const startChartTrack = async (song?: ChartSong) => {
    const completeSongs = await loadFullChart();
    if (completeSongs.length === 0) return;

    const selectedSong = song
      ? completeSongs.find((item) => item.id === song.id) ?? song
      : completeSongs.find((item) => item.id === track?.id) ?? completeSongs[0];
    if (track?.id === selectedSong.id && queueContainsWholeChart(completeSongs)) {
      togglePlay();
      return;
    }
    playSong(selectedSong, completeSongs);
  };

  const handlePlayAll = () => {
    if (isLoadingFullChart || songs.length === 0) return;
    void startChartTrack();
  };

  const handlePlaySong = (song: ChartSong) => {
    if (isLoadingFullChart) return;
    void startChartTrack(song);
  };

  return (
    <article className={`min-h-[410px] rounded-[12px] p-4 text-white sm:p-5 ${toneClass(chart.tone)} ${className}`.trim()}>
      <div className="flex items-center justify-between gap-3">
        <Link href={`/charts/${encodeURIComponent(chart.slug)}`} className="flex min-w-0 items-center gap-1.5 outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
          <h2 className="truncate text-base font-extrabold sm:text-lg">{chart.title}</h2>
          <span aria-hidden="true" className="shrink-0 text-xl font-normal leading-none">›</span>
        </Link>
        <button type="button" onClick={handlePlayAll} disabled={songs.length === 0 || isLoadingFullChart} aria-label={isLoadingFullChart ? `Đang tải ${chart.title}` : `Phát toàn bộ ${chart.title}`} className="flex h-9 shrink-0 items-center gap-2 rounded-full bg-white/15 px-4 text-sm font-bold transition-colors hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
          {isLoadingFullChart ? 'Đang tải' : chartIsPlaying ? 'Đang phát' : 'Phát'}
          <span className="text-cyan-300">{isLoadingFullChart ? <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : chartIsPlaying ? <PauseIcon /> : <ChartPlayIcon />}</span>
        </button>
      </div>
      {loadError ? <p role="status" className="mt-2 text-xs text-amber-100/80">{loadError}</p> : null}

      {visibleSongs.length > 0 ? (
        <ol className="mt-3 space-y-1">
          {visibleSongs.map((song) => {
            const isCurrent = track?.id === song.id;
            const isActionMenuOpen = openActionSongId === song.id;
            const artists = song.artists?.map((artist) => artist.name).join(', ') || song.artist?.name || 'Nghệ sĩ chưa cập nhật';
            return (
              <li key={`${chart.slug}-${song.id}`} className={`song-row-menu-host group relative ${isActionMenuOpen ? 'z-50' : 'z-0'} grid grid-cols-[24px_56px_minmax(0,1fr)] items-center gap-3 rounded-[14px] px-1 py-2 transition-colors hover:bg-white/10 focus-within:bg-white/10`}>
                <div className="flex h-[54px] flex-col items-center justify-center gap-1 text-center">
                  <span className="text-lg font-bold">{song.rank}</span>
                  <Trend value={song.trend} />
                </div>
                <div className="relative size-14 overflow-hidden rounded-[6px] bg-black/20 bg-cover bg-center" style={{ backgroundImage: `url("${song.cover_url || '/images/cover-placeholder.svg'}")` }}>
                  <button type="button" onClick={() => handlePlaySong(song)} aria-label={isCurrent && isPlaying ? `Tạm dừng ${song.title}` : `Phát ${song.title}`} disabled={isLoadingFullChart} className="pointer-events-none absolute inset-0 grid place-items-center bg-black/35 text-white opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
                    <span className="grid size-9 place-items-center rounded-full bg-white text-[#202a28]">{isCurrent && isPlaying ? <PauseIcon /> : <PlayGlyph className="size-4" />}</span>
                  </button>
                </div>
                <div className="min-w-0 pr-7">
                  <Link href={songPath(song)} onClick={() => recordRecentItem(recentSongItem(song))} className={`block truncate text-sm font-bold transition-colors hover:text-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${isCurrent ? 'text-cyan-300' : 'text-white'}`}>{song.title}</Link>
                  <p className="mt-1 truncate text-xs text-white/55">{artists}</p>
                  <p className="mt-1 flex min-w-0 items-center gap-1 truncate text-[11px] text-white/75"><PublisherMark />{song.publisher || 'Melodify'}</p>
                </div>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"><SongRowActionMenu song={song} onMenuOpenChange={(open) => setOpenActionSongId(open ? song.id : null)} buttonClassName="pointer-events-none opacity-100 group-hover:pointer-events-auto group-focus-within:pointer-events-auto" /></div>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="mt-8 rounded-lg bg-black/15 px-4 py-5 text-sm text-white/65">
          <span>Chưa có bài hát trong bảng này.</span>
          {chart.description ? <span className="mt-2 block text-xs text-white/45">{chart.description}</span> : null}
        </p>
      )}
    </article>
  );
}
