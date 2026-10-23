'use client';
import FollowButton from '@/components/follow/FollowButton';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { usePlayerControls } from '@/components/player';
import { PlayGlyph } from '@/components/icons/PlayGlyph';
import { getAlbum, getVisitorId, recordAlbumShare, toggleAlbumFavorite, type AlbumDetail, type Song, type SongArtistCredit } from '@/lib/api';

import styles from './AlbumDetailPage.module.css';
import { ArtistLink, ArtistNames } from '@/components/artists';
import { SongRowActionMenu } from '@/components/songs/SongRowActionMenu';
import { AddSongsToPlaylistDialog } from '@/components/playlists/AddSongsToPlaylistDialog';
import { recentSongItem, recordRecentItem, songPath } from '@/lib/recent-history';
import { downloadSongFiles, setSongFavorites } from '@/lib/song-actions';

const fallbackCover = '/images/cover-placeholder.svg';

function HeartIcon({ filled }: { filled: boolean }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className={`size-6 fill-current ${filled ? 'text-[#ff3b66]' : 'text-white'}`}><path d="M12 21.1 3.4 12.7a5.8 5.8 0 0 1 8.2-8.2l.4.4.4-.4a5.8 5.8 0 0 1 8.2 8.2L12 21.1Z" /></svg>;
}

function ShareIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 fill-current"><path d="M14 3 23 11l-9 8v-5C8.2 14 4.4 15.5 1 21c.7-8 4.3-12.1 13-12.8V3Z" /></svg>;
}

function DownloadIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-none stroke-current stroke-[1.8]"><path d="M12 3v11m0 0 4-4m-4 4-4-4M4 20h16" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function PauseIcon() {
  return <span aria-hidden="true" className="flex gap-1"><span className="h-4 w-1.5 rounded-sm bg-current" /><span className="h-4 w-1.5 rounded-sm bg-current" /></span>;
}

function formatDuration(seconds: number | null | undefined) {
  if (seconds === null || seconds === undefined) return '--:--';

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = String(seconds % 60).padStart(2, '0');
  return `${String(minutes).padStart(2, '0')}:${remainingSeconds}`;
}

function songArtists(song: Song) {
  if (song.artists?.length) return song.artists;
  return song.artist ? [song.artist] : [];
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
      style={artist.avatar_url ? { backgroundImage: `url("${artist.avatar_url}")`, backgroundPosition: 'center 20%', backgroundSize: 'cover' } : undefined}
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
            {isCurrentTrack && isPlaying ? <span className={`${styles.equalizer} ${styles.equalizerOnCover}`}><span className={styles.equalizerBar} /><span className={styles.equalizerBar} /><span className={styles.equalizerBar} /></span> : <PlayGlyph className="ml-0.5 size-4" />}
          </button>
        </div>
        <Link href={songPath(song)} onClick={() => recordRecentItem(recentSongItem(song))} className={`truncate text-[14px] font-bold transition-colors hover:text-[#00d3e5] ${isCurrentTrack ? 'text-[#00d3e5]' : 'text-white'}`}>{song.title}</Link>
      </div>
      <ArtistNames artists={songArtists(song)} className="hidden truncate text-[13px] text-white/65 sm:block" />
      <span className="text-right text-[13px] text-white/75">{formatDuration(song.duration_seconds)}</span>
      <SongRowActionMenu song={song} buttonClassName="pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100" />
    </li>
  );
}

