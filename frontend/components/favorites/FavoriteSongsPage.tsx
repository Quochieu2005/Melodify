'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { ArtistNames } from '@/components/artists';
import { PlayGlyph } from '@/components/icons/PlayGlyph';
import { usePlayer } from '@/components/player';
import {
  AUTH_USER_STORAGE_KEY,
  getVisitorId,
  listFavoriteSongs,
  recordSongShare,
  setSongFavorite,
  type AuthUser,
  type Song,
  type SongArtistCredit,
} from '@/lib/api';
import { recordRecentItem, recentSongItem, songPath } from '@/lib/recent-history';
import styles from '@/components/albums/AlbumDetailPage.module.css';

const fallbackCover = '/topics/scene/scene_12_600.png';

function DownloadIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-none stroke-current stroke-2"><path d="M12 4v11m0 0 4-4m-4 4-4-4M5 19h14" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function MoreIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-current"><circle cx="5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="19" cy="12" r="1.7" /></svg>;
}

function ShareIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 fill-current"><path d="M14 3 23 11l-9 8v-5C8.2 14 4.4 15.5 1 21c.7-8 4.3-12.1 13-12.8V3Z" /></svg>;
}

function HeartIcon({ filled = false }: { filled?: boolean }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className={`size-6 fill-current ${filled ? 'text-[#ff3b66]' : 'text-white'}`}><path d="M12 21.1 3.4 12.7a5.8 5.8 0 0 1 8.2-8.2l.4.4.4-.4a5.8 5.8 0 0 1 8.2 8.2L12 21.1Z" /></svg>;
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
  isCurrentTrack,
  isPlaying,
  isRemoving,
  onPlay,
  onRemove,
  onShare,
}: {
  song: Song;
  index: number;
  isCurrentTrack: boolean;
  isPlaying: boolean;
  isRemoving: boolean;
  onPlay: () => void;
  onRemove: () => void;
  onShare: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const cover = song.cover_url || fallbackCover;
  const playLabel = isCurrentTrack && isPlaying ? `Tạm dừng ${song.title}` : `Phát ${song.title}`;

  return (
    <li className={`${styles.songRow} group grid grid-cols-[32px_minmax(0,1fr)_56px_28px] items-center gap-3 rounded-lg px-2 py-2.5 hover:z-20 focus-within:z-20 sm:grid-cols-[40px_minmax(0,1fr)_minmax(180px,0.8fr)_64px_32px] sm:gap-4`}>
      <span className="grid size-6 place-items-center text-[13px] text-white/70 group-hover:text-cyan-300">{index + 1}</span>
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
      <div className="relative grid place-items-center">
        <button
          type="button"
          aria-label={`Tùy chọn ${song.title}`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          disabled={isRemoving}
          onClick={() => setMenuOpen((open) => !open)}
          className={`${styles.rowMore} grid size-7 place-items-center rounded-full text-white/75 outline-none hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:opacity-50`}
        >
          <MoreIcon />
        </button>
        {menuOpen ? (
          <div role="menu" className="absolute right-0 top-full z-30 mt-1 w-44 overflow-hidden rounded-lg border border-white/[0.06] bg-[#292c2b] p-1.5 text-[13px] font-bold text-white shadow-2xl">
            <button type="button" role="menuitem" disabled={isRemoving} onClick={() => { setMenuOpen(false); onRemove(); }} className="w-full rounded-md px-2.5 py-2 text-left hover:bg-white/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:opacity-60">Bỏ khỏi yêu thích</button>
            <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onShare(); }} className="w-full rounded-md px-2.5 py-2 text-left hover:bg-white/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">Chia sẻ bài hát</button>
          </div>
        ) : null}
      </div>
    </li>
  );
}

