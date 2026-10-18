'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { usePlayer } from '@/components/player';
import { PlayGlyph } from '@/components/icons/PlayGlyph';
import { artistPath, type ArtistReference } from '@/components/artists/ArtistLink';
import { getHomeBootstrap, type HomeDiscovery, type Playlist, type Song } from '@/lib/api';
import { recentPlaylistItem, recordRecentItem, recentArtistItem, recentSongItem, songPath } from '@/lib/recent-history';

import styles from './MusicDiscoverySections.module.css';


type PlaylistSectionProps = {
  id: string;
  title: string;
  playlists: Playlist[];
};

type SongSectionProps = {
  id: string;
  title: string;
  songs: Song[];
};

const artists = [
  { name: 'TINH HÀ “SAY HÍ”', followers: '9362 người theo dõi', song: 'YÊU', songArtists: 'TINH HÀ “SAY HÍ”, Wren Evans,...', image: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=900&q=85' },
  { name: 'CONGB', followers: '7576 người theo dõi', song: 'chờ chút...', songArtists: 'TINH HÀ “SAY HÍ”, CONGB', image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=900&q=85' },
  { name: 'buitruonglinh', followers: '45668 người theo dõi', song: 'MRT (feat. Xuân Định K.Y, ...', songArtists: 'TINH HÀ “SAY HÍ”, ...', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=85' },
  { name: 'Hngle', followers: '8076 người theo dõi', song: 'Tìm Em', songArtists: 'Hngle, Bảo Anh', image: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=900&q=85' },
];

function SectionHeader({ id, title, href }: { id: string; title: string; href?: string }) {
  return (
    <div className="mb-5 flex items-center justify-between gap-4">
      <h2 id={id} className="text-[24px] font-bold leading-tight text-white sm:text-[28px]">{title}</h2>
      {href ? <Link href={href} className="shrink-0 text-[14px] font-medium text-[#bdbdbd] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00d3e5]">Thêm</Link> : null}
    </div>
  );
}

function PlaylistCard({ playlist }: { playlist: Playlist }) {
  const coverUrl = playlist.cover_url || '/topics/genre/vpop_600.png';
  const subtitle = playlist.type_custom || playlist.type || `${playlist.song_count} bài hát`;
  const href = `/playlist/${encodeURIComponent(playlist.slug || playlist.id)}`;

  return (
    <Link href={href} onClick={() => recordRecentItem(recentPlaylistItem(playlist))} className={`${styles.playlistCard} group block outline-none focus-visible:ring-2 focus-visible:ring-[#00d3e5]`}>
      <div className="relative aspect-square overflow-hidden rounded-[10px] bg-[#18211f]">
        <div aria-hidden="true" className={`${styles.coverImage} h-full w-full bg-cover bg-center transition-transform duration-300 ease-out group-hover:scale-[1.045]`} style={{ backgroundImage: `url("${coverUrl}")` }} />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
        <span aria-hidden="true" className="absolute bottom-3 right-3 grid size-12 translate-y-2 place-items-center rounded-full bg-[#00d3e5] text-[#13201e] opacity-0 shadow-lg shadow-black/30 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100"><PlayGlyph className="size-6" /></span>
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

function ShuffleIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-none stroke-current stroke-[2]"><path d="M17 3h4v4M3 7h3c4.5 0 5.5 10 10 10h5M17 21h4v-4M3 17h3c1.3 0 2.2-.7 3-1.7M14 8.7c.7-.9 1.7-1.7 3-1.7h4" /></svg>;
}

function PlayingBars() {
  return <span aria-label="Đang phát" className={styles.playingBars}><span /><span /><span /><span /></span>;
}

function SongCard({ song, onPlay, isActive, isPlaying }: { song: Song; onPlay: () => void; isActive: boolean; isPlaying: boolean }) {
  const coverUrl = song.cover_url || '/topics/genre/vpop_600.png';
  const artistCredits: ArtistReference[] = (song.artists?.length ? song.artists : song.artist ? [song.artist] : []).filter((artist) => artist.name.trim());
  const artistNames = artistCredits.map((artist) => artist.name).join(', ') || song.artist?.name || 'Nghệ sĩ chưa cập nhật';
  const publisher = song.publisher || 'Melodify';

  return (
    <article className={`${styles.songCard} group flex min-w-0 items-center gap-3 rounded-[8px] p-2 text-left transition-colors hover:bg-white/[0.05] ${isActive ? 'bg-white/[0.08]' : ''}`}>
      <button type="button" onClick={onPlay} aria-label={`Phát ${song.title}`} className="relative size-[72px] shrink-0 overflow-hidden rounded-[4px] bg-[#18211f] outline-none focus-visible:ring-2 focus-visible:ring-[#00d3e5]">
        <span aria-hidden="true" className="absolute inset-0 bg-cover bg-center transition-transform duration-300 ease-out group-hover:scale-[1.06]" style={{ backgroundImage: `url("${coverUrl}")` }} />
        <span aria-hidden="true" className="absolute inset-0 bg-black/10" />
        <span aria-hidden={!isPlaying} className={`absolute inset-0 grid place-items-center bg-black/30 text-[#00d3e5] transition-opacity ${isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>{isPlaying ? <PlayingBars /> : <PlayGlyph className="size-6" />}</span>
      </button>
      <span className={`${styles.songCardContent} min-w-0 flex-1 overflow-hidden`}>
        <Link href={songPath(song)} onClick={() => recordRecentItem(recentSongItem(song))} className={`block w-full max-w-full truncate text-left text-[14px] font-bold leading-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00d3e5] ${isActive ? 'text-[#00d3e5]' : 'text-white hover:text-[#00d3e5]'}`} title={song.title}>{song.title}</Link>
        <span className="mt-0.5 block max-w-full truncate text-[12px] leading-5 text-[#bdbfbe]" title={artistNames}>
          {artistCredits.length > 0 ? artistCredits.map((artist, index) => {
            const href = artistPath(artist);

            return (
              <span key={`${artist.id ?? artist.name}-${index}`}>
                {index > 0 ? ', ' : null}
                {href ? <Link href={href} className="transition-colors hover:text-[#00d3e5] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00d3e5]" onClick={(event) => { event.stopPropagation(); recordRecentItem(recentArtistItem(artist)); }}>{artist.name}</Link> : artist.name}
              </span>
            );
          }) : artistNames}
        </span>
        <span className="mt-0.5 flex min-w-0 max-w-full items-center gap-1 truncate text-[11px] uppercase leading-4 text-[#d1d3d2]" title={publisher}>
          <span aria-hidden="true" className="size-3 shrink-0 rounded-full bg-white/90 shadow-[inset_0_0_0_2px_rgba(0,0,0,0.2)]" />
          <span className="truncate">{publisher}</span>
        </span>
      </span>
    </article>
  );
}

function SongSection({ id, title, songs }: SongSectionProps) {
  const { playSong, track, isPlaying } = usePlayer();

  if (songs.length === 0) return null;

  const playRandom = () => {
    const song = songs[Math.floor(Math.random() * songs.length)];
    if (song) playSong(song, songs);
  };

  return (
    <section aria-labelledby={id} className={`${styles.section} mt-10 first:mt-0 sm:mt-12`}>
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 id={id} className="text-[24px] font-bold leading-tight text-white sm:text-[28px]">{title}</h2>
        <button type="button" onClick={playRandom} className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#3b4140] px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#4a5250] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00d3e5]">
          Nghe ngẫu nhiên
          <ShuffleIcon />
        </button>
      </div>
      <div className={styles.songGrid}>
        {songs.map((song) => {
          const isActive = track?.id === song.id;

          return <SongCard key={song.id} song={song} onPlay={() => playSong(song, songs)} isActive={isActive} isPlaying={isActive && isPlaying} />;
        })}
      </div>
    </section>
  );
}

function TrendingArtistsSection() {
  return (
    <section aria-labelledby="trending-artists-heading" className={`${styles.section} mt-14`}>
      <SectionHeader id="trending-artists-heading" title="Nghệ Sĩ Thịnh Hành" href="/trending-artist" />
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
  const [discovery, setDiscovery] = useState<HomeDiscovery>({ single_new_releases: [], popular_songs: [] });

  useEffect(() => {
    let cancelled = false;

    const loadHome = (force = false) => getHomeBootstrap({ force }).then((response) => {
      if (cancelled) return;

      const nextDiscovery = response.data.discovery as HomeDiscovery & { tiktok_top_mix?: Song[] };
      setDiscovery({
        single_new_releases: nextDiscovery.single_new_releases || [],
        popular_songs: nextDiscovery.popular_songs || nextDiscovery.tiktok_top_mix || [],
      });
      setPlaylists(response.data.playlists);
    }).catch(() => {
      if (!cancelled) {
        setDiscovery({ single_new_releases: [], popular_songs: [] });
        setPlaylists([]);
      }
    });

    void loadHome();
    const refreshTimer = window.setInterval(() => void loadHome(true), 60_000);
    const refreshOnFocus = () => {
      if (document.visibilityState === 'visible') void loadHome(true);
    };
    document.addEventListener('visibilitychange', refreshOnFocus);

    return () => {
      cancelled = true;
      window.clearInterval(refreshTimer);
      document.removeEventListener('visibilitychange', refreshOnFocus);
    };
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

  return <>
    <SongSection id="new-releases-heading" title="Single Mới Phát Hành" songs={discovery.single_new_releases} />
    <SongSection id="popular-songs-heading" title="Nhiều Lượt Nghe Nhất" songs={discovery.popular_songs} />
    {sections.map((section) => section.playlists.length > 0 ? <PlaylistSection key={section.id} {...section} /> : null)}
    <TrendingArtistsSection />
  </>;
}
