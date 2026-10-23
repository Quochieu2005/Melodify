'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { ArtistNames } from '@/components/artists';
import { PlayGlyph } from '@/components/icons/PlayGlyph';
import { usePlayerControls } from '@/components/player';
import { AddSongsToPlaylistDialog } from '@/components/playlists/AddSongsToPlaylistDialog';
import { SongRowActionMenu } from '@/components/songs/SongRowActionMenu';
import { downloadSongFiles } from '@/lib/song-actions';
import {
  AUTH_USER_STORAGE_KEY,
  getVisitorId,
  listFavoriteSongs,
  reorderFavoriteSongs,
  setSongFavorite,
  type AuthUser,
  type Song,
  type SongArtistCredit,
} from '@/lib/api';
import { recordRecentItem, recentSongItem, songPath } from '@/lib/recent-history';
import styles from '@/components/albums/AlbumDetailPage.module.css';

const fallbackCover = '/images/cover-placeholder.svg';

function DownloadIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-none stroke-current stroke-2"><path d="M12 4v11m0 0 4-4m-4 4-4-4M5 19h14" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function MoreIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-current"><circle cx="5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="19" cy="12" r="1.7" /></svg>;
}

function ShareIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 fill-current"><path d="M14 3 23 11l-9 8v-5C8.2 14 4.4 15.5 1 21c.7-8 4.3-12.1 13-12.8V3Z" /></svg>;
}

function HeartIcon({ tone = 'white' }: { tone?: 'white' | 'muted' }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className={`size-6 fill-current ${tone === 'muted' ? 'text-[#5a5a5a]' : 'text-white'}`}><path d="M12 21.1 3.4 12.7a5.8 5.8 0 0 1 8.2-8.2l.4.4.4-.4a5.8 5.8 0 0 1 8.2 8.2L12 21.1Z" /></svg>;
}

function PauseIcon() {
  return <span aria-hidden="true" className="flex gap-1"><span className="h-4 w-1.5 rounded-sm bg-current" /><span className="h-4 w-1.5 rounded-sm bg-current" /></span>;
}

