'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';

import { listAlbums, subscribeCatalogResponse } from '@/lib/api';
import { albumRecordToCard, pickDailyAlbums, type AlbumCard } from '@/lib/album-data';
import { ArtistLink } from '@/components/artists';
import { PlayGlyph } from '@/components/icons/PlayGlyph';
import { vietnamDateKey } from '@/lib/topic-data';
import { recordRecentItem } from '@/lib/recent-history';
import styles from './AlbumGrid.module.css';


function AlbumCard({ album }: { album: AlbumCard }) {
  return (
    <article className="w-full min-w-0">
      <Link href={`/album/${encodeURIComponent(album.slug ?? album.id)}`} aria-label={`Xem album ${album.title}`} onClick={() => recordRecentItem({ id: album.id, category: 'album', title: album.title, subtitle: album.artist, imageUrl: album.coverUrl, href: `/album/${encodeURIComponent(album.slug ?? album.id)}` })} className="group block outline-none focus-visible:ring-2 focus-visible:ring-[#00d3e5] focus-visible:ring-offset-4 focus-visible:ring-offset-[#202a28]">
        <div className="relative aspect-square w-full overflow-hidden rounded-[8px] bg-[#30443f]">
          <Image src={album.coverUrl} alt="" fill sizes="(max-width: 640px) 50vw, 240px" unoptimized className="object-cover transition-transform duration-300 group-hover:scale-[1.04]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-70" />
          <span aria-hidden="true" className="absolute bottom-3 right-3 grid size-10 translate-y-1 place-items-center rounded-full bg-[#00d3e5] text-[#07363a] opacity-0 shadow-lg transition-all group-hover:translate-y-0 group-hover:opacity-100">
            <PlayGlyph className="size-4" />
          </span>
        </div>
        <h3 className="mt-3 truncate text-[14px] font-bold leading-5 text-white">{album.title}</h3>
      </Link>
      <ArtistLink artist={{ id: album.artistId, name: album.artist, slug: album.artistSlug }} className="mt-0.5 block truncate text-[13px] text-white/65">{album.artist}</ArtistLink>
    </article>
  );
}

export default function AlbumHotSection() {
  const [albums, setAlbums] = useState<AlbumCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateKey] = useState(vietnamDateKey);

  useEffect(() => {
    let cancelled = false;
    const applyAlbums = (response: Awaited<ReturnType<typeof listAlbums>>) => {
      const cards = response.data.map(albumRecordToCard);
      if (!cancelled) setAlbums(pickDailyAlbums(cards, 6, dateKey));
    };
    const unsubscribe = subscribeCatalogResponse<Awaited<ReturnType<typeof listAlbums>>>(
      '/v1/albums?per_page=12',
      applyAlbums,
    );

    const loadDailyAlbums = async () => {
      try {
        const response = await listAlbums({ perPage: 12 });
        applyAlbums(response);
      } catch {
        if (!cancelled) setAlbums([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void loadDailyAlbums();
    return () => { cancelled = true; unsubscribe(); };
  }, [dateKey]);

  if (!isLoading && albums.length === 0) return null;

  return (
    <section aria-labelledby="album-hot-heading" className={`mt-12 ${styles.homeSection}`}>
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 id="album-hot-heading" className="text-[24px] font-bold leading-none text-white">
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
