'use client';
import FollowButton from '@/components/follow/FollowButton';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

import { usePlayer } from '@/components/player';
import { PlayGlyph } from '@/components/icons/PlayGlyph';
import { getPlaylist, getVisitorId, recordPlaylistShare, togglePlaylistFavorite, type Playlist, type Song, type SongArtistCredit } from '@/lib/api';
import { ArtistLink, ArtistNames } from '@/components/artists';
import { SongRowActionMenu } from '@/components/songs/SongRowActionMenu';
import { AddSongsToPlaylistDialog } from '@/components/playlists/AddSongsToPlaylistDialog';
import { recentSongItem, recordRecentItem, songPath } from '@/lib/recent-history';
import { downloadSongFiles, setSongFavorites } from '@/lib/song-actions';

import styles from '@/components/albums/AlbumDetailPage.module.css';

const fallbackCover = '/images/cover-placeholder.svg';
const maxHeaderArtists = 3;

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

function MoreHorizontalIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-current"><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></svg>;
}

function FacebookIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5"><circle cx="12" cy="12" r="11" fill="#1877f2" /><path d="M13.25 20v-7.3h2.45l.37-2.85h-2.82V8.03c0-.82.23-1.38 1.41-1.38h1.51V4.1c-.26-.04-1.15-.11-2.19-.11-2.16 0-3.64 1.32-3.64 3.75v2.1H7.9v2.85h2.44V20h2.91Z" fill="white" /></svg>;
}

function CopyLinkIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-none stroke-current stroke-[1.8]"><path d="m9.6 14.4 4.8-4.8m-7.2 7.2-1.2 1.2a3.4 3.4 0 0 1-4.8-4.8l4-4a3.4 3.4 0 0 1 4.8 0m2.4-2.4 1.2-1.2a3.4 3.4 0 0 1 4.8 4.8l-4 4a3.4 3.4 0 0 1-4.8 0" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function formatDuration(seconds: number | null | undefined) {
  if (seconds === null || seconds === undefined) return '--:--';

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = String(seconds % 60).padStart(2, '0');
  return `${String(minutes).padStart(2, '0')}:${remainingSeconds}`;
}

function songArtists(song: Song) {
  const credits: SongArtistCredit[] = song.artists?.length ? song.artists : song.artist ? [song.artist] : [];
  const linkedNames = credits
    .filter((artist) => artist.id || artist.slug)
    .map((artist) => artist.name.trim().toLocaleLowerCase());

  const visibleCredits = credits.filter((artist) => {
    if (artist.id || artist.slug) return true;

    const normalizedName = artist.name.trim().toLocaleLowerCase();
    const isCombinedCredit = /\b(?:feat|ft)\.?\b|\s[&x]\s/i.test(normalizedName);
    return !isCombinedCredit || !linkedNames.some((name) => normalizedName.includes(name));
  });

  if (visibleCredits.length) return visibleCredits;
  return song.artist ? [song.artist] : [];
}