function formatDuration(seconds: number | null | undefined) {
  if (seconds === null || seconds === undefined) return '--:--';
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function collectFavoriteArtists(songs: Song[]): SongArtistCredit[] {
  const artistsById = new Map<string, SongArtistCredit>();

  songs.forEach((song) => {
    const songArtists: SongArtistCredit[] = song.artists?.length
      ? song.artists
      : song.artist
        ? [song.artist]
        : [];

    songArtists.forEach((artist) => {
      const name = artist.name.trim();
      if (!name) return;

      const key = (artist.id || artist.slug || name).toLocaleLowerCase();
      if (!artistsById.has(key)) artistsById.set(key, { ...artist, name });
    });
  });

  return Array.from(artistsById.values());
}

function FavoriteSongRow({
  song,
  index,
  selected,
  isCurrentTrack,
  isPlaying,
  isRemoving,
  onPlay,
  onToggle,
  onMove,
  onStatus,
}: {
  song: Song;
  index: number;
  selected: boolean;
  isCurrentTrack: boolean;
  isPlaying: boolean;
  isRemoving: boolean;
  onPlay: () => void;
  onToggle: () => void;
  onMove: (songId: string, destinationId: string) => void;
  onStatus: (message: string) => void;
}) {
  const cover = song.cover_url || fallbackCover;
  const playLabel = isCurrentTrack && isPlaying ? `Tạm dừng ${song.title}` : `Phát ${song.title}`;
  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;
    event.preventDefault();
    onMove(song.id, event.key === 'ArrowUp' ? 'previous' : 'next');
  };

  return (
    <li
      data-favorite-song-id={song.id}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const sourceId = event.dataTransfer.getData('text/plain');
        if (sourceId && sourceId !== song.id) onMove(sourceId, song.id);
      }}
      className={`${styles.songRow} group grid grid-cols-[40px_minmax(0,1fr)_56px_28px] items-center gap-3 rounded-lg px-2 py-2.5 hover:z-20 focus-within:z-20 sm:grid-cols-[40px_minmax(0,1fr)_minmax(180px,0.8fr)_64px_32px] sm:gap-4`}
    >
      <div className="relative grid size-9 grid-cols-2 items-center justify-items-center">
        <span className={`col-span-2 row-start-1 grid size-6 place-items-center text-[13px] text-white/70 transition-opacity group-hover:opacity-0 group-focus-within:opacity-0 ${selected ? 'opacity-0' : ''}`}>{index + 1}</span>
        <button
          type="button"
          draggable
          aria-label={`Kéo để sắp xếp ${song.title}; nhấn Alt và mũi tên lên hoặc xuống để di chuyển`}
          onKeyDown={handleKeyDown}
          onDragStart={(event) => { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', song.id); }}
          className="absolute left-0 top-1/2 grid size-4 -translate-y-1/2 cursor-grab place-items-center text-sm leading-none text-white/55 opacity-0 outline-none transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 active:cursor-grabbing focus-visible:text-cyan-300"
        >⠿</button>
        <label className={`absolute right-0 top-1/2 grid size-5 -translate-y-1/2 cursor-pointer place-items-center transition-opacity ${selected ? 'opacity-100' : 'pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100'}`}>
          <input type="checkbox" checked={selected} onChange={onToggle} aria-label={`Chọn bài ${song.title}`} className="size-[18px] cursor-pointer accent-white" />
        </label>
      </div>
      <div className="flex min-w-0 items-center gap-3">
        <div className="group/cover relative size-11 shrink-0 overflow-hidden rounded-[4px] bg-black/20 bg-cover bg-center" style={{ backgroundImage: `url("${cover}")` }}>
          <button
            type="button"
            onClick={onPlay}
            aria-label={playLabel}
            className={`absolute inset-0 grid place-items-center bg-black/45 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${isCurrentTrack ? 'opacity-100' : 'pointer-events-none opacity-0 group-hover/cover:pointer-events-auto group-hover/cover:opacity-100 group-focus-within/cover:pointer-events-auto group-focus-within/cover:opacity-100'}`}
          >
            {isCurrentTrack && isPlaying ? <PauseIcon /> : <PlayGlyph className="ml-0.5 size-4" />}
          </button>
        </div>
        <Link
          href={songPath(song)}
          onClick={() => recordRecentItem(recentSongItem(song))}
          className={`min-w-0 truncate text-sm font-bold uppercase transition-colors hover:text-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${isCurrentTrack ? 'text-cyan-300' : 'text-white/95'}`}
        >
          {song.title}
        </Link>
      </div>
      <span className="hidden truncate text-[13px] text-white/65 sm:block"><ArtistNames artists={song.artists?.length ? song.artists : song.artist ? [song.artist] : []} /></span>
      <span className="text-right text-xs text-[#bcd4e4]">{formatDuration(song.duration_seconds)}</span>
      <SongRowActionMenu song={song} onStatus={onStatus} buttonClassName={`pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 ${isRemoving ? 'pointer-events-none opacity-50' : ''}`} />
    </li>
  );
}

