'use client';

import { Lexend } from 'next/font/google';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { usePlayer } from '@/components/player';
import { getAlbum, type AlbumDetail, type Song, type SongArtistCredit } from '@/lib/api';

import styles from './AlbumDetailPage.module.css';

const lexend = Lexend({ subsets: ['latin', 'vietnamese'], weight: '700' });
const fallbackCover = '/topics/genre/vpop_600.png';

function HeartIcon({ filled, solid = false }: { filled: boolean; solid?: boolean }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className={`size-6 ${solid ? 'fill-white stroke-white' : filled ? 'fill-[#ff6f91] stroke-[#ff6f91]' : 'fill-none stroke-current'} stroke-[1.8]`}><path d="M12 20.2 3.8 12A5.2 5.2 0 0 1 11.15 4.65L12 5.5l.85-.85A5.2 5.2 0 0 1 20.2 12L12 20.2Z" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function ShareIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 fill-none stroke-current stroke-[1.8]"><path d="m5 12 14-8-4 16-4-6-6-2Zm6 2 8-10" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function DownloadIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-none stroke-current stroke-[1.8]"><path d="M12 3v11m0 0 4-4m-4 4-4-4M4 20h16" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function PlayIcon() {
  return <span aria-hidden="true" className="ml-0.5 border-y-[7px] border-l-[10px] border-y-transparent border-l-current" />;
}

function PauseIcon() {
  return <span aria-hidden="true" className="flex gap-1"><span className="h-4 w-1.5 rounded-sm bg-current" /><span className="h-4 w-1.5 rounded-sm bg-current" /></span>;
}

function MoreHorizontalIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-current"><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></svg>;
}

function formatDuration(seconds: number | null | undefined) {
  if (seconds === null || seconds === undefined) return '--:--';

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = String(seconds % 60).padStart(2, '0');
  return `${String(minutes).padStart(2, '0')}:${remainingSeconds}`;
}

function songArtists(song: Song) {
  const artists = song.artists?.map((artist) => artist.name).filter(Boolean) ?? [];

  if (artists.length > 0) return artists.join(', ');
  return song.artist?.name || 'Nghệ sĩ chưa cập nhật';
}

function collectCollaborators(album: AlbumDetail): SongArtistCredit[] {
  const primaryId = album.artist?.id;
  const primaryName = album.artist?.name;
  const artists = new Map<string, SongArtistCredit>();

  album.songs.forEach((song) => {
    const credits: SongArtistCredit[] = song.artists?.length
      ? song.artists
      : song.artist
        ? [song.artist]
        : [];

    credits.forEach((artist) => {
      if (artist.id === primaryId || artist.name === primaryName) return;

      const key = artist.id || artist.name;
      if (!artists.has(key)) artists.set(key, artist);
    });
  });

  return Array.from(artists.values());
}

function ArtistAvatar({ artist }: { artist: SongArtistCredit }) {
  return (
    <div
      role="img"
      aria-label={`Ảnh đại diện ${artist.name}`}
      className="grid aspect-square w-full place-items-center overflow-hidden rounded-full bg-[#565657] text-3xl font-bold text-white/75"
      style={artist.avatar_url ? { backgroundImage: `url("${artist.avatar_url}")`, backgroundPosition: 'center', backgroundSize: 'cover' } : undefined}
    >
      {!artist.avatar_url ? artist.name.trim().charAt(0).toUpperCase() : null}
    </div>
  );
}

function SelectionCheckbox({ checked, label, onChange }: { checked: boolean; label: string; onChange: () => void }) {
  return (
    <label className="grid size-6 shrink-0 cursor-pointer place-items-center">
      <input type="checkbox" checked={checked} onChange={onChange} aria-label={label} className="peer sr-only" />
      <span className="grid size-5 place-items-center rounded-[4px] border border-white/45 text-[13px] font-bold text-transparent transition-colors peer-checked:border-white peer-checked:bg-white peer-checked:text-[#202020]">✓</span>
    </label>
  );
}