function collectCollaborators(playlist: Playlist): SongArtistCredit[] {
  const artists = new Map<string, SongArtistCredit>();
  const addArtist = (artist: SongArtistCredit | null | undefined) => {
    if (!artist?.name) return;

    const key = artist.id || artist.name;
    if (!artists.has(key)) artists.set(key, artist);
  };

  if (playlist.artists?.length) {
    playlist.artists.forEach(addArtist);
  } else {
    playlist.songs?.forEach((song) => {
      if (song.artists?.length) {
        song.artists.forEach(addArtist);
      } else if (song.artist) {
        addArtist(song.artist);
      }
    });
  }

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

function PlaylistSongRow({ song, index, coverUrl, checked, onToggle, onPlay, isCurrentTrack, isPlaying }: { song: Song; index: number; coverUrl: string; checked: boolean; onToggle: () => void; onPlay: () => void; isCurrentTrack: boolean; isPlaying: boolean }) {
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

export default function PlaylistDetailPage({ slug }: { slug: string }) {
  const { track, isPlaying, playSong, togglePlay } = usePlayer();
  const [request, setRequest] = useState({ slug: '', playlist: null as Playlist | null, visibleCount: 30, isLoading: true, error: '' });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [shareCount, setShareCount] = useState(0);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isFavoritePending, setIsFavoritePending] = useState(false);
  const [isSharePending, setIsSharePending] = useState(false);
  const [shareStatus, setShareStatus] = useState('');
  const [isPlaylistDialogOpen, setIsPlaylistDialogOpen] = useState(false);
  const actionMenusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const visitorId = getVisitorId();

    getPlaylist(slug, visitorId)
      .then((response) => {
        if (!cancelled) {
          setRequest({ slug, playlist: response.data, visibleCount: 30, isLoading: false, error: '' });
          setSelectedIds([]);
          setIsFavorite(response.data.is_favorite ?? false);
          setFavoriteCount(response.data.favorite_count ?? 0);
          setShareCount(response.data.share_count ?? 0);
          setIsMoreOpen(false);
          setIsShareOpen(false);
        }
      })
      .catch(() => {
        if (!cancelled) setRequest({ slug, playlist: null, visibleCount: 30, isLoading: false, error: 'Không thể tải playlist lúc này.' });
      });

    return () => { cancelled = true; };
  }, [slug]);

  useEffect(() => {
    if (!isMoreOpen && !isShareOpen) return;

    const closeMenusOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !actionMenusRef.current?.contains(event.target)) {
        setIsMoreOpen(false);
        setIsShareOpen(false);
      }
    };
    const closeMenusOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMoreOpen(false);
        setIsShareOpen(false);
      }
    };

    document.addEventListener('pointerdown', closeMenusOutside);
    document.addEventListener('keydown', closeMenusOnEscape);

    return () => {
      document.removeEventListener('pointerdown', closeMenusOutside);
      document.removeEventListener('keydown', closeMenusOnEscape);
    };
  }, [isMoreOpen, isShareOpen]);

  const isCurrentRequest = request.slug === slug;
  const playlist = isCurrentRequest ? request.playlist : null;
  const isLoading = !isCurrentRequest || request.isLoading;
  const collaborators = useMemo(() => (playlist ? collectCollaborators(playlist) : []), [playlist]);

  if (isLoading) {
    return <main className="min-h-[calc(100vh-80px)] bg-[#202a28] px-5 pb-20 pt-7 sm:px-8 lg:px-7"><div className="h-[270px] animate-pulse rounded-2xl bg-[#30443f]" /></main>;
  }

  if (request.error || !playlist) {
    return (
      <main className="min-h-[calc(100vh-80px)] bg-[#202a28] px-5 pb-20 pt-7 text-white sm:px-8 lg:px-7">
        <Link href="/playlist" className="text-sm text-white/70 transition-colors hover:text-white">← Quay lại playlist</Link>
        <p role="alert" className="mt-8 rounded-lg bg-[#30443f] px-4 py-3 text-sm text-white/75">{request.error || 'Không tìm thấy playlist.'}</p>
      </main>
    );
  }

  const songs = playlist.songs ?? [];
  const visibleSongs = songs.slice(0, request.visibleCount);
  const selectedSongs = songs.filter((song) => selectedIds.includes(song.id));
  const hasMoreSongs = request.visibleCount < songs.length;
  const allSongsSelected = songs.length > 0 && selectedIds.length === songs.length;
  const playlistHasCurrentTrack = Boolean(track && songs.some((song) => song.id === track.id));
  const playlistIsPlaying = Boolean(track && isPlaying && playlistHasCurrentTrack);
  const coverUrl = playlist.cover_url || fallbackCover;
  const playlistArtists = playlist.artists ?? [];
  const visibleHeaderArtists = playlistArtists.slice(0, maxHeaderArtists);
  const hasMoreArtists = playlistArtists.length > visibleHeaderArtists.length;

  const toggleSong = (songId: string) => {
    setSelectedIds((current) => current.includes(songId) ? current.filter((id) => id !== songId) : [...current, songId]);
  };

  const toggleAllSongs = () => {
    setSelectedIds(allSongsSelected ? [] : songs.map((song) => song.id));
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
    if (songs.length === 0) return;
    if (playlistHasCurrentTrack) {
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

  const handleFavorite = async () => {
    if (isFavoritePending) return;

    setIsFavoritePending(true);
    setShareStatus('');

    try {
      const response = await togglePlaylistFavorite(playlist.id, getVisitorId());
      setIsFavorite(response.favorited);
      setFavoriteCount(response.favorites);
    } catch {
      setShareStatus('Không thể cập nhật lượt yêu thích. Vui lòng thử lại.');
    } finally {
      setIsFavoritePending(false);
    }
  };

  const handleShare = async (source: 'facebook' | 'copy_link') => {
    if (isSharePending) return;

    const url = window.location.href;
    let shareStarted = false;
    setIsSharePending(true);
    setShareStatus('');

    try {
      if (source === 'facebook') {
        const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        window.open(facebookUrl, '_blank', 'noopener,noreferrer,width=680,height=640');
        shareStarted = true;
      } else {
        await navigator.clipboard.writeText(url);
        shareStarted = true;
      }

      const response = await recordPlaylistShare(playlist.id, source, getVisitorId());
      setShareCount(response.shares);
      setShareStatus(source === 'facebook' ? 'Đã mở Facebook để chia sẻ playlist.' : 'Đã sao chép liên kết playlist.');
    } catch {
      setShareStatus(shareStarted
        ? 'Đã thực hiện chia sẻ nhưng chưa ghi nhận được lượt. Vui lòng thử lại.'
        : 'Không thể chia sẻ playlist. Vui lòng thử lại.');
    } finally {
      setIsSharePending(false);
      setIsMoreOpen(false);
      setIsShareOpen(false);
    }
  };

  const handleReport = () => {
    setShareStatus('Đã ghi nhận báo cáo.');
    setIsMoreOpen(false);
    setIsShareOpen(false);
  };

  const scrollToCollaborators = () => {
    document.getElementById('playlist-collaborators')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <main className="min-h-[calc(100vh-80px)] overflow-x-hidden bg-[#202a28] px-5 pb-20 pt-7 text-white sm:px-8 lg:px-7">
      <div className="w-full max-w-[1582px]">
        <section className="grid gap-6 lg:grid-cols-[248px_minmax(0,1fr)] lg:items-stretch">
          <div role="img" aria-label={`Ảnh bìa ${playlist.name}`} className="aspect-square w-full max-w-[248px] rounded-[8px] bg-cover bg-center" style={{ backgroundImage: `url("${coverUrl}")` }} />

          <div className="flex min-w-0 flex-col lg:h-[248px]">
            <p className="text-[13px] text-white/55">Playlist&nbsp; · &nbsp;{songs.length} Bài hát</p>
            <h1 className="mt-4 truncate text-[30px] font-bold leading-tight text-white sm:text-[34px]">{playlist.name}</h1>
            {visibleHeaderArtists.length > 0 ? (
              <div className="mt-4 flex min-w-0 flex-wrap items-center gap-x-1 gap-y-1 text-[14px] font-bold text-white">
                <ArtistNames artists={visibleHeaderArtists} className="min-w-0 truncate" />
                {hasMoreArtists ? <button type="button" onClick={scrollToCollaborators} className="shrink-0 text-white/60 transition-colors hover:text-[#00d3e5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00d3e5]">và nhiều hơn</button> : null}
              </div>
            ) : null}
            {playlist.description ? <p className="mt-3 max-w-2xl text-sm text-white/55">{playlist.description}</p> : null}

            <div className="mt-auto">
              <div ref={actionMenusRef} className="relative flex items-start gap-3">
                <button type="button" aria-label={isFavorite ? 'Bỏ yêu thích playlist' : 'Thêm playlist vào yêu thích'} aria-pressed={isFavorite} disabled={isFavoritePending} onClick={() => void handleFavorite()} className="group flex min-w-8 flex-col items-center gap-1 rounded-full px-1.5 py-1 text-white outline-none focus-visible:ring-2 focus-visible:ring-[#00d3e5] disabled:cursor-wait disabled:opacity-60">
                  <span className="grid size-8 place-items-center"><HeartIcon filled={isFavorite} /></span>
                  <span className="text-[11px] font-bold text-white">{favoriteCount}</span>
                </button>
                <div className="relative">
                  <button type="button" aria-label="Chia sẻ playlist" aria-haspopup="menu" aria-controls="playlist-share-menu" aria-expanded={isShareOpen} disabled={isSharePending} onClick={() => { setIsMoreOpen(false); setIsShareOpen((current) => !current); }} className="group flex min-w-8 flex-col items-center gap-1 rounded-full px-1.5 py-1 text-white outline-none focus-visible:ring-2 focus-visible:ring-[#00d3e5] disabled:cursor-wait disabled:opacity-60">
                    <span className="grid size-8 place-items-center"><ShareIcon /></span>
                    <span className="text-[11px] font-bold text-white">{shareCount}</span>
                  </button>
                  {isShareOpen ? <div id="playlist-share-menu" role="menu" aria-label="Chia sẻ playlist" className="absolute left-0 top-full z-30 mt-2 w-56 overflow-hidden rounded-xl border border-white/[0.06] bg-[#292c2b] p-1.5 text-[13px] font-bold text-white shadow-2xl">
                    <button type="button" role="menuitem" disabled={isSharePending} onClick={() => void handleShare('facebook')} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white/[0.09] hover:text-[#00d3e5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00d3e5] disabled:opacity-60"><FacebookIcon />Facebook</button>
                    <button type="button" role="menuitem" disabled={isSharePending} onClick={() => void handleShare('copy_link')} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white/[0.09] hover:text-[#00d3e5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00d3e5] disabled:opacity-60"><CopyLinkIcon />Sao chép đường dẫn</button>
                  </div> : null}
                </div>
                <div className="relative">
                  <button type="button" aria-label="Thêm tùy chọn" aria-expanded={isMoreOpen} onClick={() => { setIsShareOpen(false); setIsMoreOpen((current) => !current); }} className="grid size-10 place-items-center rounded-full bg-[#303c39] text-[13px] tracking-[0.08em] text-white outline-none transition-colors hover:bg-[#40504b] focus-visible:ring-2 focus-visible:ring-[#00d3e5]"><MoreHorizontalIcon /></button>
                  {isMoreOpen ? <div role="menu" className="absolute left-0 top-full z-20 mt-2 w-40 overflow-hidden rounded-xl border border-white/[0.06] bg-[#292c2b] p-1.5 text-[13px] font-bold text-white shadow-2xl"><button type="button" role="menuitem" onClick={() => { setIsMoreOpen(false); setIsShareOpen(true); }} className="flex w-full items-center justify-between rounded-lg px-2.5 py-2.5 text-left transition-colors hover:bg-white/[0.09] hover:text-[#00d3e5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00d3e5]">Chia sẻ <span aria-hidden="true">›</span></button><button type="button" role="menuitem" onClick={handleReport} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2.5 text-left transition-colors hover:bg-white/[0.09] hover:text-[#00d3e5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00d3e5]"><span aria-hidden="true">⚑</span>Báo cáo</button></div> : null}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-4">
                <button type="button" onClick={handlePlayAll} className="inline-flex h-10 items-center gap-2 rounded-full bg-[#00cfe3] px-6 text-[14px] font-bold text-[#07363a] transition-colors hover:bg-[#34dbea]">{playlistIsPlaying ? <PauseIcon /> : <PlayGlyph className="ml-0.5 size-4" />}{playlistIsPlaying ? 'Tạm dừng' : 'Phát tất cả'}</button>
                <button type="button" onClick={() => downloadSongFiles(songs)} disabled={songs.length === 0} className="inline-flex h-10 items-center gap-2 rounded-full bg-[#3c4140] px-7 text-[14px] font-bold text-white transition-colors hover:bg-[#4a504e] disabled:cursor-not-allowed disabled:opacity-50"><DownloadIcon />Tải về</button>
              </div>
            </div>
            <span className="sr-only" aria-live="polite">{shareStatus}</span>
          </div>
        </section>

        <section aria-labelledby="playlist-songs-heading" className="mt-10">
          <h2 id="playlist-songs-heading" className="sr-only">Danh sách bài hát trong playlist</h2>
          {selectedIds.length > 0 ? (
            <div className="mb-3 flex min-h-8 flex-wrap items-center gap-2"><SelectionCheckbox checked={allSongsSelected} label="Chọn tất cả bài hát" onChange={toggleAllSongs} /><button type="button" onClick={() => setIsPlaylistDialogOpen(true)} className="inline-flex h-8 items-center gap-2 rounded-full border border-white/45 px-3 text-[12px] font-bold text-white transition-colors hover:border-white hover:bg-white/10"><span aria-hidden="true">☷</span>Thêm vào playlist</button><button type="button" onClick={() => void handleAddSelectedToFavorites()} className="inline-flex h-8 items-center gap-2 rounded-full border border-white/45 px-3 text-[12px] font-bold text-white transition-colors hover:border-white hover:bg-white/10"><span aria-hidden="true">♡</span>Thêm vào Yêu thích</button><button type="button" onClick={handleDownloadSelected} className="inline-flex h-8 items-center gap-2 rounded-full border border-white/45 px-3 text-[12px] font-bold text-white transition-colors hover:border-white hover:bg-white/10"><DownloadIcon />Tải về</button></div>
          ) : (
            <div className="grid grid-cols-[32px_minmax(0,1fr)_56px_28px] gap-3 border-b border-white/10 px-2 pb-3 text-[13px] font-bold text-white/60 sm:grid-cols-[40px_minmax(0,1fr)_minmax(180px,0.8fr)_64px_32px] sm:gap-4"><span>#</span><span>Tiêu đề</span><span className="hidden sm:block">Nghệ sĩ</span><span className="grid size-5 place-items-center justify-self-end text-[18px] leading-none">◷</span><span aria-hidden="true" /></div>
          )}

          {visibleSongs.length > 0 ? <ol className="mt-2 space-y-0.5">{visibleSongs.map((song, index) => <PlaylistSongRow key={song.id} song={song} index={index} coverUrl={coverUrl} checked={selectedIds.includes(song.id)} onToggle={() => toggleSong(song.id)} onPlay={() => handlePlaySong(song)} isCurrentTrack={track?.id === song.id} isPlaying={isPlaying && track?.id === song.id} />)}</ol> : <p className="mt-8 rounded-lg bg-[#30443f] px-4 py-5 text-sm text-white/70">Playlist chưa có bài hát.</p>}
          {hasMoreSongs ? <button type="button" onClick={() => setRequest((current) => ({ ...current, visibleCount: current.visibleCount + 30 }))} className="mt-5 inline-flex items-center gap-2 text-[14px] font-bold text-white transition-colors hover:text-[#00d3e5]">Xem thêm <span aria-hidden="true">⌄</span></button> : null}
        </section>

        <AddSongsToPlaylistDialog songs={selectedSongs} open={isPlaylistDialogOpen} onClose={() => setIsPlaylistDialogOpen(false)} onAdded={setShareStatus} />

        {collaborators.length > 0 ? (
          <section id="playlist-collaborators" aria-labelledby="playlist-collaborators-heading" className="scroll-mt-24 mt-14">
            <h2 id="playlist-collaborators-heading" className="text-[24px] font-bold text-white">Kết hợp từ các nghệ sĩ</h2>
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
