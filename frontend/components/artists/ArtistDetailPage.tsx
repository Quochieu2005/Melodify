'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { usePlayer } from '@/components/player';
import { PlayGlyph } from '@/components/icons/PlayGlyph';
import {
  getArtist,
  getVisitorId,
  recordSongShare,
  type AlbumRecord,
  type ArtistDetail,
  type Playlist,
  type Song,
  type SongVideo,
} from '@/lib/api';

import styles from '@/components/albums/AlbumDetailPage.module.css';
import { ArtistNames, type ArtistReference } from './ArtistLink';
import { recentAlbumItem, recentPlaylistItem, recentVideoItem, recentSongItem, recordRecentItem, songPath } from '@/lib/recent-history';

const fallbackCover = '/topics/genre/vpop_600.png';

function PauseIcon() {
  return <span aria-hidden="true" className="flex gap-1"><span className="h-4 w-1.5 rounded-sm bg-current" /><span className="h-4 w-1.5 rounded-sm bg-current" /></span>;
}

function MoreHorizontalIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-current"><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></svg>;
}

function ClockIcon() {
  return <span aria-hidden="true" className="grid size-5 place-items-center text-[18px] leading-none">◷</span>;
}

function ChevronIcon() {
  return <span aria-hidden="true" className="inline-block size-2.5 rotate-45 border-r-2 border-t-2 border-current" />;
}

function CloseIcon() {
  return <span aria-hidden="true" className="relative block size-6"><span className="absolute left-1/2 top-1/2 h-7 w-0.5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-current" /><span className="absolute left-1/2 top-1/2 h-7 w-0.5 -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-current" /></span>;
}

function formatDuration(seconds: number | null | undefined) {
  if (seconds === null || seconds === undefined) return '--:--';

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = String(seconds % 60).padStart(2, '0');
  return `${String(minutes).padStart(2, '0')}:${remainingSeconds}`;
}

function formatCount(count: number) {
  return new Intl.NumberFormat('vi-VN').format(Math.max(0, count));
}

function songArtists(song: Song): ArtistReference[] {
  if (song.artists?.length) return song.artists;
  return song.artist ? [song.artist] : [];
}

function SectionHeading({ title, href }: { title: string; href?: string }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <h2 className="text-[25px] font-bold text-white sm:text-[28px]">{title}</h2>
      {href ? <Link href={href} className="text-[13px] font-bold text-white/70 transition-colors hover:text-[#00d3e5]">Thêm</Link> : null}
    </div>
  );
}

function ArtistSongRow({ song, index, artist, onPlay, onShare, isCurrentTrack, isPlaying }: { song: Song; index: number; artist: ArtistDetail; onPlay: () => void; onShare: () => void; isCurrentTrack: boolean; isPlaying: boolean }) {
  const imageUrl = song.cover_url || artist.avatar_url || fallbackCover;
  const artists = songArtists(song);

  return (
    <li className={`${styles.songRow} group grid grid-cols-[32px_minmax(0,1fr)_56px_28px] items-center gap-3 rounded-lg px-2 py-2.5 sm:grid-cols-[40px_minmax(0,1.15fr)_minmax(180px,1fr)_64px_32px] sm:gap-4`}>
      <span className="grid size-6 place-items-center text-[13px] text-white/70">{index + 1}</span>
      <div className="flex min-w-0 items-center gap-3">
        <div className="group/cover relative size-11 shrink-0 overflow-hidden rounded-[4px]">
          <div role="img" aria-label={`Ảnh bìa ${song.title}`} className="size-full bg-cover" style={{ backgroundImage: `url("${imageUrl}")`, backgroundPosition: 'center 25%' }} />
          <button type="button" aria-label={isCurrentTrack && isPlaying ? `Tạm dừng ${song.title}` : `Phát ${song.title}`} onClick={onPlay} className={`absolute inset-0 grid place-items-center bg-black/45 text-white ${isCurrentTrack ? 'opacity-100' : 'opacity-0 group-hover/cover:opacity-100 group-focus-within/cover:opacity-100'}`}>
            {isCurrentTrack && isPlaying ? <span className={`${styles.equalizer} ${styles.equalizerOnCover}`}><span className={styles.equalizerBar} /><span className={styles.equalizerBar} /><span className={styles.equalizerBar} /></span> : <PlayGlyph className="ml-0.5 size-4" />}
          </button>
        </div>
        <Link href={songPath(song)} onClick={() => recordRecentItem(recentSongItem(song))} className={`truncate text-[14px] font-bold transition-colors hover:text-[#00d3e5] ${isCurrentTrack ? 'text-[#00d3e5]' : 'text-white'}`}>{song.title}</Link>
      </div>
      <ArtistNames artists={artists} className="hidden truncate text-[13px] text-white/65 sm:block" />
      <span className="text-right text-[13px] text-white/75">{formatDuration(song.duration_seconds)}</span>
      <button type="button" aria-label={`Chia sẻ ${song.title}`} onClick={onShare} className={`${styles.rowMore} grid size-7 place-items-center rounded-full text-white/75 outline-none hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-[#00d3e5]`}><MoreHorizontalIcon /></button>
    </li>
  );
}

