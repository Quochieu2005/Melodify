'use client';

import { useState } from 'react';
import Image from 'next/image';

type FavoriteSong = {
  title: string;
  artist: string;
  publisher: string;
  duration: string;
  cover: string;
};

const favoriteSongs: FavoriteSong[] = [
  {
    title: 'Anh Vui',
    artist: 'Phạm Kỳ',
    publisher: 'LOOPS MUSIC',
    duration: '03:17',
    cover: '/topics/mood/mood_2_600.png',
  },
  {
    title: 'Địa Ngục Trần Gian',
    artist: 'Phạm Kỳ',
    publisher: 'NCT MUSIC DISTRIBUTION',
    duration: '04:53',
    cover: '/topics/mood/mood_7_600.png',
  },
];

function PlayIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-current"><path d="m8 5.5 10 6.5-10 6.5v-13Z" /></svg>;
}

function DownloadIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-none stroke-current stroke-2"><path d="M12 4v11m0 0 4-4m-4 4-4-4M5 19h14" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function MoreIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-current"><circle cx="5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="19" cy="12" r="1.7" /></svg>;
}

function ShareIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-none stroke-current stroke-[2.4]"><path d="m7 12 10-7M7 12l10 7M7 12H3" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function HeartIcon({ filled = false }: { filled?: boolean }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className={['size-5', filled ? 'fill-cyan-400 text-cyan-400' : 'fill-none text-white/60'].join(' ')}><path d="M20.8 8.7c0 5.2-8.8 10.1-8.8 10.1S3.2 13.9 3.2 8.7A4.7 4.7 0 0 1 12 6.3a4.7 4.7 0 0 1 8.8 2.4Z" stroke="currentColor" strokeWidth="1.8" /></svg>;
}

export default function FavoriteSongsPage() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [liked, setLiked] = useState(true);

  return (
    <main className="min-h-[calc(100vh-80px)] overflow-x-auto bg-[#202a28] px-4 pb-12 pt-5 text-white sm:px-7 lg:px-8">
      <div className="mx-auto min-w-[760px] w-full max-w-[1440px]">
        <section className="flex items-start gap-5 lg:gap-6">
          <div className="relative size-[220px] shrink-0 overflow-hidden rounded-xl bg-[#3a4744] shadow-2xl lg:size-[260px]">
            <Image src="/topics/scene/scene_12_600.png" alt="Ảnh bìa playlist yêu thích" fill sizes="(max-width: 1024px) 220px, 260px" className="object-cover" priority />
            <div className="absolute inset-0 grid place-items-center bg-black/10">
              <HeartIcon filled={false} />
            </div>
          </div>

          <div className="flex min-h-[260px] min-w-0 flex-1 flex-col pt-1">
            <p className="text-xs font-medium text-[#8da7a4]">Playlist&nbsp; · &nbsp;{favoriteSongs.length} Bài hát</p>
            <h1 className="mt-2 text-[32px] font-extrabold leading-tight tracking-[-0.04em] text-white">Yêu thích của mduc</h1>
            <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-white">
              <span className="size-7 overflow-hidden rounded-full bg-gradient-to-br from-[#c9d3d2] to-[#72574b]">
                <Image src="/topics/mood/mood_2_600.png" alt="" width={28} height={28} className="size-full object-cover" />
              </span>
              Phạm Kỳ
            </div>
            <div className="mt-auto">
              <div className="mb-3 flex items-center gap-3">
                <button type="button" aria-label="Bỏ thích playlist" onClick={() => setLiked((value) => !value)} className="grid size-8 place-items-center rounded-full outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-cyan-300">
                <HeartIcon filled={liked} />
                </button>
                <button type="button" aria-label="Chia sẻ playlist" className="grid size-8 place-items-center rounded-full outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-cyan-300">
                  <ShareIcon />
                </button>
                <button type="button" aria-label="Thêm lựa chọn" className="grid size-8 place-items-center rounded-full bg-white/10 text-white/70 outline-none transition-colors hover:bg-white/15 hover:text-white focus-visible:ring-2 focus-visible:ring-cyan-300">
                  <MoreIcon />
                </button>
              </div>
              <div className="flex items-center gap-4">
                <button type="button" onClick={() => setIsPlaying((playing) => !playing)} className="inline-flex h-11 w-[190px] items-center justify-center gap-2 rounded-full bg-[#08c6d9] text-sm font-bold text-[#07363a] outline-none transition-colors hover:bg-[#22d7e7] focus-visible:ring-2 focus-visible:ring-white">
                  <PlayIcon />
                  {isPlaying ? 'Đang phát' : 'Phát tất cả'}
                </button>
                <button type="button" className="inline-flex h-11 w-[190px] items-center justify-center gap-2 rounded-full bg-[#3a3a3a] text-sm font-bold text-white outline-none transition-colors hover:bg-[#484848] focus-visible:ring-2 focus-visible:ring-cyan-300">
                  <DownloadIcon />
                  Tải về
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="grid grid-cols-[30px_minmax(320px,1.7fr)_minmax(200px,1fr)_minmax(140px,1fr)_60px] items-center gap-3 px-3 pb-3 text-xs font-bold text-[#d9d9d9]">
            <span>#</span>
            <span>Tiêu đề</span>
            <span>Người đăng</span>
            <span>Nghệ sĩ</span>
            <span className="text-right" aria-label="Thời lượng">◷</span>
          </div>

          <div>
            {favoriteSongs.map((song, index) => (
              <button key={song.title} type="button" onClick={() => setIsPlaying(true)} className="group grid h-[62px] w-full grid-cols-[30px_minmax(320px,1.7fr)_minmax(200px,1fr)_minmax(140px,1fr)_60px] items-center gap-3 rounded-xl px-3 text-left outline-none transition-colors hover:bg-white/8 focus-visible:bg-white/8">
                <span className="text-xs text-white/55 group-hover:text-cyan-300">{index + 1}</span>
                <span className="flex min-w-0 items-center gap-3">
                  <Image src={song.cover} alt="" width={44} height={44} className="size-11 shrink-0 rounded-sm object-cover" />
                  <span className="truncate text-sm font-bold uppercase text-white/95 group-hover:text-cyan-300">{song.title}</span>
                </span>
                <span className="truncate text-xs text-white/75">{song.publisher}</span>
                <span className="truncate text-xs text-white/75">{song.artist}</span>
                <span className="text-right text-xs text-[#bcd4e4]">{song.duration}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