function AlbumSongRow({ song, index, coverUrl, checked, onToggle, onPlay, isCurrentTrack, isPlaying }: { song: Song; index: number; coverUrl: string; checked: boolean; onToggle: () => void; onPlay: () => void; isCurrentTrack: boolean; isPlaying: boolean }) {
  const imageUrl = song.cover_url || coverUrl;
  const checkboxVisibility = checked
    ? 'opacity-100'
    : isCurrentTrack
      ? 'pointer-events-none opacity-0'
      : 'pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100';
  const indexVisibility = checked ? 'hidden' : 'group-hover:hidden';

  return (
    <li className={`${styles.songRow} group grid grid-cols-[32px_minmax(0,1fr)_56px_28px] items-center gap-3 rounded-lg px-2 py-2.5 sm:grid-cols-[40px_minmax(0,1fr)_minmax(180px,0.8fr)_64px_32px] sm:gap-4`}>
      <div className="relative grid size-6 place-items-center">
        <span className={`text-[13px] text-white/70 ${indexVisibility}`}>{index + 1}</span>
        <div className={`absolute inset-0 grid place-items-center ${checkboxVisibility}`}>
          <SelectionCheckbox checked={checked} label={`Chọn bài ${song.title}`} onChange={onToggle} />
        </div>
      </div>
      <div className="flex min-w-0 items-center gap-3">
        <div className="group/cover relative size-11 shrink-0 overflow-hidden rounded-[4px]">
          <div role="img" aria-label={`Ảnh bìa ${song.title}`} className="size-full bg-cover bg-center" style={{ backgroundImage: `url("${imageUrl}")` }} />
          <button type="button" aria-label={isCurrentTrack && isPlaying ? `Tạm dừng ${song.title}` : `Phát ${song.title}`} onClick={onPlay} className={`absolute inset-0 grid place-items-center bg-black/45 text-white ${isCurrentTrack ? 'opacity-100' : 'opacity-0 group-hover/cover:opacity-100 group-focus-within/cover:opacity-100'}`}>
            {isCurrentTrack && isPlaying ? <span className={`${styles.equalizer} ${styles.equalizerOnCover}`}><span className={styles.equalizerBar} /><span className={styles.equalizerBar} /><span className={styles.equalizerBar} /></span> : <PlayIcon />}
          </button>
        </div>
        <span className={`truncate text-[14px] font-bold ${isCurrentTrack ? 'text-[#00d3e5]' : 'text-white'}`}>{song.title}</span>
      </div>
      <span className="hidden truncate text-[13px] text-white/65 sm:block">{songArtists(song)}</span>
      <span className="text-right text-[13px] text-white/75">{formatDuration(song.duration_seconds)}</span>
      <button type="button" aria-label={`Tùy chọn bài ${song.title}`} className={`${styles.rowMore} grid size-7 place-items-center rounded-full text-white/75 outline-none hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-[#00d3e5]`}><MoreHorizontalIcon /></button>
    </li>
  );
}

