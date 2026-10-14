'use client';

import Image from 'next/image';
import { useState } from 'react';

type Song = {
  title: string;
  artist: string;
  publisher: string;
  cover: string;
  trend: 'up' | 'down' | 'same';
};

type Chart = {
  title: string;
  tone: 'rose' | 'olive' | 'purple';
  songs: Song[];
};

const songs: Song[] = [
  { title: 'Không Môn Đăng Hộ Đối', artist: 'Nguyễn Vĩ', publisher: 'Do Music', cover: '/charts/song-1.png', trend: 'same' },
  { title: 'Ngày Còn Đôi Mươi', artist: 'Chú Út Long Bông, Tiểu Mỹ', publisher: 'IC Music', cover: '/charts/song-2.png', trend: 'up' },
  { title: 'Xin Đừng Rời Xa Anh (Remix)', artist: 'Lê Gia Bảo', publisher: 'BELIEVE MUSIC', cover: '/charts/song-3.png', trend: 'down' },
  { title: 'dự báo thời tiết hôm nay ...', artist: 'GREY D', publisher: 'VIVI ENM', cover: '/charts/song-4.png', trend: 'down' },
  { title: 'Dạo Bước HongKong 1999', artist: 'Bố Lỗ Tích BlueC', publisher: 'BELIEVE MUSIC', cover: '/charts/song-5.png', trend: 'same' },
  { title: 'Gió Thổi Tuyết Rơi', artist: 'Lục Tiểu Lạc', publisher: 'BELIEVE MUSIC', cover: '/charts/song-6.png', trend: 'up' },
];

const charts: Chart[] = [
  { title: 'Top 50 Bài Hát Thịnh Hành', tone: 'rose', songs: songs.slice(0, 4) },
  { title: 'Top 50 Nhạc Việt', tone: 'olive', songs: [songs[1], songs[0]] },
  { title: 'Top 50 Nhạc Hoa', tone: 'purple', songs: songs.slice(4, 6) },
  { title: 'Top 50 Nhạc Remix Việt', tone: 'olive', songs: [songs[2], songs[0]] },
];

function PlayIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-current"><path d="M8 5.2v13.6a1.2 1.2 0 0 0 1.84 1.02l9.93-6.8a1.24 1.24 0 0 0 0-2.04L9.84 4.18A1.2 1.2 0 0 0 8 5.2Z" /></svg>;
}

function Trend({ value }: { value: Song['trend'] }) {
  if (value === 'up') return <span className="text-[10px] text-cyan-300">▲</span>;
  if (value === 'down') return <span className="text-[10px] text-rose-400">▼</span>;
  return <span className="text-xs text-white/45">−</span>;
}

function ChartCard({ chart }: { chart: Chart }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const tone = chart.tone === 'rose'
    ? 'bg-gradient-to-b from-[#513c3e] to-[#292322]'
    : chart.tone === 'purple'
      ? 'bg-gradient-to-b from-[#512e58] to-[#2b222f]'
      : 'bg-gradient-to-b from-[#515b25] to-[#27291c]';

  return (
    <article className={`min-h-[410px] rounded-lg p-4 sm:p-5 ${tone}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="truncate text-base font-extrabold sm:text-lg">{chart.title} <span className="font-normal">›</span></h2>
        <button type="button" onClick={() => setIsPlaying((value) => !value)} className="flex h-9 shrink-0 items-center gap-2 rounded-full bg-white/15 px-4 text-sm font-bold transition-colors hover:bg-white/25">
          {isPlaying ? 'Đang phát' : 'Phát'}
          <span className="text-cyan-300"><PlayIcon /></span>
        </button>
      </div>

      <ol className="mt-3 space-y-1">
        {chart.songs.map((song, index) => (
          <li key={`${chart.title}-${song.title}`} className="group grid grid-cols-[24px_56px_minmax(0,1fr)] items-center gap-3 rounded-lg px-1 py-2 transition-colors hover:bg-white/10">
            <div className="flex flex-col items-center gap-1">
              <span className="text-base font-bold">{index + 1}</span>
              <Trend value={song.trend} />
            </div>
            <Image src={song.cover} alt="" width={56} height={56} className="size-14 rounded-md object-cover" />
            <div className="min-w-0">
              <h3 className="truncate text-sm font-bold">{song.title}</h3>
              <p className="mt-1 truncate text-xs text-white/55">{song.artist}</p>
              <p className="mt-1 flex items-center gap-1 truncate text-[11px] text-white/75"><span className="size-3 shrink-0 rounded-full bg-white/80" />{song.publisher}</p>
            </div>
          </li>
        ))}
      </ol>
    </article>
  );
}

export default function ChartsPage() {
  return (
    <main className="min-h-[calc(100vh-80px)] overflow-y-auto bg-[#202a28] px-5 py-8 pb-24 text-white sm:px-8 lg:px-10">
      <div className="mx-auto max-w-[1500px]">
        <h1 className="text-4xl font-black tracking-tight">Charts</h1>
        <div className="mt-9 grid gap-6 lg:grid-cols-2">
          {charts.map((chart) => <ChartCard key={chart.title} chart={chart} />)}
        </div>
      </div>
    </main>
  );
}
