'use client';

import Image from 'next/image';
import { useState } from 'react';

type RecentSong = {
  title: string;
  publisher: string;
  artist: string;
  duration: string;
  cover: string;
};

type RecentPlaylist = {
  title: string;
  count: string;
  cover: string;
};

const songs: RecentSong[] = [
  { title: 'Dạo Bước HongKong 1999', publisher: 'IC Music', artist: 'NHONHO', duration: '03:29', cover: '/topics/scene/scene_11_600.png' },
  { title: 'YÊU', publisher: 'SONY MUSIC', artist: 'TINH HÀ “SAY HI”, Wren Evans, IfsInk', duration: '03:06', cover: '/topics/mood/mood_1_600.png' },
  { title: 'Hẹn anh ngày nắng xanh', publisher: 'UNIVERSAL MUSIC GROUP', artist: 'Nguyễn Hà', duration: '04:52', cover: '/topics/scene/scene_43_600.png' },
  { title: 'I Want It That Way', publisher: 'SONY MUSIC', artist: 'Backstreet Boys', duration: '03:33', cover: '/topics/genre/genre_4_600.png' },
  { title: 'LAVIEM', publisher: 'SONY MUSIC', artist: 'TINH HÀ “SAY HI”,...', duration: '04:30', cover: '/topics/mood/mood_1_600.png' },
];

const playlists: RecentPlaylist[] = [
  { title: 'Nhạc Việt những năm 2010', count: '63 bài hát', cover: '/topics/genre/vpop_600.png' },
  { title: 'Nhạc Trung Hay Nhất 2026', count: '45 bài hát', cover: '/topics/genre/CPop_600.png' },
  { title: 'Nghe đi Nghe lại', count: '52 bài hát', cover: '/topics/scene/scene_1_600.png' },
  { title: 'TikTok Trending', count: '49 bài hát', cover: '/topics/scene/scene_2_600.png' },
  { title: 'Top 100 Rap Việt Hay Nhất', count: '100 bài hát', cover: '/topics/genre/vrap_600.png' },
  { title: 'Lofi Chill Cho Ngày Mưa', count: '38 bài hát', cover: '/topics/mood/mood_2_600.png' },
  { title: 'Nhạc trẻ hay nhất', count: '42 bài hát', cover: '/topics/genre/genre_29_600.png' },
  { title: 'Khi Mùa Thu Tới', count: '35 bài hát', cover: '/topics/scene/scene_44_600.png' },
  { title: 'Top 100 nhạc Việt', count: '100 bài hát', cover: '/topics/genre/vpop_600.png' },
  { title: 'Nhạc Âu Mỹ chọn lọc', count: '56 bài hát', cover: '/topics/genre/genre_4_600.png' },
];

const tabs = ['Bài hát', 'Playlist', 'Album', 'Nghệ sĩ', 'Radios', 'Video'];

function PlayIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-current"><path d="m8 5.5 10 6.5-10 6.5v-13Z" /></svg>;
}

function ClockIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-none stroke-current stroke-2"><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5v5l3 1.5" strokeLinecap="round" /></svg>;
}

export default function RecentlyPlayedPage() {
  const [activeTab, setActiveTab] = useState('Bài hát');
  const [playing, setPlaying] = useState(false);

  return (
    <main className="min-h-[calc(100vh-80px)] overflow-x-auto bg-[#202a28] px-4 pb-12 pt-6 text-white sm:px-8 lg:px-8">
      <div className="mx-auto min-w-[760px] max-w-[1440px]">
        <h1 className="text-[34px] font-extrabold tracking-[-0.04em]">Recently played</h1>
        <div role="tablist" aria-label="Recently played categories" className="mt-7 flex gap-9 border-b border-white/10">
          {tabs.map((tab) => (
            <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)} className={[
              'relative pb-3 text-base font-semibold outline-none transition-colors focus-visible:text-cyan-300',
              activeTab === tab ? 'text-white' : 'text-white/50 hover:text-white',
            ].join(' ')}>
              {tab}
              {activeTab === tab && <span className="absolute inset-x-0 bottom-0 h-1 rounded-full bg-cyan-400" />}
            </button>
          ))}
        </div>

        {activeTab === 'Bài hát' ? (
          <section className="mt-8">
            <div className="flex items-center gap-4">
              <button type="button" aria-label="Phát bài hát đã phát" onClick={() => setPlaying((value) => !value)} className="grid size-12 place-items-center rounded-full bg-cyan-400 text-[#07363a] outline-none hover:bg-cyan-300 focus-visible:ring-2 focus-visible:ring-white">
                <PlayIcon />
              </button>
              <h2 className="text-[29px] font-extrabold tracking-[-0.03em]">Bài hát đã phát <span className="text-sm font-medium text-white/70">(12)</span></h2>
            </div>
            <div className="mt-6 grid grid-cols-[34px_minmax(340px,1.7fr)_minmax(200px,1fr)_minmax(200px,1fr)_64px] items-center gap-3 px-3 pb-3 text-sm font-bold text-white/75">
              <span>#</span><span>Tiêu đề</span><span>Người đăng</span><span>Nghệ sĩ</span><span className="flex justify-end"><ClockIcon /></span>
            </div>
            {songs.map((song, index) => (
              <button key={song.title} type="button" onClick={() => setPlaying(true)} className="group grid h-[75px] w-full grid-cols-[34px_minmax(340px,1.7fr)_minmax(200px,1fr)_minmax(200px,1fr)_64px] items-center gap-3 rounded-xl px-3 text-left outline-none hover:bg-white/8 focus-visible:bg-white/8">
                <span className="text-sm text-white/65">{index + 1}</span>
                <span className="flex min-w-0 items-center gap-3">
                  <Image src={song.cover} alt="" width={56} height={56} className="size-14 shrink-0 rounded-sm object-cover" />
                  <span className={['truncate text-base font-bold', index === 0 || playing ? 'text-cyan-400' : 'text-white'].join(' ')}>{song.title}</span>
                </span>
                <span className="truncate text-sm text-white/75">{song.publisher}</span>
                <span className="truncate text-sm text-white/75">{song.artist}</span>
                <span className="text-right text-sm text-[#bcd4e4]">{song.duration}</span>
              </button>
            ))}
          </section>
        ) : activeTab === 'Playlist' ? (
          <section className="mt-6 grid grid-cols-5 gap-x-8 gap-y-8">
            {playlists.map((playlist) => (
              <button key={playlist.title} type="button" className="group min-w-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
                <div className="relative aspect-square overflow-hidden rounded-xl">
                  <Image src={playlist.cover} alt="" fill sizes="(min-width: 1200px) 20vw, 220px" className="object-cover transition-transform duration-300 group-hover:scale-105" />
                </div>
                <h2 className="mt-3 truncate text-base font-bold text-white group-hover:text-cyan-300">{playlist.title}</h2>
                <p className="mt-1 text-sm text-white/50">{playlist.count}</p>
              </button>
            ))}
          </section>
        ) : (
          <div className="mt-12 rounded-xl border border-white/10 bg-white/5 p-8 text-center text-white/55">Mock data cho tab {activeTab} sẽ được bổ sung sau.</div>
        )}
      </div>
    </main>
  );
}
