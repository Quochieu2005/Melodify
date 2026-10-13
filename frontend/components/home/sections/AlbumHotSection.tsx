'use client';

import { Lexend } from 'next/font/google';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { listAlbums } from '@/lib/api';
import { albumRecordToCard, pickDailyAlbums, type AlbumCard } from '@/lib/album-data';
import { vietnamDateKey } from '@/lib/topic-data';
import styles from './AlbumGrid.module.css';

const lexend = Lexend({ subsets: ['latin', 'vietnamese'], weight: '700' });

function PlayIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-current"><path d="M8 5.2v13.6a1.2 1.2 0 0 0 1.84 1.02l9.93-6.8a1.24 1.24 0 0 0 0-2.04L9.84 4.18A1.2 1.2 0 0 0 8 5.2Z" /></svg>;
}

function AlbumCard({ album }: { album: AlbumCard }) {
  return (
    <Link href={`/album/${encodeURIComponent(album.slug ?? album.id)}`} aria-label={`Xem album ${album.title}`} className="group block w-full max-w-[240px] min-w-0">
      <article>
      <div className="relative aspect-square w-full overflow-hidden rounded-[8px] bg-[#30443f]">
        <div role="img" aria-label={`Ảnh bìa ${album.title}`} className="h-full w-full bg-cover bg-center transition-transform duration-300 group-hover:scale-[1.04]" style={{ backgroundImage: `url("${album.coverUrl}")` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-70" />
        <span aria-hidden="true" className="absolute bottom-3 right-3 grid size-10 translate-y-1 place-items-center rounded-full bg-[#00d3e5] text-[#07363a] opacity-0 shadow-lg transition-all group-hover:translate-y-0 group-hover:opacity-100">
          <PlayIcon />
        </span>
      </div>
      <h3 className="mt-3 truncate text-[14px] font-bold leading-5 text-white">{album.title}</h3>
      <p className="mt-0.5 truncate text-[13px] text-white/65">{album.artist}</p>
      </article>
    </Link>
  );
}

export default function AlbumHotSection() {
  const [albums, setAlbums] = useState<AlbumCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateKey] = useState(vietnamDateKey);

  useEffect(() => {
    let cancelled = false;

    const loadDailyAlbums = async () => {
      try {
        const response = await listAlbums({ perPage: 50 });
        const cards = response.data.map(albumRecordToCard);

        if (!cancelled) setAlbums(pickDailyAlbums(cards, 6, dateKey));
      } catch {
        if (!cancelled) setAlbums([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void loadDailyAlbums();
    return () => { cancelled = true; };
  }, [dateKey]);

  if (!isLoading && albums.length === 0) return null;

  return (
    <section aria-labelledby="album-hot-heading" className="mt-12">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 id="album-hot-heading" className={`${lexend.className} text-[24px] font-bold leading-none text-white`}>
          Album Hot
        </h2>
        <Link href="/album" className="text-[14px] font-medium text-[#bdbdbd] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
          Thêm
        </Link>
      </div>

      {isLoading ? (
        <div className={styles.homeGrid}>
          {Array.from({ length: 6 }, (_, index) => <div key={index} className="aspect-square animate-pulse rounded-[8px] bg-[#30443f]" />)}
        </div>
      ) : (
        <div className={styles.homeGrid}>
          {albums.map((album) => <AlbumCard key={album.id} album={album} />)}
        </div>
      )}
    </section>
  );
}
