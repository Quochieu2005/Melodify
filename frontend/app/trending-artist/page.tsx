'use client';

import Image from 'next/image';
import Link from 'next/link';

import styles from './trending-artist.module.css';
import { recordRecentItem, songPath } from '@/lib/recent-history';

type Artist = {
  name: string;
  followers: string;
  image: string;
};

type TrendingSong = {
  title: string;
  artist: string;
  publisher: string;
  image: string;
  publisherColor: string;
};

const artists: Artist[] = [
  { name: 'TINH HÀ “SAY HÍ”', followers: '10269 followers', image: '/topics/genre/vrap_600.png' },
  { name: 'Jack - J97', followers: '44117 followers', image: '/topics/mood/mood_1_600.png' },
  { name: 'buitruonglinh', followers: '38204 followers', image: '/topics/scene/scene_47_600.png' },
  { name: 'HIEUTHUHAI', followers: '35880 followers', image: '/topics/genre/vpop_600.png' },
  { name: 'Sơn Tùng M-TP', followers: '52641 followers', image: '/topics/scene/scene_39_600.png' },
];

const trendingSongs: TrendingSong[] = [
  {
    title: 'LAVIEM (Drill)',
    artist: 'TINH HÀ “SAY HÍ”',
    publisher: 'INGROOVES MUSIC GROUP',
    image: '/topics/genre/genre_39_600.png',
    publisherColor: '#fff',
  },
  {
    title: 'Lưu Niên',
    artist: 'Jack - J97',
    publisher: 'SONY MUSIC',
    image: '/topics/mood/mood_3_600.png',
    publisherColor: '#e63333',
  },
  {
    title: 'MRT',
    artist: 'buitruonglinh',
    publisher: 'BELIEVE MUSIC',
    image: '/topics/scene/scene_50_600.png',
    publisherColor: '#f4c542',
  },
];

function PublisherIcon({ color }: { color: string }) {
  return <span aria-hidden="true" className="size-4 shrink-0 rounded-full border border-white/20" style={{ backgroundColor: color }} />;
}

function ArtistRow({ artist, rank }: { artist: Artist; rank: number }) {
  return (
    <article className="flex min-w-0 items-center gap-4 py-7 sm:gap-7">
      <span className="w-10 shrink-0 text-xl font-semibold text-white/75 sm:w-12">#{rank}</span>
      <Image src={artist.image} alt="" width={88} height={88} className="size-[72px] shrink-0 rounded-full object-cover sm:size-[88px]" />
      <div className="min-w-0">
        <h2 className="truncate text-lg font-extrabold transition-colors hover:text-cyan-300 sm:text-[22px]"><Link href={`/artist/${encodeURIComponent(artist.name)}`} onClick={() => recordRecentItem({ id: `trending-artist-${artist.name}`, category: 'artist', title: artist.name, subtitle: 'Nghệ sĩ', imageUrl: artist.image, href: `/artist/${encodeURIComponent(artist.name)}` })}>{artist.name}</Link></h2>
        <p className="mt-2 text-sm font-semibold text-white/75">{artist.followers}</p>
      </div>
    </article>
  );
}

export default function TrendingArtistPage() {
  return (
    <main className={`${styles.page} min-h-[calc(100vh-80px)] overflow-y-auto px-5 pb-24 text-white sm:px-8 lg:px-11`}>
      <div className="relative mx-auto max-w-[1400px]">
        <header className={`${styles.artistHeader} relative overflow-hidden rounded-t-2xl px-3 pb-16 pt-20 sm:px-8 sm:pt-24`}>
          <div className="relative z-10">
            <h1 className="text-4xl font-black sm:text-[40px]">Popular Artists</h1>
            <p className="mt-6 text-sm font-semibold sm:text-base">Cập nhật vào lúc 10/12/2026</p>
          </div>
        </header>

        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.72fr)] lg:gap-16">
          <section aria-labelledby="artist-ranking-heading">
            <div className="border-b border-white/5 px-3 pb-4 text-sm font-bold text-white/75">
              <h2 id="artist-ranking-heading">Rank</h2>
            </div>
            <div className="divide-y divide-white/5">
              {artists.map((artist, index) => <ArtistRow key={artist.name} artist={artist} rank={index + 1} />)}
            </div>
          </section>

          <section aria-labelledby="trending-song-heading">
            <div className="border-b border-white/5 px-3 pb-4 text-sm font-bold text-white/75">
              <h2 id="trending-song-heading">Trending song</h2>
            </div>
            <div className="space-y-10 pt-7">
              {trendingSongs.map((song) => (
                <article key={song.title} className="flex items-center gap-3">
                  <Image src={song.image} alt="" width={82} height={82} className="size-[82px] shrink-0 rounded-md object-cover" />
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-bold text-[#d9d9d9] transition-colors hover:text-cyan-300 sm:text-base"><Link href={songPath({ id: `trending-song-${song.title}`, slug: null, title: song.title })} onClick={() => recordRecentItem({ id: `trending-song-${song.title}`, category: 'song', title: song.title, subtitle: song.artist, imageUrl: song.image, href: songPath({ id: `trending-song-${song.title}`, slug: null, title: song.title }), publisher: song.publisher })}>{song.title}</Link></h3>
                    <p className="mt-1 truncate text-xs text-white/60 sm:text-sm">{song.artist}</p>
                    <p className="mt-2 flex items-center gap-2 truncate text-xs font-semibold text-white/80">
                      <PublisherIcon color={song.publisherColor} />
                      {song.publisher}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