export default function AlbumDetailPage({ slug }: { slug: string }) {
  const { track, isPlaying, playSong, togglePlay } = usePlayer();
  const [request, setRequest] = useState({
    slug: '',
    album: null as AlbumDetail | null,
    visibleCount: 30,
    isLoading: true,
    error: '',
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [shareCount, setShareCount] = useState(0);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [shareStatus, setShareStatus] = useState('');

  useEffect(() => {
    let cancelled = false;

    getAlbum(slug)
      .then((response) => {
        if (!cancelled) {
          setRequest({ slug, album: response.data, visibleCount: 30, isLoading: false, error: '' });
          setSelectedIds([]);
          setIsFavorite(false);
          setFavoriteCount(response.data.songs[0]?.favorite_count ?? 0);
          setShareCount(response.data.songs[0]?.share_count ?? 0);
          setIsMoreOpen(false);
        }
      })
      .catch(() => {
        if (!cancelled) setRequest({ slug, album: null, visibleCount: 30, isLoading: false, error: 'Không thể tải album lúc này.' });
      });

    return () => { cancelled = true; };
  }, [slug]);

  const isCurrentRequest = request.slug === slug;
  const album = isCurrentRequest ? request.album : null;
  const isLoading = !isCurrentRequest || request.isLoading;
  const error = isCurrentRequest ? request.error : '';
  const visibleCount = isCurrentRequest ? request.visibleCount : 30;
  const collaborators = useMemo(() => (album ? collectCollaborators(album) : []), [album]);

  if (isLoading) {
    return <main className="min-h-[calc(100vh-80px)] bg-[#202a28] px-5 pb-20 pt-7 sm:px-8 lg:px-7"><div className="h-[270px] animate-pulse rounded-2xl bg-[#30443f]" /></main>;
  }

  if (error || !album) {
    return (
      <main className="min-h-[calc(100vh-80px)] bg-[#202a28] px-5 pb-20 pt-7 text-white sm:px-8 lg:px-7">
        <Link href="/album" className="text-sm text-white/70 transition-colors hover:text-white">← Quay lại album</Link>
        <p role="alert" className="mt-8 rounded-lg bg-[#30443f] px-4 py-3 text-sm text-white/75">{error || 'Không tìm thấy album.'}</p>
      </main>
    );
  }

  const coverUrl = album.cover_url || fallbackCover;
  const songs = album.songs.slice(0, visibleCount);
  const hasMoreSongs = visibleCount < album.songs.length;
  const releaseYear = album.release_date?.slice(0, 4) || '—';
  const allSongsSelected = album.songs.length > 0 && selectedIds.length === album.songs.length;
  const albumIsPlaying = Boolean(track && isPlaying && album.songs.some((song) => song.id === track.id));
  const albumHasCurrentTrack = Boolean(track && album.songs.some((song) => song.id === track.id));

  const toggleSong = (songId: string) => {
    setSelectedIds((current) => current.includes(songId) ? current.filter((id) => id !== songId) : [...current, songId]);
  };

  const toggleAllSongs = () => {
    setSelectedIds(allSongsSelected ? [] : album.songs.map((song) => song.id));
  };

  const handlePlayAll = () => {
    if (album.songs.length === 0) return;
    if (albumHasCurrentTrack) {
      togglePlay();
      return;
    }

    playSong(album.songs[0], album.songs);
  };

  const handlePlaySong = (song: Song) => {
    if (track?.id === song.id) {
      togglePlay();
      return;
    }

    playSong(song, album.songs);
  };

  const handleFavorite = () => {
    setIsFavorite((current) => {
      setFavoriteCount((count) => Math.max(0, count + (current ? -1 : 1)));
      return !current;
    });
  };

  const handleShare = async () => {
    const url = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({ title: album.title, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
      setShareCount((count) => count + 1);
      setShareStatus('Đã chia sẻ album.');
    } catch {
      setShareStatus('');
    }
    setIsMoreOpen(false);
  };

  const handleReport = () => {
    setShareStatus('Đã ghi nhận báo cáo.');
    setIsMoreOpen(false);
  };

  return (
    <main className="min-h-[calc(100vh-80px)] overflow-x-hidden bg-[#202a28] px-5 pb-20 pt-7 text-white sm:px-8 lg:px-7">
      <div className="w-full max-w-[1582px]">
        <section className="grid gap-6 lg:grid-cols-[248px_minmax(0,1fr)] lg:items-end">
          <div role="img" aria-label={`Ảnh bìa ${album.title}`} className="aspect-square w-full max-w-[248px] rounded-[8px] bg-cover bg-center" style={{ backgroundImage: `url("${coverUrl}")` }} />

          <div className="min-w-0">
            <p className="text-[13px] text-white/55">Album&nbsp; · &nbsp;{releaseYear}&nbsp; · &nbsp;{album.songs.length} Bài hát</p>
            <h1 className={`${lexend.className} mt-4 truncate text-[30px] font-bold leading-tight text-white sm:text-[34px]`}>{album.title}</h1>
            {album.artist ? (
              <div className="mt-5 flex items-center gap-2 text-[14px] font-bold text-white">
                <div role="img" aria-label={`Ảnh đại diện ${album.artist.name}`} className="size-7 rounded-full bg-cover bg-center" style={album.artist.avatar_url ? { backgroundImage: `url("${album.artist.avatar_url}")` } : undefined}>
                  {!album.artist.avatar_url ? <span className="grid size-full place-items-center rounded-full bg-[#60756f] text-xs">{album.artist.name.charAt(0).toUpperCase()}</span> : null}
                </div>
                <span className="truncate">{album.artist.name}</span>
              </div>
            ) : null}

            <div className="mt-7 flex items-start gap-3">
              <button type="button" aria-label={isFavorite ? 'Bỏ yêu thích album' : 'Thêm album vào yêu thích'} aria-pressed={isFavorite} onClick={handleFavorite} className="flex min-w-8 flex-col items-center gap-1 text-white outline-none transition-colors hover:text-[#ff6f91] focus-visible:ring-2 focus-visible:ring-[#00d3e5]">
                <span className="grid size-8 place-items-center text-white"><HeartIcon filled={isFavorite} solid /></span>
                <span className="text-[11px] font-bold">{favoriteCount}</span>
              </button>
              <button type="button" aria-label="Chia sẻ album" onClick={handleShare} className="flex min-w-8 flex-col items-center gap-1 text-white outline-none transition-colors hover:text-[#00d3e5] focus-visible:ring-2 focus-visible:ring-[#00d3e5]">
                <span className="grid size-8 place-items-center text-white"><ShareIcon /></span>
                <span className="text-[11px] font-bold">{shareCount}</span>
              </button>
              <div className="relative">
                <button type="button" aria-label="Thêm tùy chọn" aria-expanded={isMoreOpen} onClick={() => setIsMoreOpen((current) => !current)} className="grid size-8 place-items-center rounded-full bg-[#303c39] text-[13px] tracking-[0.08em] text-white outline-none transition-colors hover:bg-[#40504b] focus-visible:ring-2 focus-visible:ring-[#00d3e5]">•••</button>
                {isMoreOpen ? (
                  <div role="menu" className="absolute left-0 top-10 z-20 w-32 overflow-hidden rounded-lg bg-[#2b2b2b] p-1.5 text-[13px] font-bold text-white shadow-xl">
                    <button type="button" role="menuitem" onClick={handleShare} className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left hover:bg-white/10">Chia sẻ <span aria-hidden="true">›</span></button>
                    <button type="button" role="menuitem" onClick={handleReport} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left hover:bg-white/10"><span aria-hidden="true">⚑</span>Báo cáo</button>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-4">
              <button type="button" onClick={handlePlayAll} className="inline-flex h-10 items-center gap-2 rounded-full bg-[#00cfe3] px-6 text-[14px] font-bold text-[#07363a] transition-colors hover:bg-[#34dbea]">
                {albumIsPlaying ? <PauseIcon /> : <PlayIcon />}
                {albumIsPlaying ? 'Tạm dừng' : 'Phát tất cả'}
              </button>
              <button type="button" className="inline-flex h-10 items-center gap-2 rounded-full bg-[#3c4140] px-7 text-[14px] font-bold text-white transition-colors hover:bg-[#4a504e]">
                <DownloadIcon />
                Tải về
              </button>
            </div>
            <span className="sr-only" aria-live="polite">{shareStatus}</span>
          </div>
        </section>

        <section aria-labelledby="album-songs-heading" className="mt-10">
          <h2 id="album-songs-heading" className="sr-only">Danh sách bài hát trong album</h2>
          {selectedIds.length > 0 ? (
            <div className="mb-3 flex min-h-8 flex-wrap items-center gap-2">
              <SelectionCheckbox checked={allSongsSelected} label="Chọn tất cả bài hát" onChange={toggleAllSongs} />
              <button type="button" className="inline-flex h-8 items-center gap-2 rounded-full border border-white/45 px-3 text-[12px] font-bold text-white transition-colors hover:border-white hover:bg-white/10"><span aria-hidden="true">☷</span>Thêm vào playlist</button>
              <button type="button" className="inline-flex h-8 items-center gap-2 rounded-full border border-white/45 px-3 text-[12px] font-bold text-white transition-colors hover:border-white hover:bg-white/10"><span aria-hidden="true">♡</span>Thêm vào Yêu thích</button>
              <button type="button" className="inline-flex h-8 items-center gap-2 rounded-full border border-white/45 px-3 text-[12px] font-bold text-white transition-colors hover:border-white hover:bg-white/10"><DownloadIcon />Tải về</button>
            </div>
          ) : (
            <div className="grid grid-cols-[32px_minmax(0,1fr)_56px_28px] gap-3 border-b border-white/10 px-2 pb-3 text-[13px] font-bold text-white/60 sm:grid-cols-[40px_minmax(0,1fr)_minmax(180px,0.8fr)_64px_32px] sm:gap-4">
              <span>#</span>
              <span>Tiêu đề</span>
              <span className="hidden sm:block">Nghệ sĩ</span>
              <span className="text-right">◷</span>
              <span aria-hidden="true" />
            </div>
          )}

          {songs.length > 0 ? (
            <ol className="mt-2 space-y-0.5">
              {songs.map((song, index) => <AlbumSongRow key={song.id} song={song} index={index} coverUrl={coverUrl} checked={selectedIds.includes(song.id)} onToggle={() => toggleSong(song.id)} onPlay={() => handlePlaySong(song)} isCurrentTrack={track?.id === song.id} isPlaying={isPlaying && track?.id === song.id} />)}
            </ol>
          ) : (
            <p className="mt-8 rounded-lg bg-[#30443f] px-4 py-5 text-sm text-white/70">Album chưa có bài hát.</p>
          )}

          {hasMoreSongs ? (
            <button type="button" onClick={() => setRequest((current) => ({ ...current, visibleCount: current.visibleCount + 30 }))} className="mt-5 inline-flex items-center gap-2 text-[14px] font-bold text-white transition-colors hover:text-[#00d3e5]">
              Xem thêm
              <span aria-hidden="true">⌄</span>
            </button>
          ) : null}
        </section>

        {collaborators.length > 0 ? (
          <section aria-labelledby="album-collaborators-heading" className="mt-14">
            <h2 id="album-collaborators-heading" className={`${lexend.className} text-[24px] font-bold text-white`}>Kết hợp từ các nghệ sĩ</h2>
            <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-7">
              {collaborators.map((artist) => (
                <article key={artist.id || artist.name} className="min-w-0 text-center">
                  <ArtistAvatar artist={artist} />
                  <h3 className="mt-3 truncate text-[14px] font-bold text-white">{artist.name}</h3>
                  <button type="button" className="mt-2 rounded-full border border-white/35 px-4 py-1.5 text-[12px] font-bold text-white transition-colors hover:border-white hover:bg-white/10">Theo dõi</button>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