function AlbumCard({ album }: { album: AlbumRecord }) {
  const href = `/album/${encodeURIComponent(album.slug || album.id)}`;

  return (
    <article className="min-w-0">
      <Link href={href} aria-label={`Xem album ${album.title}`} onClick={() => recordRecentItem(recentAlbumItem(album))} className="group block">
        <div role="img" aria-label={`Ảnh bìa ${album.title}`} className="aspect-square w-full overflow-hidden rounded-lg bg-cover bg-center transition-transform duration-300 group-hover:scale-[1.02]" style={{ backgroundImage: `url("${album.cover_url || fallbackCover}")` }} />
        <h3 className="mt-3 truncate text-[14px] font-bold text-white">{album.title}</h3>
      </Link>
      <p className="mt-1 truncate text-[13px] text-white/65">{album.artist?.name || 'Album'}</p>
    </article>
  );
}

function PlaylistCard({ playlist }: { playlist: Playlist }) {
  const href = `/playlist/${encodeURIComponent(playlist.slug || playlist.id)}`;
  const artistNames = playlist.artists ?? [];

  return (
    <article className="min-w-0">
      <Link href={href} aria-label={`Xem playlist ${playlist.name}`} onClick={() => recordRecentItem(recentPlaylistItem(playlist))} className="group block">
        <div role="img" aria-label={`Ảnh bìa ${playlist.name}`} className="aspect-square w-full overflow-hidden rounded-lg bg-cover bg-center transition-transform duration-300 group-hover:scale-[1.02]" style={{ backgroundImage: `url("${playlist.cover_url || fallbackCover}")` }} />
        <h3 className="mt-3 truncate text-[14px] font-bold text-white">{playlist.name}</h3>
      </Link>
      {artistNames.length > 0 ? <ArtistNames artists={artistNames} className="mt-1 block truncate text-[13px] text-white/65" /> : <p className="mt-1 truncate text-[13px] text-white/65">{playlist.type_custom || playlist.type || 'Playlist'}</p>}
    </article>
  );
}

function VideoCard({ video }: { video: SongVideo }) {
  const card = (
    <div className="group block min-w-0">
      <div className="relative aspect-video overflow-hidden rounded-lg bg-[#30443f]">
        <div role="img" aria-label={`Ảnh video ${video.title}`} className="size-full bg-cover bg-center transition-transform duration-300 group-hover:scale-[1.02]" style={{ backgroundImage: `url("${video.thumbnail_url || fallbackCover}")` }} />
        {video.duration_seconds !== null && video.duration_seconds !== undefined ? <span className="absolute bottom-2 right-2 rounded bg-black/85 px-1.5 py-0.5 text-[11px] font-bold text-white">{formatDuration(video.duration_seconds)}</span> : null}
        {video.watch_url || video.video_url ? <span className="absolute inset-0 grid place-items-center bg-black/0 text-white opacity-0 transition group-hover:bg-black/35 group-hover:opacity-100"><span className="grid size-11 place-items-center rounded-full bg-[#00cfe3] text-[#07363a]"><PlayGlyph className="ml-0.5 size-4" /></span></span> : null}
      </div>
      <h3 className="mt-3 truncate text-[14px] font-bold text-white">{video.title}</h3>
    </div>
  );

  return video.watch_url || video.video_url ? <a href={video.watch_url || video.video_url || '#'} target="_blank" rel="noreferrer" onClick={() => recordRecentItem(recentVideoItem(video))} aria-label={`Xem video ${video.title}`}>{card}</a> : card;
}