export default function FavoriteSongsPage() {
  const { track, isPlaying, playSong, togglePlay } = usePlayerControls();
  const [songs, setSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [removingIds, setRemovingIds] = useState<string[]>([]);
  const [selectedSongIds, setSelectedSongIds] = useState<string[]>([]);
  const [isReordering, setIsReordering] = useState(false);
  const [isPlaylistDialogOpen, setIsPlaylistDialogOpen] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const hasCurrentTrack = Boolean(track && songs.some((song) => song.id === track.id));
  const favoritePlaylistIsPlaying = Boolean(isPlaying && hasCurrentTrack);
  const title = authUser ? `Yêu thích của ${authUser.username || authUser.name}` : 'Bài hát yêu thích';
  const cover = songs[0]?.cover_url || fallbackCover;
  const favoriteArtists = collectFavoriteArtists(songs);
  const visibleFavoriteArtists = favoriteArtists.slice(0, 3);
  const selectedSongs = songs.filter((song) => selectedSongIds.includes(song.id));
  const allSongsSelected = songs.length > 0 && selectedSongIds.length === songs.length;

  useEffect(() => {
    let cancelled = false;
    listFavoriteSongs(getVisitorId())
      .then((response) => {
        if (!cancelled) {
          setSongs(response.data);
          setSelectedSongIds([]);
          setError('');
        }
      })
      .catch(() => {
        if (!cancelled) setError('Không thể tải danh sách bài hát yêu thích.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [reloadKey]);

  useEffect(() => {
    const syncUser = () => {
      setReloadKey((key) => key + 1);
      try {
        const storedUser = window.localStorage.getItem(AUTH_USER_STORAGE_KEY);
        setAuthUser(storedUser ? JSON.parse(storedUser) as AuthUser : null);
      } catch {
        setAuthUser(null);
      }
    };

    syncUser();
    let timer: ReturnType<typeof setTimeout>;
    const syncFavorites = () => { clearTimeout(timer); timer = setTimeout(() => setReloadKey((key) => key + 1), 100); };
    window.addEventListener('melodify-library-changed', syncFavorites);
    window.addEventListener('melodify-auth-changed', syncUser);
    return () => { clearTimeout(timer); window.removeEventListener('melodify-auth-changed', syncUser); window.removeEventListener('melodify-library-changed', syncFavorites); };
  }, []);

  const handlePlayAll = () => {
    if (songs.length === 0) return;
    if (hasCurrentTrack) {
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

  const refreshFavorites = () => {
    setIsLoading(true);
    setError('');
    setReloadKey((key) => key + 1);
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
      setStatus('Đã chia sẻ danh sách yêu thích.');
    } catch {
      setStatus('Không thể chia sẻ lúc này.');
    }
  };

  const toggleSongSelection = (songId: string) => {
    setSelectedSongIds((current) => current.includes(songId)
      ? current.filter((id) => id !== songId)
      : [...current, songId]);
  };

  const toggleAllSongs = () => {
    setSelectedSongIds(allSongsSelected ? [] : songs.map((song) => song.id));
  };

  const moveFavoriteSong = async (songId: string, destinationId: string) => {
    if (isReordering || songs.length < 2) return;
    const oldSongs = songs;
    const fromIndex = oldSongs.findIndex((song) => song.id === songId);
    const toIndex = destinationId === 'previous'
      ? Math.max(0, fromIndex - 1)
      : destinationId === 'next'
        ? Math.min(oldSongs.length - 1, fromIndex + 1)
        : oldSongs.findIndex((song) => song.id === destinationId);
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;
    const reordered = [...oldSongs];
    const [movedSong] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, movedSong);
    setSongs(reordered);
    setIsReordering(true);
    try {
      await reorderFavoriteSongs(reordered.map((song) => song.id), getVisitorId());
      setStatus(`Đã chuyển “${movedSong.title}” lên vị trí ${toIndex + 1}.`);
    } catch {
      setSongs(oldSongs);
      setStatus('Không thể lưu thứ tự mới. Hãy thử kéo lại.');
    } finally {
      setIsReordering(false);
    }
  };

  const handleRemoveSelected = async () => {
    if (selectedSongs.length === 0 || removingIds.length > 0) return;
    const targets = [...selectedSongs];
    setRemovingIds(targets.map((song) => song.id));
    setStatus('');
    const results = await Promise.allSettled(targets.map((song) => setSongFavorite(song.id, false, getVisitorId())));
    const removedIds = targets.filter((_, index) => results[index].status === 'fulfilled').map((song) => song.id);
    const failedCount = results.length - removedIds.length;
    setSongs((current) => current.filter((song) => !removedIds.includes(song.id)));
    setSelectedSongIds((current) => current.filter((id) => !removedIds.includes(id)));
    setRemovingIds([]);
    setStatus(failedCount === 0
      ? `Đã xóa ${removedIds.length} bài khỏi danh sách yêu thích.`
      : `Đã xóa ${removedIds.length} bài; ${failedCount} bài chưa xóa được.`);
  };

  const handleDownloadSelected = () => {
    downloadSongFiles(selectedSongs);
    setStatus(`Đang tải ${selectedSongs.length} bài đã chọn.`);
  };

  return (
    <main className="min-h-[calc(100vh-80px)] overflow-x-auto bg-[#202a28] px-4 pb-12 pt-5 text-white sm:px-7 lg:px-7">
      <div className="min-w-[760px] w-full">
        <section className="flex items-start gap-5 lg:gap-6">
          <div role="img" aria-label="Ảnh bìa playlist yêu thích" className="relative size-[220px] shrink-0 overflow-hidden rounded-xl bg-cover bg-center shadow-2xl lg:size-[260px]" style={{ backgroundImage: `url("${cover}")` }}>
            <div className="absolute inset-0 grid place-items-center bg-black/10"><HeartIcon /></div>
          </div>

          <div className="flex min-h-[260px] min-w-0 flex-1 flex-col pt-1">
            <p className="text-xs font-medium text-[#8da7a4]">Playlist&nbsp; · &nbsp;{songs.length} Bài hát</p>
            <h1 className="mt-2 text-[32px] font-extrabold leading-tight tracking-[-0.04em] text-white">{title}</h1>
            <div className="mt-3 min-w-0 text-xs font-semibold text-white">
              <span className="block truncate"><ArtistNames artists={visibleFavoriteArtists} fallback="Chưa có nghệ sĩ" />{favoriteArtists.length > 3 ? ' và nhiều nghệ sĩ' : ''}</span>
            </div>
            <div className="mt-auto">
              <div className="mb-3 flex items-start gap-4 text-white">
                <button type="button" aria-label="Yêu thích danh sách" disabled className="grid size-8 cursor-not-allowed place-items-center disabled:opacity-100">
                  <HeartIcon tone="muted" />
                </button>
                <button type="button" aria-label="Chia sẻ danh sách yêu thích" onClick={() => void handleShare()} className="grid size-8 place-items-center text-white outline-none focus-visible:ring-2 focus-visible:ring-[#00d3e5]"><ShareIcon /></button>
                <button type="button" aria-label="Tải lại danh sách yêu thích" onClick={refreshFavorites} className="grid size-10 place-items-center rounded-full bg-[#303c39] text-white outline-none transition-colors hover:bg-[#40504b] focus-visible:ring-2 focus-visible:ring-[#00d3e5]"><MoreIcon /></button>
              </div>
              <div className="flex items-center gap-4">
                <button type="button" onClick={handlePlayAll} disabled={songs.length === 0} className="inline-flex h-11 w-[190px] items-center justify-center gap-2 rounded-full bg-[#08c6d9] text-sm font-bold text-[#07363a] outline-none transition-colors hover:bg-[#22d7e7] focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-50">
                  {favoritePlaylistIsPlaying ? <PauseIcon /> : <PlayGlyph className="ml-0.5 size-4" />}
                  {favoritePlaylistIsPlaying ? 'Tạm dừng' : 'Phát tất cả'}
                </button>
                <button type="button" disabled={songs.length === 0} onClick={() => { downloadSongFiles(songs); setStatus(`Đang tải ${songs.length} bài.`); }} className="inline-flex h-11 w-[190px] items-center justify-center gap-2 rounded-full bg-[#3a3a3a] text-sm font-bold text-white outline-none transition-colors hover:bg-[#484848] focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-not-allowed disabled:opacity-50">
                  <DownloadIcon />
                  Tải về
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8">
      <div className="grid grid-cols-[40px_minmax(0,1fr)_56px_28px] items-center gap-3 border-b border-white/10 px-2 pb-3 text-[13px] font-bold text-white/60 sm:grid-cols-[40px_minmax(0,1fr)_minmax(180px,0.8fr)_64px_32px] sm:gap-4">
            <span>#</span>
            <span>Tiêu đề</span>
            <span className="hidden sm:block">Nghệ sĩ</span>
            <span className="grid size-5 place-items-center justify-self-end text-[18px] leading-none" aria-label="Thời lượng">◷</span>
            <span aria-hidden="true" />
          </div>

          {selectedSongIds.length > 0 ? (
            <div className="mb-3 flex min-h-9 flex-wrap items-center gap-2" aria-label="Thao tác với bài hát đã chọn">
              <label className="grid size-6 cursor-pointer place-items-center" title="Chọn tất cả bài hát">
                <input type="checkbox" checked={allSongsSelected} onChange={toggleAllSongs} aria-label="Chọn tất cả bài hát" className="size-[18px] cursor-pointer accent-white" />
              </label>
              <button type="button" onClick={() => setIsPlaylistDialogOpen(true)} className="inline-flex h-8 items-center gap-2 rounded-full border border-white/45 px-3 text-[12px] font-bold text-white transition-colors hover:border-white hover:bg-white/10"><span aria-hidden="true">☷</span>Thêm vào playlist</button>
              <button type="button" onClick={() => void handleRemoveSelected()} disabled={removingIds.length > 0} className="inline-flex h-8 items-center gap-2 rounded-full border border-white/45 px-3 text-[12px] font-bold text-white transition-colors hover:border-white hover:bg-white/10 disabled:opacity-50"><HeartIcon />Xóa khỏi Yêu Thích</button>
              <button type="button" onClick={handleDownloadSelected} className="inline-flex h-8 items-center gap-2 rounded-full border border-white/45 px-3 text-[12px] font-bold text-white transition-colors hover:border-white hover:bg-white/10"><DownloadIcon />Tải về</button>
            </div>
          ) : null}
          {isLoading ? <div className="mt-3 h-28 animate-pulse rounded-xl bg-white/[0.06]" aria-label="Đang tải danh sách yêu thích" /> : null}
          {error ? <p role="alert" className="mt-4 rounded-lg bg-white/[0.06] px-4 py-5 text-sm text-white/70">{error} <button type="button" onClick={refreshFavorites} className="ml-2 font-bold text-cyan-300 hover:text-cyan-200">Thử lại</button></p> : null}
          {!isLoading && !error && songs.length === 0 ? <p className="mt-4 rounded-lg bg-white/[0.06] px-4 py-5 text-sm text-white/70">Bạn chưa có bài hát yêu thích nào.</p> : null}
          {!isLoading && !error && songs.length > 0 ? (
            <ol className="mt-2 space-y-0.5">
              {songs.map((song, index) => (
                <FavoriteSongRow
                  key={song.id}
                  song={song}
                  index={index}
                  selected={selectedSongIds.includes(song.id)}
                  isCurrentTrack={track?.id === song.id}
                  isPlaying={isPlaying && track?.id === song.id}
                  isRemoving={removingIds.includes(song.id)}
                  onPlay={() => handlePlaySong(song)}
                  onToggle={() => toggleSongSelection(song.id)}
                  onMove={(sourceId, destinationId) => void moveFavoriteSong(sourceId, destinationId)}
                  onStatus={setStatus}
                />
              ))}
            </ol>
          ) : null}
        </section>
        <AddSongsToPlaylistDialog songs={selectedSongs} open={isPlaylistDialogOpen} onClose={() => setIsPlaylistDialogOpen(false)} onAdded={setStatus} />
        <p role="status" aria-live="polite" className="sr-only">{status}</p>
      </div>
    </main>
  );
}
