'use client';

import { Lexend } from 'next/font/google';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { listAlbums, type AlbumRecord } from '@/lib/api';
import { albumRecordToCard, type AlbumCard } from '@/lib/album-data';
import styles from '@/components/home/sections/AlbumGrid.module.css';

const lexend = Lexend({ subsets: ['latin', 'vietnamese'], weight: '700' });

function AlbumCard({ album }: { album: AlbumCard }) {
  return (
    <Link href={`/album/${encodeURIComponent(album.slug ?? album.id)}`} aria-label={`Xem album ${album.title}`} className="group block w-full max-w-[205px] min-w-0">
      <article>
        <div role="img" aria-label={`Ảnh bìa ${album.title}`} className="aspect-square w-full overflow-hidden rounded-[8px] bg-cover bg-center transition-transform duration-300 group-hover:scale-[1.02]" style={{ backgroundImage: `url("${album.coverUrl}")` }} />
        <h2 className="mt-3 truncate text-[14px] font-bold leading-5 text-white">{album.title}</h2>
        <p className="mt-0.5 truncate text-[13px] text-white/65">{album.artist}</p>
      </article>
    </Link>
  );
}

async function loadAllAlbums() {
  const firstPage = await listAlbums({ page: 1, perPage: 50 });
  const records: AlbumRecord[] = [...firstPage.data];

  for (let page = 2; page <= firstPage.meta.last_page; page += 1) {
    const response = await listAlbums({ page, perPage: 50 });
    records.push(...response.data);
  }

  return records;
}

export default function AlbumGalleryPage() {
  const [albums, setAlbums] = useState<AlbumCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadAllAlbums()
      .then((records) => {
        if (!cancelled) setAlbums(records.map(albumRecordToCard));
      })
      .catch(() => {
        if (!cancelled) setError('Không thể tải danh sách album lúc này.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  return (
    <main className="min-h-[calc(100vh-80px)] overflow-x-hidden bg-[#202a28] px-5 pb-12 pt-7 text-white sm:px-8 lg:px-7">
      <div className="w-full">
        <h1 className={`${lexend.className} text-[34px] font-bold leading-tight text-white`}>Album</h1>

        {isLoading ? (
          <div className={`${styles.galleryGrid} mt-8`}>
            {Array.from({ length: 12 }, (_, index) => <div key={index} className="aspect-square w-full max-w-[205px] animate-pulse rounded-[8px] bg-[#30443f]" />)}
          </div>
        ) : error ? (
          <p role="status" className="mt-8 rounded-[8px] bg-[#30443f] px-4 py-3 text-sm text-[#bdbdbd]">{error}</p>
        ) : albums.length === 0 ? (
          <p className="mt-8 text-sm text-white/60">Chưa có album nào.</p>
        ) : (
          <div className={`${styles.galleryGrid} mt-8`}>
            {albums.map((album) => <AlbumCard key={album.id} album={album} />)}
          </div>
        )}
      </div>
    </main>
  );
}
