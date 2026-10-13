'use client';

import Link from 'next/link';
import { Lexend } from 'next/font/google';
import { useEffect, useMemo, useState } from 'react';

import { listPlaylists, type Playlist } from '@/lib/api';

import styles from './MusicDiscoverySections.module.css';

const lexend = Lexend({ subsets: ['latin', 'vietnamese'], weight: ['500', '600', '700'] });

type PlaylistSectionProps = {
  id: string;
  title: string;
  playlists: Playlist[];
};

const artists = [
  { name: 'TINH HÀ “SAY HÍ”', followers: '9362 người theo dõi', song: 'YÊU', songArtists: 'TINH HÀ “SAY HÍ”, Wren Evans,...', image: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=900&q=85' },
  { name: 'CONGB', followers: '7576 người theo dõi', song: 'chờ chút...', songArtists: 'TINH HÀ “SAY HÍ”, CONGB', image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=900&q=85' },
  { name: 'buitruonglinh', followers: '45668 người theo dõi', song: 'MRT (feat. Xuân Định K.Y, ...', songArtists: 'TINH HÀ “SAY HÍ”, ...', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=85' },
  { name: 'Hngle', followers: '8076 người theo dõi', song: 'Tìm Em', songArtists: 'Hngle, Bảo Anh', image: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=900&q=85' },
];

function PlayIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 fill-current"><path d="M8 5.2v13.6a1.2 1.2 0 0 0 1.84 1.02l9.93-6.8a1.24 1.24 0 0 0 0-2.04L9.84 4.18A1.2 1.2 0 0 0 8 5.2Z" /></svg>;
}

function AudioBadge() {
  return <span aria-hidden="true" className="absolute right-3 top-3 z-10 grid size-6 place-items-center rounded-full bg-black/35 text-[11px] text-white/80 backdrop-blur-sm">◖▮◗</span>;
}

function SectionHeader({ id, title, href }: { id: string; title: string; href?: string }) {
  return (
    <div className="mb-5 flex items-center justify-between gap-4">
      <h2 id={id} className={`${lexend.className} text-[24px] font-bold leading-tight text-white sm:text-[28px]`}>{title}</h2>
      {href ? <Link href={href} className="shrink-0 text-[14px] font-medium text-[#bdbdbd] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00d3e5]">Thêm</Link> : null}
    </div>
  );
}

function PlaylistCard({ playlist }: { playlist: Playlist }) {
  const coverUrl = playlist.cover_url || '/topics/genre/vpop_600.png';
  const subtitle = playlist.type_custom || playlist.type || `${playlist.song_count} bài hát`;
  const href = `/playlist/${encodeURIComponent(playlist.slug || playlist.id)}`;

  return (
    <Link href={href} className={`${styles.playlistCard} group block outline-none focus-visible:ring-2 focus-visible:ring-[#00d3e5]`}>
      <div className="relative aspect-square overflow-hidden rounded-[10px] bg-[#18211f]">
        <div aria-hidden="true" className={`${styles.coverImage} h-full w-full bg-cover bg-center transition-transform duration-300 ease-out group-hover:scale-[1.045]`} style={{ backgroundImage: `url("${coverUrl}")` }} />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
        <AudioBadge />
        <span aria-hidden="true" className="absolute bottom-3 right-3 grid size-12 translate-y-2 place-items-center rounded-full bg-[#00d3e5] text-[#13201e] opacity-0 shadow-lg shadow-black/30 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100"><PlayIcon /></span>
      </div>
      <h3 className="mt-3 truncate text-[15px] font-bold leading-5 text-white transition-colors group-hover:text-[#00d3e5]">{playlist.name}</h3>
      <p className="mt-1 truncate text-[13px] leading-5 text-[#c2c5c4]">{subtitle}</p>
    </Link>
  );
}

function PlaylistSection({ id, title, playlists }: PlaylistSectionProps) {
  return (
    <section aria-labelledby={id} className={`${styles.section} mt-12`}>
      <SectionHeader id={id} title={title} href="/playlist" />
      <div className={styles.playlistTrack}>{playlists.map((playlist) => <PlaylistCard key={playlist.id} playlist={playlist} />)}</div>
    </section>
  );
}

function TrendingArtistsSection() {
  return (
    <section aria-labelledby="trending-artists-heading" className={`${styles.section} mt-14`}>
      <SectionHeader id="trending-artists-heading" title="Nghệ Sĩ Thịnh Hành" />
      <div className={styles.artistTrack}>
        {artists.map((artist) => (
          <article key={artist.name} className={`${styles.artistCard} overflow-hidden rounded-[8px] bg-[#292b2b]`}>
            <div className="group relative aspect-[1.18/1] overflow-hidden bg-[#18211f]">
              <div aria-hidden="true" className={`${styles.coverImage} h-full w-full bg-cover bg-center transition-transform duration-300 ease-out group-hover:scale-[1.04]`} style={{ backgroundImage: `url(${artist.image})` }} />
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#292b2b] via-transparent to-transparent" />
              <div className="absolute inset-x-5 bottom-4">
                <h3 className="truncate text-[16px] font-bold text-white">{artist.name}</h3>
                <div className="mt-2 flex items-center justify-between gap-3"><p className="truncate text-[13px] text-[#c2c5c4]">{artist.followers}</p><button type="button" className="h-8 shrink-0 rounded-full border border-white/30 px-5 text-[13px] font-semibold text-white transition-colors hover:border-[#00d3e5] hover:text-[#00d3e5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00d3e5]">Theo dõi</button></div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4"><div className="size-14 shrink-0 overflow-hidden rounded-[4px] bg-black/20"><div aria-hidden="true" className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${artist.image})` }} /></div><div className="min-w-0"><p className="truncate text-[14px] font-bold text-white">{artist.song}</p><p className="mt-1 truncate text-[12px] text-[#aeb1b0]">{artist.songArtists}</p></div></div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function MusicDiscoverySections() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);

  useEffect(() => {
    let cancelled = false;

    listPlaylists({ perPage: 50 })
      .then((response) => { if (!cancelled) setPlaylists(response.data); })
      .catch(() => { if (!cancelled) setPlaylists([]); });

    return () => { cancelled = true; };
  }, []);

  const sections = useMemo(() => {
    const moodPlaylists = playlists.filter((playlist) => playlist.type === 'mood_today');
    const popularPlaylists = playlists.filter((playlist) => playlist.type === 'popular');
    const otherPlaylists = playlists.filter((playlist) => playlist.type !== 'mood_today' && playlist.type !== 'popular');

    return [
      { id: 'top-playlists-heading', title: 'Playlist nổi bật', playlists: popularPlaylists.length ? popularPlaylists : otherPlaylists },
      { id: 'mood-heading', title: 'Tâm Trạng Hôm Nay', playlists: moodPlaylists },
      { id: 'all-playlists-heading', title: 'Playlist Melodify', playlists: otherPlaylists },
    ];
  }, [playlists]);

  return <>{sections.map((section) => section.playlists.length > 0 ? <PlaylistSection key={section.id} {...section} /> : null)}<TrendingArtistsSection /></>;
}