function ArtistBioCard({ artist, onViewMore }: { artist: ArtistDetail; onViewMore: () => void }) {
  if (!artist.bio?.trim()) return null;
  const realName = artist.real_name || artist.name;

  return (
    <section className="rounded-lg bg-[#272727] p-5 sm:p-6" aria-labelledby="artist-bio-heading">
      <div className="grid gap-6 sm:grid-cols-[300px_minmax(0,1fr)] sm:items-center">
        <div role="img" aria-label={`Ảnh giới thiệu ${artist.name}`} className="aspect-square w-full rounded-lg bg-cover bg-center" style={{ backgroundImage: `url("${artist.avatar_url || fallbackCover}")`, backgroundPosition: 'center 18%' }} />
        <div className="min-w-0">
          <h2 id="artist-bio-heading" className="text-[26px] font-bold text-white">{artist.name}</h2>
          <p className="mt-5 text-[14px] font-semibold leading-6 text-white">Họ và tên: {realName}</p>
          <p className="mt-1 text-[14px] font-semibold leading-6 text-white">Nghệ sĩ Việt Nam</p>
          <p className="mt-5 max-h-24 overflow-hidden text-[14px] font-semibold leading-6 text-white/90">{artist.bio}</p>
          <button type="button" onClick={onViewMore} className="mt-3 inline-flex items-center gap-3 text-[14px] text-white/75 transition-colors hover:text-white">Xem thêm <ChevronIcon /></button>
        </div>
      </div>
    </section>
  );
}

