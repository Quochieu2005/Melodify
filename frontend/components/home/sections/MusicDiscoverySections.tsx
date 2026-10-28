'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';

import { usePlayerControls } from '@/components/player';
import { PlayGlyph } from '@/components/icons/PlayGlyph';
import { SongRowActionMenu } from '@/components/songs/SongRowActionMenu';
import { artistPath, type ArtistReference } from '@/components/artists/ArtistLink';
import { getHomeBootstrap, type HomeDiscovery, type HomeTrendingArtist, type Playlist, type Song } from '@/lib/api';
import FollowButton from '@/components/follow/FollowButton';
import { recentPlaylistItem, recordRecentItem, recentArtistItem, recentSongItem, songPath } from '@/lib/recent-history';
import VideoSection from '@/components/videos/VideoSection';

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

function SectionHeader({ id, title, href }: { id: string; title: string; href?: string }) {
  return (
    <div className="mb-5 flex items-center justify-between gap-4">
      <h2 id={id} className="text-[24px] font-bold leading-tight text-white sm:text-[28px]">{title}</h2>
      {href ? <Link href={href} className="shrink-0 text-[14px] font-medium text-[#bdbdbd] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00d3e5]">Thêm</Link> : null}
    </div>
  );
}

function PlaylistCard({ playlist }: { playlist: Playlist }) {
  const coverUrl = playlist.cover_url || '/images/cover-placeholder.svg';
  const subtitle = `${playlist.song_count} bài hát`;
  const href = `/playlist/${encodeURIComponent(playlist.slug || playlist.id)}`;

  return (
    <Link href={href} onClick={() => recordRecentItem(recentPlaylistItem(playlist))} className={`${styles.playlistCard} group block outline-none focus-visible:ring-2 focus-visible:ring-[#00d3e5]`}>
      <div className="relative aspect-square overflow-hidden rounded-[10px] bg-[#18211f]">
        <Image aria-hidden="true" src={coverUrl} alt="" fill sizes="(max-width: 640px) 50vw, 20vw" unoptimized className={`${styles.coverImage} object-cover transition-transform duration-300 ease-out group-hover:scale-[1.045]`} />
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
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const coverUrl = song.cover_url || '/images/cover-placeholder.svg';
  const artistCredits: ArtistReference[] = (song.artists?.length ? song.artists : song.artist ? [song.artist] : []).filter((artist) => artist.name.trim());
  const artistNames = artistCredits.map((artist) => artist.name).join(', ') || song.artist?.name || 'Nghệ sĩ chưa cập nhật';
  const publisher = song.publisher || 'Melodify';

  return (
    <article className={`${styles.songCard} song-row-menu-host group relative ${actionMenuOpen ? 'z-50' : 'z-0'} flex min-w-0 items-center gap-3 rounded-[8px] p-2 pr-10 text-left transition-colors hover:bg-white/[0.05] ${isActive ? 'bg-white/[0.08]' : ''}`}>
      <button type="button" onClick={onPlay} aria-label={`Phát ${song.title}`} className="relative size-[72px] shrink-0 overflow-hidden rounded-[4px] bg-[#18211f] outline-none focus-visible:ring-2 focus-visible:ring-[#00d3e5]">
        <Image aria-hidden="true" src={coverUrl} alt="" fill sizes="72px" unoptimized className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.06]" />
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
      <span className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        <SongRowActionMenu song={song} onMenuOpenChange={setActionMenuOpen} buttonClassName="pointer-events-none group-hover:pointer-events-auto group-focus-within:pointer-events-auto" />
      </span>
    </article>
  );
}