export default function AlbumDetailPage({ slug }: { slug: string }) {
  const { track, isPlaying, playSong, togglePlay } = usePlayerControls();
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
  const [isFavoritePending, setIsFavoritePending] = useState(false);
  const [isSharePending, setIsSharePending] = useState(false);
  const [isPlaylistDialogOpen, setIsPlaylistDialogOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getAlbum(slug, getVisitorId())
      .then((response) => {
        if (!cancelled) {
          setRequest({ slug, album: response.data, visibleCount: 30, isLoading: false, error: '' });
          setSelectedIds([]);
          setIsFavorite(Boolean(response.data.is_favorite));
          setFavoriteCount(response.data.favorite_count ?? 0);
          setShareCount(response.data.share_count ?? 0);
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
  const selectedSongs = album.songs.filter((song) => selectedIds.includes(song.id));
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

  const handleAddSelectedToFavorites = async () => {
    const results = await setSongFavorites(selectedSongs, true, getVisitorId());
    const addedCount = results.filter((result) => result.status === 'fulfilled').length;
    const failedCount = results.length - addedCount;
    setShareStatus(failedCount === 0
      ? `Đã thêm ${addedCount} bài vào Yêu thích.`
      : `Đã thêm ${addedCount} bài; ${failedCount} bài chưa cập nhật được.`);
  };

  const handleDownloadSelected = () => {
    downloadSongFiles(selectedSongs);
    setShareStatus(`Đang tải ${selectedSongs.length} bài đã chọn.`);
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

  const handleFavorite = async () => {
    if (isFavoritePending) return;
    setIsFavoritePending(true);
    setShareStatus('');
    try {
      const response = await toggleAlbumFavorite(album.id, getVisitorId());
      setIsFavorite(response.favorited);
      setFavoriteCount(response.favorites);
    } catch {
      setShareStatus('Không thể cập nhật lượt yêu thích album. Vui lòng thử lại.');
    } finally {
      setIsFavoritePending(false);
    }
  };

  const handleShare = async () => {
    if (isSharePending) return;
    const url = window.location.href;
    setIsSharePending(true);
    setShareStatus('');

    try {
      let source: 'web' | 'copy_link' = 'web';
      if (navigator.share) {
        await navigator.share({ title: album.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        source = 'copy_link';
      }
      const response = await recordAlbumShare(album.id, source, getVisitorId());
      setShareCount(response.shares);
      setShareStatus(source === 'web' ? 'Đã chia sẻ album.' : 'Đã sao chép đường dẫn album.');
    } catch {
      setShareStatus('Không thể chia sẻ album. Vui lòng thử lại.');
    } finally {
      setIsSharePending(false);
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
        <section className="grid gap-6 lg:grid-cols-[248px_minmax(0,1fr)] lg:items-stretch">
          <div role="img" aria-label={`Ảnh bìa ${album.title}`} className="aspect-square w-full max-w-[248px] rounded-[8px] bg-cover bg-center" style={{ backgroundImage: `url("${coverUrl}")` }} />

          <div className="flex min-w-0 flex-col lg:h-[248px]">
            <p className="text-[13px] text-white/55">Album&nbsp; · &nbsp;{releaseYear}&nbsp; · &nbsp;{album.songs.length} Bài hát</p>
            <h1 className="mt-4 truncate text-[30px] font-bold leading-tight text-white sm:text-[34px]">{album.title}</h1>
            {album.artist ? (
              <ArtistLink artist={album.artist} className="mt-5 flex min-w-0 items-center gap-2 text-[14px] font-bold text-white">
                <div role="img" aria-label={`Ảnh đại diện ${album.artist.name}`} className="size-7 shrink-0 rounded-full bg-cover" style={album.artist.avatar_url ? { backgroundImage: `url("${album.artist.avatar_url}")`, backgroundPosition: 'center 20%' } : undefined}>
                  {!album.artist.avatar_url ? <span className="grid size-full place-items-center rounded-full bg-[#60756f] text-xs">{album.artist.name.charAt(0).toUpperCase()}</span> : null}
                </div>
                <span className="truncate">{album.artist.name}</span>
              </ArtistLink>
            ) : null}

            <div className="mt-auto">
              <div className="flex items-start gap-3">
                <button type="button" aria-label={isFavorite ? 'Bỏ yêu thích album' : 'Thêm album vào yêu thích'} aria-pressed={isFavorite} disabled={isFavoritePending} onClick={() => void handleFavorite()} className="flex min-w-8 flex-col items-center gap-1 text-white outline-none focus-visible:ring-2 focus-visible:ring-[#00d3e5] disabled:cursor-wait disabled:opacity-60">
                  <span className="grid size-8 place-items-center"><HeartIcon filled={isFavorite} /></span>
                  <span className="text-[11px] font-bold text-white">{favoriteCount}</span>
                </button>
                <button type="button" aria-label="Chia sẻ album" disabled={isSharePending} onClick={() => void handleShare()} className="flex min-w-8 flex-col items-center gap-1 text-white outline-none focus-visible:ring-2 focus-visible:ring-[#00d3e5] disabled:cursor-wait disabled:opacity-60">
                  <span className="grid size-8 place-items-center text-white"><ShareIcon /></span>
                  <span className="text-[11px] font-bold text-white">{shareCount}</span>
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
                  {albumIsPlaying ? <PauseIcon /> : <PlayGlyph className="ml-0.5 size-4" />}
                  {albumIsPlaying ? 'Tạm dừng' : 'Phát tất cả'}
                </button>
                <button type="button" onClick={() => downloadSongFiles(album.songs)} disabled={album.songs.length === 0} className="inline-flex h-10 items-center gap-2 rounded-full bg-[#3c4140] px-7 text-[14px] font-bold text-white transition-colors hover:bg-[#4a504e] disabled:cursor-not-allowed disabled:opacity-50">
                  <DownloadIcon />
                  Tải về
                </button>
              </div>
            </div>
            <span className="sr-only" aria-live="polite">{shareStatus}</span>
          </div>
        </section>

        <section aria-labelledby="album-songs-heading" className="mt-10">
          <h2 id="album-songs-heading" className="sr-only">Danh sách bài hát trong album</h2>
          {selectedIds.length > 0 ? (
            <div className="mb-3 flex min-h-8 flex-wrap items-center gap-2">
              <SelectionCheckbox checked={allSongsSelected} label="Chọn tất cả bài hát" onChange={toggleAllSongs} />
              <button type="button" onClick={() => setIsPlaylistDialogOpen(true)} className="inline-flex h-8 items-center gap-2 rounded-full border border-white/45 px-3 text-[12px] font-bold text-white transition-colors hover:border-white hover:bg-white/10"><span aria-hidden="true">☷</span>Thêm vào playlist</button>
              <button type="button" onClick={() => void handleAddSelectedToFavorites()} className="inline-flex h-8 items-center gap-2 rounded-full border border-white/45 px-3 text-[12px] font-bold text-white transition-colors hover:border-white hover:bg-white/10"><span aria-hidden="true">♡</span>Thêm vào Yêu thích</button>
              <button type="button" onClick={handleDownloadSelected} className="inline-flex h-8 items-center gap-2 rounded-full border border-white/45 px-3 text-[12px] font-bold text-white transition-colors hover:border-white hover:bg-white/10"><DownloadIcon />Tải về</button>
            </div>
          ) : (
            <div className="grid grid-cols-[32px_minmax(0,1fr)_56px_28px] gap-3 border-b border-white/10 px-2 pb-3 text-[13px] font-bold text-white/60 sm:grid-cols-[40px_minmax(0,1fr)_minmax(180px,0.8fr)_64px_32px] sm:gap-4">
              <span>#</span>
              <span>Tiêu đề</span>
              <span className="hidden sm:block">Nghệ sĩ</span>
              <span className="grid size-5 place-items-center justify-self-end text-[18px] leading-none">◷</span>
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

        <AddSongsToPlaylistDialog songs={selectedSongs} open={isPlaylistDialogOpen} onClose={() => setIsPlaylistDialogOpen(false)} onAdded={setShareStatus} />

        {collaborators.length > 0 ? (
          <section aria-labelledby="album-collaborators-heading" className="mt-14">
            <h2 id="album-collaborators-heading" className="text-[24px] font-bold text-white">Kết hợp từ các nghệ sĩ</h2>
            <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-7">
              {collaborators.map((artist) => (
                <article key={artist.id || artist.name} className="min-w-0 text-center">
                  <ArtistLink artist={artist} className="block">
                  <ArtistAvatar artist={artist} />
                  <h3 className="mt-3 truncate text-[14px] font-bold text-white">{artist.name}</h3>
                  </ArtistLink>
                  {artist.id && <FollowButton id={artist.id} className="mt-2" />}
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