function ArtistBioModal({ artist, onClose }: { artist: ArtistDetail; onClose: () => void }) {
  const realName = artist.real_name || artist.name;

  return (
    <div role="presentation" className="fixed inset-0 z-[80] grid place-items-center bg-black/70 px-4 py-6 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="artist-bio-modal-heading" className="relative max-h-[90vh] w-full max-w-[650px] overflow-y-auto rounded-xl bg-[#242424] p-6 text-white shadow-2xl sm:p-8">
        <button type="button" aria-label="Đóng thông tin nghệ sĩ" onClick={onClose} className="absolute right-5 top-5 text-white transition-colors hover:text-[#00d3e5]"><CloseIcon /></button>
        <div className="grid gap-6 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-start">
          <div role="img" aria-label={`Ảnh nghệ sĩ ${artist.name}`} className="aspect-square w-full rounded-lg bg-cover bg-center" style={{ backgroundImage: `url("${artist.avatar_url || fallbackCover}")`, backgroundPosition: 'center 18%' }} />
          <div className="min-w-0 pt-2">
            <h2 id="artist-bio-modal-heading" className="text-[26px] font-bold">{artist.name}</h2>
            <p className="mt-4 font-semibold">Họ và tên: {realName}</p>
            <p className="mt-1 font-semibold">Quốc tịch: Việt Nam</p>
          </div>
        </div>
        <p className="mt-7 whitespace-pre-line text-[14px] font-semibold leading-6 text-white/90">{artist.bio}</p>
      </div>
    </div>
  );
}

export default function ArtistDetailPage({ slug }: { slug: string }) {
  const router = useRouter();
  const { track, isPlaying, playSong, togglePlay } = usePlayer();
  const artistHeroRef = useRef<HTMLElement | null>(null);
  const [request, setRequest] = useState({ slug: '', artist: null as ArtistDetail | null, isLoading: true, error: '' });
  const [isFollowing, setIsFollowing] = useState(false);
  const [isBioOpen, setIsBioOpen] = useState(false);
  const [showCompactSongsHeader, setShowCompactSongsHeader] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getArtist(slug)
      .then((response) => {
        const artist = response.data;

        // Keep old ID-based links working, but replace them with the canonical slug URL.
        if (!cancelled && artist.slug && artist.slug !== slug) {
          router.replace(`/artist/${encodeURIComponent(artist.slug)}`);
          return;
        }

        if (!cancelled) {
          setRequest({ slug, artist, isLoading: false, error: '' });
          setIsFollowing(false);
          setIsBioOpen(false);
        }
      })
      .catch(() => {
        if (!cancelled) setRequest({ slug, artist: null, isLoading: false, error: 'Không thể tải thông tin nghệ sĩ lúc này.' });
      });

    return () => { cancelled = true; };
  }, [slug, router]);

  useEffect(() => {
    if (!isBioOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [isBioOpen]);

  const artist = request.slug === slug ? request.artist : null;
  const isLoading = request.slug !== slug || request.isLoading;

  useEffect(() => {
    const hero = artistHeroRef.current;
    if (!hero) return;

    const observer = new IntersectionObserver(([entry]) => {
      setShowCompactSongsHeader(!entry.isIntersecting);
    }, { rootMargin: '-80px 0px 0px 0px', threshold: 0 });

    observer.observe(hero);
    return () => observer.disconnect();
  }, [artist]);

  if (isLoading) {
    return <main className="min-h-[calc(100vh-80px)] bg-[#202a28] px-5 pb-20 pt-7 sm:px-8 lg:px-7"><div className="h-[420px] animate-pulse rounded-2xl bg-[#30443f]" /></main>;
  }

  if (request.error || !artist) {
    return (
      <main className="min-h-[calc(100vh-80px)] bg-[#202a28] px-5 pb-20 pt-7 text-white sm:px-8 lg:px-7">
        <Link href="/home" className="text-sm text-white/70 transition-colors hover:text-white">← Quay lại khám phá</Link>
        <p role="alert" className="mt-8 rounded-lg bg-[#30443f] px-4 py-3 text-sm text-white/75">{request.error || 'Không tìm thấy nghệ sĩ.'}</p>
      </main>
    );
  }

  const songs = artist.songs ?? artist.featured_songs ?? [];
  const albums = artist.albums ?? [];
  const playlists = artist.playlists ?? [];
  const videos = artist.videos ?? [];
  const artistIsPlaying = Boolean(track && isPlaying && songs.some((song) => song.id === track.id));
  const artistHasCurrentTrack = Boolean(track && songs.some((song) => song.id === track.id));
  const followerCount = (artist.followers_count ?? 0) + (isFollowing ? 1 : 0);
  const backgroundImage = artist.avatar_url || fallbackCover;

  const handlePlayAll = () => {
    if (songs.length === 0) return;
    if (artistHasCurrentTrack) {
      togglePlay();
      return;
    }

    playSong(songs[0], songs);
  };

  const handlePlaySong = (song: Song) => {
    if (track?.id === song.id) {
      togglePlay();
      return;
    }

    playSong(song, songs);
  };

  const handleShareSong = async (song: Song) => {
    const url = new URL(songPath(song), window.location.origin).toString();
    try {
      if (navigator.share) await navigator.share({ title: song.title, url });
      else await navigator.clipboard.writeText(url);
      await recordSongShare(song.id, 'web', getVisitorId());
    } catch {
      // Sharing can be dismissed by the user; keep the list interaction quiet.
    }
  };

  return (
    <>
      {showCompactSongsHeader ? (
        <div className="fixed inset-x-0 top-[80px] z-20 h-[60px] border-b border-white/10 bg-[#ffffff3d] px-5 py-2 shadow-[0_12px_30px_rgba(0,0,0,0.25)] backdrop-blur-md sm:px-8 lg:left-[248px] lg:px-7">
          <div className="mx-auto flex max-w-[1582px] items-center gap-4">
            <button type="button" aria-label={`Phát tất cả bài hát của ${artist.name}`} onClick={handlePlayAll} disabled={songs.length === 0} className="grid size-10 shrink-0 place-items-center rounded-full bg-[#00cfe3] text-[#07363a] transition-colors hover:bg-[#34dbea] disabled:cursor-not-allowed disabled:opacity-50">{artistIsPlaying ? <PauseIcon /> : <PlayGlyph className="ml-0.5 size-4" />}</button>
            <h2 className="truncate text-[22px] font-bold text-white sm:text-[25px]">Bài hát của {artist.name}</h2>
          </div>
        </div>
      ) : null}

      <main className="min-h-[calc(100vh-80px)] overflow-x-hidden bg-[#121616] pb-20 text-white">
      <section ref={artistHeroRef} className="relative -mx-5 overflow-hidden sm:-mx-8 lg:-mx-7" aria-labelledby="artist-title">
        <div aria-hidden="true" className="absolute inset-0 bg-cover opacity-60 blur-[1px]" style={{ backgroundImage: `url("${backgroundImage}")`, backgroundPosition: 'center 18%' }} />
        <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgba(24,48,44,0.12)_0%,rgba(18,22,22,0.42)_58%,#121616_100%)]" />
        <div className="relative mx-auto flex min-h-[370px] w-full max-w-[1582px] items-end gap-5 px-5 pb-8 pt-14 sm:gap-7 sm:px-8 lg:px-7">
          <div role="img" aria-label={`Ảnh nghệ sĩ ${artist.name}`} className="size-36 shrink-0 rounded-full border border-white/45 bg-cover shadow-[0_14px_40px_rgba(0,0,0,0.32)] sm:size-44" style={{ backgroundImage: `url("${backgroundImage}")`, backgroundPosition: 'center 18%' }} />
          <div className="min-w-0 pb-1">
            <h1 id="artist-title" className="truncate text-[34px] font-bold leading-tight text-white sm:text-[44px]">{artist.name}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-[14px] font-bold text-white">
              <span>{formatCount(followerCount)} người theo dõi</span>
              <button type="button" aria-pressed={isFollowing} onClick={() => setIsFollowing((value) => !value)} className="h-9 rounded-full border border-white/75 px-5 text-[13px] font-bold text-white transition-colors hover:border-[#00d3e5] hover:text-[#00d3e5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00d3e5]">{isFollowing ? 'Đang theo dõi' : 'Theo dõi'}</button>
            </div>
            <button type="button" onClick={handlePlayAll} disabled={songs.length === 0} className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-[#00cfe3] px-6 text-[14px] font-bold text-[#07363a] transition-colors hover:bg-[#34dbea] disabled:cursor-not-allowed disabled:opacity-50">
              {artistIsPlaying ? <PauseIcon /> : <PlayGlyph className="ml-0.5 size-4" />}
              {artistIsPlaying ? 'Tạm dừng' : 'Phát tất cả'}
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1582px] px-5 pt-8 sm:px-8 lg:px-7" aria-label={`Bài hát của ${artist.name}`}>
        <h2 className="mb-4 text-[26px] font-bold text-white sm:text-[30px]">Bài hát</h2>
        <div className="grid grid-cols-[32px_minmax(0,1fr)_56px_28px] gap-3 border-b border-white/10 px-2 pb-3 text-[13px] font-bold text-white/60 sm:grid-cols-[40px_minmax(0,1.15fr)_minmax(180px,1fr)_64px_32px] sm:gap-4">
          <span>#</span>
          <span>Tiêu đề</span>
          <span className="hidden sm:block">Nghệ sĩ</span>
          <span className="justify-self-end"><ClockIcon /></span>
          <span aria-hidden="true" />
        </div>
        {songs.length > 0 ? (
          <ol className="mt-2 space-y-0.5">
            {songs.map((song, index) => <ArtistSongRow key={song.id} song={song} index={index} artist={artist} onPlay={() => handlePlaySong(song)} onShare={() => void handleShareSong(song)} isCurrentTrack={track?.id === song.id} isPlaying={isPlaying && track?.id === song.id} />)}
          </ol>
        ) : (
          <p className="mt-8 rounded-lg bg-[#30443f] px-4 py-5 text-sm text-white/70">Nghệ sĩ chưa có bài hát nào.</p>
        )}
      </section>

      <section className="mx-auto w-full max-w-[1582px] px-5 pt-12 sm:px-8 lg:px-7" aria-labelledby="artist-albums-heading">
        <SectionHeading title="Album" href="/album" />
        {albums.length > 0 ? <div id="artist-albums-heading" className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-4 lg:grid-cols-7 lg:gap-x-6">{albums.map((album) => <AlbumCard key={album.id} album={album} />)}</div> : <p className="rounded-lg bg-[#202a28] px-4 py-5 text-sm text-white/60">Nghệ sĩ chưa có album nào.</p>}
      </section>

      <section className="mx-auto w-full max-w-[1582px] px-5 pt-12 sm:px-8 lg:px-7" aria-labelledby="artist-playlists-heading">
        <SectionHeading title="Playlist" href="/playlist" />
        {playlists.length > 0 ? <div id="artist-playlists-heading" className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-4 lg:grid-cols-7 lg:gap-x-6">{playlists.map((playlist) => <PlaylistCard key={playlist.id} playlist={playlist} />)}</div> : <p className="rounded-lg bg-[#202a28] px-4 py-5 text-sm text-white/60">Nghệ sĩ chưa có playlist nào.</p>}
      </section>

      <section className="mx-auto w-full max-w-[1582px] px-5 pt-12 sm:px-8 lg:px-7" aria-labelledby="artist-videos-heading">
        <SectionHeading title="Video" />
        {videos.length > 0 ? <div id="artist-videos-heading" className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">{videos.map((video) => <VideoCard key={video.id} video={video} />)}</div> : <p className="rounded-lg bg-[#202a28] px-4 py-5 text-sm text-white/60">Nghệ sĩ chưa có video nào.</p>}
      </section>

      <section className="mx-auto w-full max-w-[1582px] px-5 pt-12 sm:px-8 lg:px-7">
        <ArtistBioCard artist={artist} onViewMore={() => setIsBioOpen(true)} />
      </section>

      {isBioOpen ? <ArtistBioModal artist={artist} onClose={() => setIsBioOpen(false)} /> : null}
      </main>
      <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 bottom-0 z-40 h-[100px] bg-[#121616]" />
    </>
  );
}