export default function FavoriteSongsPage() {
  const { track, isPlaying, playSong, togglePlay } = usePlayer();
  const [songs, setSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [removingIds, setRemovingIds] = useState<string[]>([]);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const hasCurrentTrack = Boolean(track && songs.some((song) => song.id === track.id));
  const favoritePlaylistIsPlaying = Boolean(isPlaying && hasCurrentTrack);
  const title = authUser ? `Yêu thích của ${authUser.username || authUser.name}` : 'Bài hát yêu thích';
  const cover = songs[0]?.cover_url || fallbackCover;
  const favoriteArtists = collectFavoriteArtists(songs);
  const featuredArtist = favoriteArtists[0];

  useEffect(() => {
    let cancelled = false;
    listFavoriteSongs(getVisitorId())
      .then((response) => {
        if (!cancelled) {
          setSongs(response.data);
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
      try {
        const storedUser = window.localStorage.getItem(AUTH_USER_STORAGE_KEY);
        setAuthUser(storedUser ? JSON.parse(storedUser) as AuthUser : null);
      } catch {
        setAuthUser(null);
      }
    };

    syncUser();
    window.addEventListener('melodify-auth-changed', syncUser);
    return () => window.removeEventListener('melodify-auth-changed', syncUser);
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

  const handleRemoveFavorite = async (song: Song) => {
    if (removingIds.includes(song.id)) return;
    setRemovingIds((ids) => [...ids, song.id]);
    setStatus('');
    try {
      await setSongFavorite(song.id, false, getVisitorId());
      setSongs((current) => current.filter((item) => item.id !== song.id));
      setStatus(`Đã bỏ “${song.title}” khỏi danh sách yêu thích.`);
    } catch {
      setStatus(`Không thể bỏ “${song.title}” khỏi danh sách yêu thích.`);
    } finally {
      setRemovingIds((ids) => ids.filter((id) => id !== song.id));
    }
  };

  const handleShare = async (song?: Song) => {
    const url = song
      ? new URL(songPath(song), window.location.origin).toString()
      : window.location.href;
    const shareTitle = song?.title || title;
    try {
      let source: 'web' | 'copy_link' = 'copy_link';
      if (navigator.share) {
        await navigator.share({ title: shareTitle, url });
        source = 'web';
      } else {
        await navigator.clipboard.writeText(url);
      }
      if (song) await recordSongShare(song.id, source, getVisitorId());
      setStatus(song ? `Đã chia sẻ bài hát ${song.title}.` : 'Đã chia sẻ danh sách yêu thích.');
    } catch {
      setStatus('Không thể chia sẻ lúc này.');
    }
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
            <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-white">
              <span
                aria-hidden="true"
                className="grid size-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#c9d3d2] to-[#72574b] bg-cover bg-center text-[11px] font-bold text-white"
                style={featuredArtist?.avatar_url ? { backgroundImage: `url("${featuredArtist.avatar_url}")` } : undefined}
              >
                {featuredArtist?.avatar_url ? null : featuredArtist?.name.charAt(0).toUpperCase() || '♪'}
              </span>
              <ArtistNames artists={favoriteArtists} fallback="Chưa có nghệ sĩ" className="min-w-0 truncate" />
            </div>
            <div className="mt-auto">
              <div className="mb-3 flex items-start gap-4 text-white">
                <span aria-label="Danh sách bài hát yêu thích" className="grid size-8 place-items-center"><HeartIcon filled /></span>
                <button type="button" aria-label="Chia sẻ danh sách yêu thích" onClick={() => void handleShare()} className="grid size-8 place-items-center text-white outline-none focus-visible:ring-2 focus-visible:ring-[#00d3e5]"><ShareIcon /></button>
                <button type="button" aria-label="Tải lại danh sách yêu thích" onClick={refreshFavorites} className="grid size-10 place-items-center rounded-full bg-[#303c39] text-white outline-none transition-colors hover:bg-[#40504b] focus-visible:ring-2 focus-visible:ring-[#00d3e5]"><MoreIcon /></button>
              </div>
              <div className="flex items-center gap-4">
                <button type="button" onClick={handlePlayAll} disabled={songs.length === 0} className="inline-flex h-11 w-[190px] items-center justify-center gap-2 rounded-full bg-[#08c6d9] text-sm font-bold text-[#07363a] outline-none transition-colors hover:bg-[#22d7e7] focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-50">
                  {favoritePlaylistIsPlaying ? <PauseIcon /> : <PlayGlyph className="ml-0.5 size-4" />}
                  {favoritePlaylistIsPlaying ? 'Tạm dừng' : 'Phát tất cả'}
                </button>
                <button type="button" disabled={songs.length === 0} onClick={() => { const song = songs[0]; if (song?.audio_url) window.open(song.audio_url, '_blank', 'noopener,noreferrer'); }} className="inline-flex h-11 w-[190px] items-center justify-center gap-2 rounded-full bg-[#3a3a3a] text-sm font-bold text-white outline-none transition-colors hover:bg-[#484848] focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-not-allowed disabled:opacity-50">
                  <DownloadIcon />
                  Tải về
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="grid grid-cols-[32px_minmax(0,1fr)_56px_28px] items-center gap-3 border-b border-white/10 px-2 pb-3 text-[13px] font-bold text-white/60 sm:grid-cols-[40px_minmax(0,1fr)_minmax(180px,0.8fr)_64px_32px] sm:gap-4">
            <span>#</span>
            <span>Tiêu đề</span>
            <span className="hidden sm:block">Nghệ sĩ</span>
            <span className="grid size-5 place-items-center justify-self-end text-[18px] leading-none" aria-label="Thời lượng">◷</span>
            <span aria-hidden="true" />
          </div>

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
                  isCurrentTrack={track?.id === song.id}
                  isPlaying={isPlaying && track?.id === song.id}
                  isRemoving={removingIds.includes(song.id)}
                  onPlay={() => handlePlaySong(song)}
                  onRemove={() => void handleRemoveFavorite(song)}
                  onShare={() => void handleShare(song)}
                />
              ))}
            </ol>
          ) : null}
        </section>
        <p role="status" aria-live="polite" className="sr-only">{status}</p>
      </div>
    </main>
  );
}
