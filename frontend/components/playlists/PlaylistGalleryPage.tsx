'use client';

import { Lexend } from 'next/font/google';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { getGenre, getTopic, listPlaylists, type GenreRecord, type Playlist, type TopicRecord } from '@/lib/api';
import { ArtistNames } from '@/components/artists';
import styles from '@/components/home/sections/AlbumGrid.module.css';

const fallbackCover = '/topics/genre/vpop_600.png';
const lexend = Lexend({ subsets: ['latin', 'vietnamese'], weight: '700' });

type PlaylistFilterKind = 'topic' | 'genre';

type PlaylistGalleryPageProps = {
  topicSlug?: string;
  topicKind?: PlaylistFilterKind;
};

type CatalogInfo = Pick<TopicRecord, 'name' | 'description' | 'image_url'> | Pick<GenreRecord, 'name' | 'description' | 'image_url'>;

async function loadAllPlaylists(options: { topic?: string; genre?: string }) {
  const playlists: Playlist[] = [];
  let page = 1;
  let lastPage = 1;

  do {
    const response = await listPlaylists({ ...options, page, perPage: 50 });
    playlists.push(...response.data);
    lastPage = response.meta.last_page;
    page += 1;
  } while (page <= lastPage);

  return playlists;
}

function playlistPath(playlist: Playlist) {
  return `/playlist/${encodeURIComponent(playlist.slug || playlist.id)}`;
}

function PlaylistCard({ playlist, fallbackImage }: { playlist: Playlist; fallbackImage: string }) {
  const coverUrl = playlist.cover_url || fallbackImage;
  const artistNames = playlist.artists?.map((artist) => artist.name).filter(Boolean) ?? [];

  return (
    <article className="w-full max-w-[205px] min-w-0">
      <Link
        href={playlistPath(playlist)}
        aria-label={`Xem playlist ${playlist.name}`}
        className="group block outline-none focus-visible:ring-2 focus-visible:ring-[#00d3e5] focus-visible:ring-offset-4 focus-visible:ring-offset-[#202a28]"
      >
        <div role="img" aria-label={`Ảnh bìa ${playlist.name}`} className="aspect-square w-full overflow-hidden rounded-[8px] bg-cover bg-center transition-transform duration-300 group-hover:scale-[1.02]" style={{ backgroundImage: `url("${coverUrl}")` }} />
        <h2 className="mt-3 truncate text-[14px] font-bold leading-5 text-white">{playlist.name}</h2>
      </Link>
      {artistNames.length > 0 ? (
        <ArtistNames artists={playlist.artists ?? []} className="mt-0.5 block truncate text-[13px] text-white/65" />
      ) : (
        <p className="mt-0.5 truncate text-[13px] text-white/65">{playlist.type_custom || playlist.type || 'Playlist'}</p>
      )}
    </article>
  );
}

export default function PlaylistGalleryPage({ topicSlug, topicKind = 'topic' }: PlaylistGalleryPageProps) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [catalogInfo, setCatalogInfo] = useState<CatalogInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const filter = topicSlug
          ? topicKind === 'genre' ? { genre: topicSlug } : { topic: topicSlug }
          : {};
        const [playlistItems, info] = await Promise.all([
          loadAllPlaylists(filter),
          topicSlug
            ? topicKind === 'genre' ? getGenre(topicSlug).then((response) => response.data) : getTopic(topicSlug).then((response) => response.data)
            : Promise.resolve(null),
        ]);

        if (cancelled) return;
        setPlaylists(playlistItems);
        setCatalogInfo(info);
        setError('');
      } catch {
        if (!cancelled) {
          setPlaylists([]);
          setCatalogInfo(null);
          setError('Không thể tải danh sách playlist lúc này.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    setIsLoading(true);
    void load();

    return () => { cancelled = true; };
  }, [topicKind, topicSlug]);

  const fallbackImage = catalogInfo?.image_url || fallbackCover;

  return (
    <main className="min-h-[calc(100vh-80px)] overflow-x-hidden bg-[#202a28] px-5 pb-12 pt-7 text-white sm:px-8 lg:px-7">
      <div className="w-full">
        <h1 className={`${lexend.className} text-[34px] font-bold leading-tight text-white`}>{catalogInfo?.name || 'Playlist'}</h1>
        {isLoading ? (
          <div className={`${styles.galleryGrid} mt-8`}>
            {Array.from({ length: 12 }, (_, index) => <div key={index} className="aspect-square w-full max-w-[205px] animate-pulse rounded-[8px] bg-[#30443f]" />)}
          </div>
        ) : error ? (
          <p role="alert" className="mt-8 rounded-[8px] bg-[#30443f] px-4 py-3 text-sm text-[#bdbdbd]">{error}</p>
        ) : playlists.length === 0 ? (
          <p className="mt-8 text-sm text-white/60">Chưa có playlist nào.</p>
        ) : (
          <div className={`${styles.galleryGrid} mt-8`}>
            {playlists.map((playlist) => <PlaylistCard key={playlist.id} playlist={playlist} fallbackImage={fallbackImage} />)}
          </div>
        )}
      </div>
    </main>
  );
}
