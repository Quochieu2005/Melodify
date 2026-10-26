'use client';
import FollowButton from '@/components/follow/FollowButton';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { usePlayerControls } from '@/components/player';
import { PlayGlyph } from '@/components/icons/PlayGlyph';
import { AUTH_TOKEN_STORAGE_KEY, deleteUserPlaylist, getPlaylist, getSongDownloadUrl, getVisitorId, recordPlaylistShare, togglePlaylistFavorite, updateUserPlaylist, type Playlist, type Song, type SongArtistCredit, type SongAudioQuality } from '@/lib/api';
import { ArtistLink, ArtistNames } from '@/components/artists';
import { SongRowActionMenu } from '@/components/songs/SongRowActionMenu';
import { AddSongsToPlaylistDialog } from '@/components/playlists/AddSongsToPlaylistDialog';
import { AddSongsToOwnedPlaylistDialog } from '@/components/playlists/AddSongsToOwnedPlaylistDialog';
import { EditUserPlaylistDialog } from '@/components/playlists/EditUserPlaylistDialog';
import { useLibrary } from '@/components/library/LibraryProvider';
import { recentSongItem, recordRecentItem, songPath } from '@/lib/recent-history';
import { downloadSongFiles, setSongFavorites } from '@/lib/song-actions';

import styles from '@/components/albums/AlbumDetailPage.module.css';

const fallbackCover = '/images/cover-placeholder.svg';
const maxHeaderArtists = 3;
type DownloadTier = 'standard' | 'high' | 'lossless';

const downloadTiers: Array<{ id: DownloadTier; label: string; estimateBitrate: number; premium: boolean }> = [
  { id: 'standard', label: 'Chất lượng tiêu chuẩn', estimateBitrate: 128, premium: false },
  { id: 'high', label: 'Chất lượng cao', estimateBitrate: 320, premium: false },
  { id: 'lossless', label: 'Lossless', estimateBitrate: 1260, premium: true },
];

function bitrateOf(quality: SongAudioQuality) {
  return quality.bitrate ?? (Number.parseInt(quality.label, 10) || 0);
}

function qualityForSong(song: Song, tier: DownloadTier): SongAudioQuality | null | undefined {
  const qualities = song.audio_qualities ?? [];
  if (qualities.length === 0) return tier === 'standard' ? null : undefined;

  const available = qualities.filter((quality) => quality.available !== false && Boolean(quality.download_url));
  if (tier === 'lossless') {
    const lossless = available.filter((quality) => /lossless|flac|alac/i.test(quality.label));
    const candidates = lossless.length ? lossless : available.filter((quality) => quality.premium_only);
    return candidates.sort((left, right) => bitrateOf(right) - bitrateOf(left))[0];
  }

  const standardQualities = available.filter((quality) => !quality.premium_only).sort((left, right) => bitrateOf(left) - bitrateOf(right));
  if (standardQualities.length === 0) return undefined;
  return tier === 'standard' ? standardQualities[0] : standardQualities[standardQualities.length - 1];
}

function estimatedSizeMb(songs: Song[], tier: (typeof downloadTiers)[number]) {
  const megabytes = songs.reduce((sum, song) => {
    if (!song.duration_seconds) return sum;
    const quality = qualityForSong(song, tier.id);
    return sum + song.duration_seconds * (quality?.bitrate ?? tier.estimateBitrate) / 8 / 1000;
  }, 0);
  return megabytes > 0 ? `${megabytes.toFixed(1)}MB` : null;
}

function HeartIcon({ filled, className = 'size-6' }: { filled: boolean; className?: string }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className={`${className} shrink-0 fill-current ${filled ? 'text-[#ff3b66]' : 'text-white'}`}><path d="M12 21.1 3.4 12.7a5.8 5.8 0 0 1 8.2-8.2l.4.4.4-.4a5.8 5.8 0 0 1 8.2 8.2L12 21.1Z" /></svg>;
}

function ShareIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 fill-current"><path d="M14 3 23 11l-9 8v-5C8.2 14 4.4 15.5 1 21c.7-8 4.3-12.1 13-12.8V3Z" /></svg>;
}

function DownloadIcon({ className = 'size-5' }: { className?: string }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className={`${className} shrink-0 fill-none stroke-current stroke-[1.8]`}><path d="M12 3v11m0 0 4-4m-4 4-4-4M4 20h16" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function PlaylistAddIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[18px] shrink-0 fill-none stroke-current stroke-[1.8]"><path d="M4 6h11M4 11h11M4 16h7m8-4v8m-4-4h8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function AddToPlaylistIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 shrink-0 fill-none stroke-current stroke-[1.7]"><rect x="4" y="4" width="13" height="13" rx="2" /><path d="M8 20h10a2 2 0 0 0 2-2V8M10.5 10.5h6m-3-3v6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function LockIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 shrink-0 fill-none stroke-current stroke-[1.7]"><rect x="4.5" y="10" width="15" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function GlobeIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 shrink-0 fill-none stroke-current stroke-[1.7]"><circle cx="12" cy="12" r="9" /><path d="M3.5 12h17M12 3c2.2 2.4 3.2 5.4 3.2 9s-1 6.6-3.2 9c-2.2-2.4-3.2-5.4-3.2-9S9.8 5.4 12 3Z" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function EditIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 shrink-0 fill-none stroke-current stroke-[1.7]"><path d="m14.5 5.5 4 4M4 20l4.2-.8L19 8.4a2.8 2.8 0 0 0-4-4L4.2 15.2 4 20Z" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function TrashIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 shrink-0 fill-none stroke-current stroke-[1.7]"><path d="M4 7h16m-10 4v7m4-7v7M6.5 7l1 14h9l1-14M9 7V4h6v3" strokeLinecap="round" strokeLinejoin="round" /></svg>;
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
      : 'pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 has-[:focus-visible]:pointer-events-auto has-[:focus-visible]:opacity-100';
  const indexVisibility = checked ? 'hidden' : 'group-hover:hidden';

  return (
    <li className={`${styles.songRow} song-row-menu-host group relative isolate grid grid-cols-[32px_minmax(0,1fr)_56px_28px] items-center gap-3 rounded-lg px-2 py-2.5 hover:z-20 focus-within:z-20 sm:grid-cols-[40px_minmax(0,1fr)_minmax(180px,0.8fr)_64px_32px] sm:gap-4`}>
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
  const router = useRouter();
  const { track, isPlaying, isPremium, requestVipAccess, playSong, togglePlay } = usePlayerControls();
  const { refresh: refreshLibrary } = useLibrary();
  const [request, setRequest] = useState({ slug: '', playlist: null as Playlist | null, visibleCount: 30, isLoading: true, error: '' });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [shareCount, setShareCount] = useState(0);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const [isFavoritePending, setIsFavoritePending] = useState(false);
  const [isSharePending, setIsSharePending] = useState(false);
  const [shareStatus, setShareStatus] = useState('');
  const [isPlaylistDialogOpen, setIsPlaylistDialogOpen] = useState(false);
  const [isAddSongsOpen, setIsAddSongsOpen] = useState(false);
  const [isEditPlaylistOpen, setIsEditPlaylistOpen] = useState(false);
  const [isVisibilityPending, setIsVisibilityPending] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeletePending, setIsDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const actionMenusRef = useRef<HTMLDivElement>(null);
  const downloadControlRef = useRef<HTMLDivElement>(null);

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
          setIsDownloadOpen(false);
        }
      })
      .catch(() => {
        if (!cancelled) setRequest({ slug, playlist: null, visibleCount: 30, isLoading: false, error: 'Không thể tải playlist lúc này.' });
      });

    return () => { cancelled = true; };
  }, [slug]);

  useEffect(() => {
    if (!isMoreOpen && !isShareOpen && !isDownloadOpen) return;

    const closeMenusOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !actionMenusRef.current?.contains(event.target) && !downloadControlRef.current?.contains(event.target)) {
        setIsMoreOpen(false);
        setIsShareOpen(false);
        setIsDownloadOpen(false);
      }
    };
    const closeMenusOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMoreOpen(false);
        setIsShareOpen(false);
        setIsDownloadOpen(false);
      }
    };

    document.addEventListener('pointerdown', closeMenusOutside);
    document.addEventListener('keydown', closeMenusOnEscape);

    return () => {
      document.removeEventListener('pointerdown', closeMenusOutside);
      document.removeEventListener('keydown', closeMenusOnEscape);
    };
  }, [isMoreOpen, isShareOpen, isDownloadOpen]);

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
    if (!isPremium && selectedSongs.some((song) => song.premium_only)) {
      requestVipAccess();
      return;
    }
    downloadSongFiles(selectedSongs);
    setShareStatus(`Đang tải ${selectedSongs.length} bài đã chọn.`);
  };

  const handleDownloadTier = (tier: DownloadTier) => {
    const selectedQualities = songs.map((song) => qualityForSong(song, tier));
    const selectedTier = downloadTiers.find((item) => item.id === tier);
    const requiresVip = Boolean(selectedTier?.premium)
      || selectedQualities.some((quality) => quality?.premium_only)
      || songs.some((song) => song.premium_only);
    if (requiresVip && !isPremium) {
      setIsDownloadOpen(false);
      requestVipAccess();
      return;
    }

    if (selectedQualities.some((quality) => quality === undefined)) {
      setShareStatus('Một số bài chưa có file tải ở chất lượng này.');
      setIsDownloadOpen(false);
      return;
    }

    const accessToken = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    selectedQualities.forEach((quality, index) => {
      const song = songs[index];
      if (!song) return;

      let url = getSongDownloadUrl(song, quality?.quality_id);
      if (quality?.premium_only && accessToken) {
        const downloadUrl = new URL(url, window.location.origin);
        downloadUrl.searchParams.set('access_token', accessToken);
        url = downloadUrl.toString();
      }

      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${song.title.replace(/[\\/:*?"<>|]/g, '_')}.mp3`;
      anchor.rel = 'noopener noreferrer';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    });

    setShareStatus(`Đang tải ${songs.length} bài ở chất lượng ${selectedTier?.label ?? ''}.`);
    setIsDownloadOpen(false);
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
    if (isFavoritePending || playlist.visibility === 'private') return;

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

  const handleToggleVisibility = async () => {
    if (isVisibilityPending || !playlist.can_edit) return;

    const visibility = playlist.visibility === 'private' ? 'public' : 'private';
    setIsVisibilityPending(true);
    setIsMoreOpen(false);
    setShareStatus('');
    try {
      const response = await updateUserPlaylist(playlist.id, { name: playlist.name, visibility });
      setRequest((current) => current.slug === slug && current.playlist
        ? { ...current, playlist: { ...current.playlist, visibility: response.data.visibility, cover_url: response.data.cover_url } }
        : current);
      await refreshPlaylistAfterChange(visibility === 'private' ? 'Playlist đã được chuyển sang riêng tư.' : 'Playlist đã được chuyển sang công khai.');
    } catch {
      setShareStatus('Không thể đổi chế độ hiển thị playlist. Vui lòng thử lại.');
    } finally {
      setIsVisibilityPending(false);
    }
  };

  const handleDeletePlaylist = async () => {
    if (isDeletePending || !playlist.can_edit) return;

    setIsDeletePending(true);
    setDeleteError('');
    try {
      await deleteUserPlaylist(playlist.id);
      refreshLibrary();
      setIsDeleteDialogOpen(false);
      router.replace('/me');
    } catch {
      setDeleteError('Không thể xóa playlist lúc này. Vui lòng thử lại.');
    } finally {
      setIsDeletePending(false);
    }
  };

  const scrollToCollaborators = () => {
    document.getElementById('playlist-collaborators')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const refreshPlaylistAfterChange = async (message: string) => {
    setShareStatus(message);
    refreshLibrary();
    try {
      const response = await getPlaylist(playlist.slug || playlist.id, getVisitorId());
      setRequest({ slug, playlist: response.data, visibleCount: request.visibleCount, isLoading: false, error: '' });
    } catch {
      // Keep the current playlist view usable even if a refresh request fails.
    }
  };

  const handlePlaylistSaved = async (updated: { slug: string; name: string; cover_url: string | null }) => {
    setRequest((current) => current.slug === slug && current.playlist
      ? { ...current, playlist: { ...current.playlist, name: updated.name, cover_url: updated.cover_url } }
      : current);
    await refreshPlaylistAfterChange('Đã cập nhật playlist.');
  };

  return (
    <main className="min-h-[calc(100vh-80px)] overflow-x-hidden bg-[#202a28] px-5 pb-20 pt-7 text-white sm:px-8 lg:px-7">
      <div className="w-full max-w-[1582px]">
        <section className="grid gap-6 lg:grid-cols-[248px_minmax(0,1fr)] lg:items-stretch">
          <div role="img" aria-label={`Ảnh bìa ${playlist.name}`} className="group/playlist-cover relative aspect-square w-full max-w-[248px] rounded-[8px] bg-cover bg-center" style={{ backgroundImage: `url("${coverUrl}")` }}>
            {playlist.can_edit ? <button type="button" onClick={() => setIsEditPlaylistOpen(true)} className="absolute inset-0 grid place-content-center gap-2 rounded-[8px] bg-black/55 text-center font-bold text-white opacity-0 transition-opacity group-hover/playlist-cover:opacity-100 group-focus-within/playlist-cover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="mx-auto size-10 fill-none stroke-current stroke-[1.8]"><path d="m14.5 5.5 4 4M4 20l4.2-.8L19 8.4a2.8 2.8 0 0 0-4-4L4.2 15.2 4 20Z" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Chỉnh sửa
            </button> : null}
          </div>

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
                {playlist.visibility !== 'private' ? <button type="button" aria-label={isFavorite ? 'Bỏ yêu thích playlist' : 'Thêm playlist vào yêu thích'} aria-pressed={isFavorite} disabled={isFavoritePending} onClick={() => void handleFavorite()} className="group flex min-w-8 flex-col items-center gap-1 rounded-full px-1.5 py-1 text-white outline-none focus-visible:ring-2 focus-visible:ring-[#00d3e5] disabled:cursor-wait disabled:opacity-60">
                  <span className="grid size-8 place-items-center"><HeartIcon filled={isFavorite} /></span>
                  <span className="text-[11px] font-bold text-white">{favoriteCount}</span>
                </button> : null}
                <div className="relative">
                  <button type="button" aria-label="Chia sẻ playlist" aria-haspopup="menu" aria-controls="playlist-share-menu" aria-expanded={isShareOpen} disabled={isSharePending} onClick={() => { setIsMoreOpen(false); setIsDownloadOpen(false); setIsShareOpen((current) => !current); }} className="group flex min-w-8 flex-col items-center gap-1 rounded-full px-1.5 py-1 text-white outline-none focus-visible:ring-2 focus-visible:ring-[#00d3e5] disabled:cursor-wait disabled:opacity-60">
                    <span className="grid size-8 place-items-center"><ShareIcon /></span>
                    <span className="text-[11px] font-bold text-white">{shareCount}</span>
                  </button>
                  {isShareOpen ? <div id="playlist-share-menu" role="menu" aria-label="Chia sẻ playlist" className="absolute left-0 top-full z-30 mt-2 w-56 overflow-hidden rounded-xl border border-white/[0.06] bg-[#292c2b] p-1.5 text-[13px] font-bold text-white shadow-2xl">
                    <button type="button" role="menuitem" disabled={isSharePending} onClick={() => void handleShare('facebook')} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white/[0.09] hover:text-[#00d3e5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00d3e5] disabled:opacity-60"><FacebookIcon />Facebook</button>
                    <button type="button" role="menuitem" disabled={isSharePending} onClick={() => void handleShare('copy_link')} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white/[0.09] hover:text-[#00d3e5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00d3e5] disabled:opacity-60"><CopyLinkIcon />Sao chép đường dẫn</button>
                  </div> : null}
                </div>
                <div className="relative">
                  <button type="button" aria-label={playlist.can_edit ? 'Tùy chọn playlist' : 'Thêm tùy chọn'} aria-haspopup="menu" aria-controls="playlist-more-menu" aria-expanded={isMoreOpen} onClick={() => { setIsShareOpen(false); setIsDownloadOpen(false); setIsMoreOpen((current) => !current); }} className="grid size-10 place-items-center rounded-full bg-[#303c39] text-[13px] tracking-[0.08em] text-white outline-none transition-colors hover:bg-[#40504b] focus-visible:ring-2 focus-visible:ring-[#00d3e5]"><MoreHorizontalIcon /></button>
                  {isMoreOpen ? <div id="playlist-more-menu" role="menu" aria-label={playlist.can_edit ? 'Quản lý playlist' : 'Tùy chọn playlist'} className="absolute left-0 top-full z-20 mt-2 w-[230px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-white/[0.06] bg-[#292c2b] p-1 text-[13px] font-bold text-white shadow-2xl">
                    {playlist.can_edit ? <>
                      <button type="button" role="menuitem" onClick={() => { setIsMoreOpen(false); setIsAddSongsOpen(true); }} className="flex min-h-10 w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-white/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00d3e5]"><AddToPlaylistIcon />Thêm bài hát</button>
                      <button type="button" role="menuitem" disabled={isVisibilityPending} onClick={() => void handleToggleVisibility()} className="flex min-h-10 w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-white/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00d3e5] disabled:cursor-wait disabled:opacity-60">{playlist.visibility === 'private' ? <GlobeIcon /> : <LockIcon />}{playlist.visibility === 'private' ? 'Cài đặt ở chế độ công khai' : 'Cài đặt ở chế độ riêng tư'}</button>
                      <button type="button" role="menuitem" onClick={() => { setIsMoreOpen(false); setIsEditPlaylistOpen(true); }} className="flex min-h-10 w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-white/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00d3e5]"><EditIcon />Chỉnh sửa playlist</button>
                      <button type="button" role="menuitem" onClick={() => { setIsMoreOpen(false); setDeleteError(''); setIsDeleteDialogOpen(true); }} className="flex min-h-10 w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-white/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00d3e5]"><TrashIcon />Xóa playlist</button>
                    </> : <>
                      <button type="button" role="menuitem" onClick={() => { setIsMoreOpen(false); setIsShareOpen(true); }} className="flex min-h-10 w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors hover:bg-white/[0.09] hover:text-[#00d3e5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00d3e5]">Chia sẻ <span aria-hidden="true">›</span></button>
                      <button type="button" role="menuitem" onClick={handleReport} className="flex min-h-10 w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-white/[0.09] hover:text-[#00d3e5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00d3e5]"><span aria-hidden="true">⚑</span>Báo cáo</button>
                    </>}
                  </div> : null}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-4">
                <button type="button" onClick={handlePlayAll} className="inline-flex h-10 items-center gap-2 rounded-full bg-[#00cfe3] px-6 text-[14px] font-bold text-[#07363a] transition-colors hover:bg-[#34dbea]">{playlistIsPlaying ? <PauseIcon /> : <PlayGlyph className="ml-0.5 size-4" />}{playlistIsPlaying ? 'Tạm dừng' : 'Phát tất cả'}</button>
                <div ref={downloadControlRef} className="relative">
                  <button type="button" aria-label="Tải playlist về" aria-haspopup="menu" aria-controls="playlist-download-menu" aria-expanded={isDownloadOpen} onClick={() => { setIsMoreOpen(false); setIsShareOpen(false); setIsDownloadOpen((current) => !current); }} disabled={songs.length === 0} className="inline-flex h-10 items-center gap-2 rounded-full bg-[#3c4140] px-7 text-[14px] font-bold text-white transition-colors hover:bg-[#4a504e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00d3e5] disabled:cursor-not-allowed disabled:opacity-50"><DownloadIcon />Tải về</button>
                  {isDownloadOpen ? <div id="playlist-download-menu" role="menu" aria-label="Chất lượng tải playlist" className="absolute left-1/2 top-full z-30 mt-1 w-[270px] max-w-[calc(100vw-24px)] -translate-x-1/2 overflow-hidden rounded-xl border border-white/[0.06] bg-[#292c2b] p-1.5 text-[12px] font-bold text-white shadow-2xl">
                    {downloadTiers.map((tier) => {
                      const qualities = songs.map((song) => qualityForSong(song, tier.id));
                      const unavailable = qualities.some((quality) => quality === undefined);
                      const requiresVip = tier.premium || qualities.some((quality) => quality?.premium_only) || songs.some((song) => song.premium_only);
                      const disabled = unavailable && !(requiresVip && !isPremium);
                      const size = estimatedSizeMb(songs, tier);
                      const label = `${tier.label}${size ? ` (~${size})` : ''}`;

                      return <button key={tier.id} type="button" role="menuitem" disabled={disabled} title={disabled ? 'Không phải bài nào cũng có file ở chất lượng này' : undefined} onClick={() => handleDownloadTier(tier.id)} className="flex min-h-10 w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-white/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00d3e5] disabled:cursor-not-allowed disabled:opacity-45">
                        <span>{label}</span>
                        {requiresVip ? <span className="shrink-0 rounded bg-[#f4b84a] px-1.5 py-0.5 text-[10px] font-extrabold text-[#38240b]">VIP</span> : null}
                      </button>;
                    })}
                  </div> : null}
                </div>
              </div>
            </div>
            <span className="sr-only" aria-live="polite">{shareStatus}</span>
          </div>
        </section>

        <section aria-labelledby="playlist-songs-heading" className="mt-10">
          <h2 id="playlist-songs-heading" className="sr-only">Danh sách bài hát trong playlist</h2>
          {selectedIds.length > 0 ? (
            <div className="mb-3 flex min-h-8 flex-wrap items-center gap-2">
              <SelectionCheckbox checked={allSongsSelected} label="Chọn tất cả bài hát" onChange={toggleAllSongs} />
              <button type="button" onClick={() => setIsPlaylistDialogOpen(true)} className="inline-flex h-8 items-center gap-2 rounded-full border border-white/45 px-3 text-[12px] font-bold text-white transition-colors hover:border-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"><PlaylistAddIcon />Thêm vào playlist</button>
              <button type="button" onClick={() => void handleAddSelectedToFavorites()} className="inline-flex h-8 items-center gap-2 rounded-full border border-white/45 px-3 text-[12px] font-bold text-white transition-colors hover:border-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"><HeartIcon filled={false} className="size-[18px]" />Thêm vào Yêu thích</button>
              <button type="button" onClick={handleDownloadSelected} className="inline-flex h-8 items-center gap-2 rounded-full border border-white/45 px-3 text-[12px] font-bold text-white transition-colors hover:border-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"><DownloadIcon className="size-[18px]" />Tải về</button>
            </div>
          ) : (
            <div className="grid grid-cols-[32px_minmax(0,1fr)_56px_28px] gap-3 border-b border-white/10 px-2 pb-3 text-[13px] font-bold text-white/60 sm:grid-cols-[40px_minmax(0,1fr)_minmax(180px,0.8fr)_64px_32px] sm:gap-4"><span>#</span><span>Tiêu đề</span><span className="hidden sm:block">Nghệ sĩ</span><span className="grid size-5 place-items-center justify-self-end text-[18px] leading-none">◷</span><span aria-hidden="true" /></div>
          )}

          {visibleSongs.length > 0 ? <ol className="mt-2 space-y-0.5">{visibleSongs.map((song, index) => <PlaylistSongRow key={song.id} song={song} index={index} coverUrl={coverUrl} checked={selectedIds.includes(song.id)} onToggle={() => toggleSong(song.id)} onPlay={() => handlePlaySong(song)} isCurrentTrack={track?.id === song.id} isPlaying={isPlaying && track?.id === song.id} />)}</ol> : <div className="mt-8 flex flex-col items-center rounded-lg px-4 py-12 text-center">
            <p className="text-lg font-bold text-white">Playlist chưa có bài hát</p>
            {playlist.can_edit ? <><p className="mt-2 text-sm text-white/55">Chọn nhạc từ playlist, album yêu thích hoặc lịch sử nghe của bạn.</p><button type="button" onClick={() => setIsAddSongsOpen(true)} className="mt-5 h-11 rounded-full bg-[#3b3d3c] px-8 text-sm font-bold text-white transition-colors hover:bg-[#4a4d4c]">Thêm bài hát</button></> : null}
          </div>}
          {hasMoreSongs ? <button type="button" onClick={() => setRequest((current) => ({ ...current, visibleCount: current.visibleCount + 30 }))} className="mt-5 inline-flex items-center gap-2 text-[14px] font-bold text-white transition-colors hover:text-[#00d3e5]">Xem thêm <span aria-hidden="true">⌄</span></button> : null}
        </section>

        <AddSongsToPlaylistDialog songs={selectedSongs} open={isPlaylistDialogOpen} onClose={() => setIsPlaylistDialogOpen(false)} onAdded={setShareStatus} />
        {playlist.can_edit ? <>
          <AddSongsToOwnedPlaylistDialog
            playlistId={playlist.id}
            playlistName={playlist.name}
            existingSongs={songs}
            open={isAddSongsOpen}
            onClose={() => setIsAddSongsOpen(false)}
            onAdded={(message) => { void refreshPlaylistAfterChange(message); }}
          />
          {isEditPlaylistOpen ? <EditUserPlaylistDialog
            playlist={playlist}
            onClose={() => setIsEditPlaylistOpen(false)}
            onSaved={(updated) => { void handlePlaylistSaved(updated); }}
          /> : null}
        </> : null}

        {playlist.can_edit && isDeleteDialogOpen ? <div className="fixed inset-0 z-[130] grid place-items-center bg-black/70 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !isDeletePending) setIsDeleteDialogOpen(false); }}>
          <section role="alertdialog" aria-modal="true" aria-labelledby="delete-playlist-title" aria-describedby="delete-playlist-description" className="w-full max-w-[460px] rounded-2xl border border-white/10 bg-[#202120] p-6 text-white shadow-2xl">
            <h2 id="delete-playlist-title" className="text-xl font-extrabold">Xóa playlist?</h2>
            <p id="delete-playlist-description" className="mt-3 text-sm leading-6 text-white/65">Playlist “{playlist.name}” và danh sách bài hát bên trong sẽ bị xóa. Bạn không thể hoàn tác thao tác này.</p>
            {deleteError ? <p role="alert" className="mt-4 text-sm text-rose-300">{deleteError}</p> : null}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeletePending} className="h-10 rounded-full bg-[#393b3a] px-5 font-bold text-white hover:bg-[#4a4d4c] disabled:opacity-50">Hủy</button>
              <button type="button" onClick={() => void handleDeletePlaylist()} disabled={isDeletePending} className="h-10 rounded-full bg-rose-600 px-5 font-bold text-white hover:bg-rose-500 disabled:cursor-wait disabled:opacity-60">{isDeletePending ? 'Đang xóa…' : 'Xóa playlist'}</button>
            </div>
          </section>
        </div> : null}

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