function SongSection({ id, title, songs }: SongSectionProps) {
  const { playSong, track, isPlaying } = usePlayerControls();

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

function TrendingArtistCard({ artist, onFollowersChanged }: { artist: HomeTrendingArtist; onFollowersChanged: (id: string, count: number) => void }) {
  const formatCount = (count: number) => new Intl.NumberFormat('vi-VN').format(count);
  const artistHref = `/artist/${encodeURIComponent(artist.slug || artist.id)}`;
  const artistImage = artist.avatar_url || '/images/cover-placeholder.svg';

  return (
    <article className={styles.artistCard}>
      <div className={styles.artistHero}>
        <Image aria-hidden="true" src={artistImage} alt="" fill sizes="(max-width: 900px) 50vw, 25vw" unoptimized className={styles.artistHeroImage} />
        <span aria-hidden="true" className={styles.artistHeroShade} />
        <div className={styles.artistHeroInfo}>
          <Link href={artistHref} className="block truncate text-lg font-bold text-white transition-colors hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">{artist.name}</Link>
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="truncate text-sm text-white/75">{formatCount(artist.followers_count || 0)} người theo dõi</p>
            <FollowButton id={artist.id} pendingText={null} onChanged={(_following, count) => onFollowersChanged(artist.id, count)} className="px-4 py-1 text-[13px]" />
          </div>
        </div>
      </div>
      {artist.featured_song && (
        <Link href={songPath(artist.featured_song)} className="group flex min-w-0 items-center gap-3 p-3 transition-colors hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-300">
          <Image aria-hidden="true" src={artist.featured_song.cover_url || '/images/cover-placeholder.svg'} alt="" width={56} height={56} unoptimized className={styles.artistSongCover} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-semibold text-white group-hover:text-cyan-300">{artist.featured_song.title}</span>
            <span className="mt-1 block truncate text-xs text-white/55">{artist.name}</span>
          </span>
        </Link>
      )}
    </article>
  );
}

function TrendingArtistsSection({ artists, onFollowersChanged }: { artists: HomeTrendingArtist[]; onFollowersChanged: (id: string, count: number) => void }) {
  const showingCatalogArtists = artists[0]?.ranking_source === 'catalog';
  return (
    <section aria-labelledby="trending-artists-heading" className={`${styles.section} mt-14`}>
      <SectionHeader id="trending-artists-heading" title="Nghệ Sĩ Thịnh Hành" href="/trending-artist" />
      {showingCatalogArtists && <p className="mb-4 text-sm text-white/65">Gợi ý nghệ sĩ có bài hát đã phát hành trên Melodify.</p>}
      <div className={styles.artistTrack}>
        {artists.filter((artist) => artist.featured_song).map((artist) => <TrendingArtistCard key={artist.id} artist={artist} onFollowersChanged={onFollowersChanged} />)}
      </div>
      {artists.length === 0 && <p className="text-sm text-white/60">Chưa có nghệ sĩ có bài hát đã phát hành để hiển thị.</p>}
    </section>
  );
}

export default function MusicDiscoverySections() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [discovery, setDiscovery] = useState<HomeDiscovery>({ single_new_releases: [], popular_songs: [] });
  const [trendingArtists, setTrendingArtists] = useState<HomeTrendingArtist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadHome = () => getHomeBootstrap().then((response) => {
      if (cancelled) return;

      const nextDiscovery = response.data.discovery;
      setDiscovery({
        single_new_releases: nextDiscovery.single_new_releases || [],
        popular_songs: nextDiscovery.popular_songs || [],
      });
      setPlaylists(response.data.playlists);
      setTrendingArtists((response.data.trending_artists || []).filter((artist) => artist.featured_song));
      setError('');
    }).catch(() => {
      if (!cancelled) {
        setDiscovery({ single_new_releases: [], popular_songs: [] });
        setPlaylists([]);
        setTrendingArtists([]);
        setError('Không thể tải nội dung khám phá lúc này.');
      }
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    void loadHome();
    const refreshTimer = window.setInterval(() => void loadHome(), 60_000);
    const refreshOnFocus = () => {
      if (document.visibilityState === 'visible') void loadHome();
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

  if (loading) return <div role="status" aria-label="Đang tải nội dung khám phá" className="mt-12 h-72 animate-pulse rounded-xl bg-white/5" />;
  if (error) return <p role="alert" className="mt-12 text-sm text-red-300">{error}</p>;

  return <>
    <SongSection id="new-releases-heading" title="Single Mới Phát Hành" songs={discovery.single_new_releases} />
    <SongSection id="popular-songs-heading" title="Nhiều Lượt Nghe Nhất" songs={discovery.popular_songs} />
    {sections.map((section) => section.playlists.length > 0 ? <PlaylistSection key={section.id} {...section} /> : null)}
    <TrendingArtistsSection artists={trendingArtists} onFollowersChanged={(id, count) => setTrendingArtists((current) => current.map((artist) => artist.id === id ? { ...artist, followers_count: count } : artist))} />
    <VideoSection />
  </>;
}
