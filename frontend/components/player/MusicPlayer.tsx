'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type Ref } from 'react';

import { ArtistNames } from '@/components/artists';
import { PlayGlyph } from '@/components/icons/PlayGlyph';
import { copyTextToClipboard } from '@/lib/clipboard';
import { SongRowActionMenu } from '@/components/songs/SongRowActionMenu';
import { getCachedSongFavorite, getVisitorId, recordSongShare, setSongFavorite } from '@/lib/api';
import { songPath } from '@/lib/recent-history';
import { formatPlaybackTime } from '@/lib/lyrics';

import { usePlayer } from './PlayerProvider';
import PlayerLyrics from './PlayerLyrics';
import PlayerQueue from './PlayerQueue';

function PlayerButton({ label, children, className = '', onClick, disabled = false, pressed, expanded, controls, buttonRef }: { label: string; children: React.ReactNode; className?: string; onClick?: () => void; disabled?: boolean; pressed?: boolean; expanded?: boolean; controls?: string; buttonRef?: Ref<HTMLButtonElement> }) {
  return (
    <button
      type="button"
      ref={buttonRef}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={pressed}
      aria-expanded={expanded}
      aria-controls={controls}
      className={`grid shrink-0 place-items-center rounded-full text-white/65 outline-none transition-colors hover:text-white disabled:cursor-not-allowed disabled:text-white/25 disabled:hover:text-white/25 focus-visible:ring-2 focus-visible:ring-[#00d3e5] ${className}`}
    >
      {children}
    </button>
  );
}

function EmptyPlayerIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 fill-none stroke-current stroke-[1.7]"><path d="M5 12v2m3-5v8m4-11v14m4-10v6m3-4v2" strokeLinecap="round" /></svg>;
}

function ShuffleIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-none stroke-current stroke-[1.8]"><path d="M16 3h5v5m0-5-6.5 6.5M3 7h2.5c2.8 0 4.1 1.2 5.5 3m0 4c1.4 1.8 2.7 3 5.5 3H21m0 0-5 4m5-4-5-4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function PreviousIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 fill-current"><path d="M6 5h2v14H6zM19 6.3v11.4a1.3 1.3 0 0 1-2 1.05l-7.4-5.7a1.3 1.3 0 0 1 0-2.1L17 5.25a1.3 1.3 0 0 1 2 1.05Z" /></svg>;
}

function NextIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 fill-current"><path d="M16 5h2v14h-2zM5 6.3v11.4a1.3 1.3 0 0 0 2 1.05l7.4-5.7a1.3 1.3 0 0 0 0-2.1L7 5.25A1.3 1.3 0 0 0 5 6.3Z" /></svg>;
}

function RepeatIcon({ mode }: { mode: 'off' | 'all' | 'one' }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="svg-icon size-6 fill-current">
    <defs>
      <symbol id="icon-player_refresh_icon" viewBox="8 8 24 24">
        <path d="M20 13.328c-1.14 0-2.203.266-3.172.813a6.699 6.699 0 0 0-2.406 2.171 6.645 6.645 0 0 0-1.094 3.094.545.545 0 0 1-.187.438.641.641 0 0 1-.454.156c-.171 0-.328-.078-.468-.219a.588.588 0 0 1-.172-.531 7.44 7.44 0 0 1 1.547-4.047c.937-1.219 2.094-2.094 3.5-2.64 1.406-.547 2.843-.704 4.312-.422a7.881 7.881 0 0 1 3.922 1.89v-1.39c0-.172.063-.329.188-.454.125-.124.297-.187.515-.187.172 0 .328.063.453.188a.626.626 0 0 1 .188.453v2.765c0 .36-.125.656-.375.89-.25.235-.531.36-.86.392h-2.765a.563.563 0 0 1-.453-.204.727.727 0 0 1-.188-.484h-.062c0-.172.078-.328.218-.453a.699.699 0 0 1 .485-.188h2.078a7.187 7.187 0 0 0-2.188-1.5A6.542 6.542 0 0 0 20 13.33ZM27.313 20c.171 0 .328.078.468.219.14.14.203.312.172.531a7.44 7.44 0 0 1-1.547 4.047c-.937 1.219-2.093 2.094-3.5 2.64-1.406.547-2.843.704-4.312.422a7.881 7.881 0 0 1-3.922-1.89v1.343a.684.684 0 0 1-.188.5.626.626 0 0 1-.453.188h-.062a.626.626 0 0 1-.453-.188.684.684 0 0 1-.188-.5v-2.718c0-.36.125-.672.375-.907.25-.25.531-.359.86-.328h2.765c.188 0 .328.063.453.188a.997.997 0 0 1 .25.453h-.062a.626.626 0 0 1-.188.453.601.601 0 0 1-.453.188H15.25c.922.953 2.016 1.578 3.281 1.859 1.266.297 2.516.203 3.735-.234a6.396 6.396 0 0 0 3.015-2.22 6.903 6.903 0 0 0 1.39-3.452c0-.188.063-.328.188-.438a.641.641 0 0 1 .453-.156Z" />
      </symbol>
      <symbol id="icon-player_refresh_one_icon" viewBox="8 8 24 24">
        <path d="M18.14 23.047h3.297v-1.078h-3.296v1.078Zm1.063-.438h1.172v-5.968h-.64l-1.766.906.265 1.015 1.282-.64-.313-.422v5.11Zm7.469-2.015c0-.188.062-.328.187-.438a.641.641 0 0 1 .453-.156c.172 0 .329.078.47.219.14.14.202.312.171.531a7.968 7.968 0 0 1-1.094 3.36 8.293 8.293 0 0 1-2.437 2.562 7.51 7.51 0 0 1-3.297 1.25 8.142 8.142 0 0 1-3.531-.297 7.941 7.941 0 0 1-3.032-1.766 7.578 7.578 0 0 1-2-2.922 7.73 7.73 0 0 1-.53-3.5 7.785 7.785 0 0 1 1.015-3.359 7.488 7.488 0 0 1 2.39-2.61 7.883 7.883 0 0 1 3.282-1.327 7.81 7.81 0 0 1 3.5.203 8.499 8.499 0 0 1 3.11 1.687v-1.39c0-.172.062-.329.187-.454.125-.124.297-.187.515-.187.172 0 .328.063.453.188a.626.626 0 0 1 .188.453v2.765c0 .36-.125.656-.375.89-.25.235-.531.36-.86.392h-2.765a.563.563 0 0 1-.453-.204.727.727 0 0 1-.188-.484h-.062c0-.172.078-.344.218-.484a.65.65 0 0 1 .485-.204h2.078a6.61 6.61 0 0 0-2.516-1.578c-.953-.343-1.953-.453-2.984-.343a6.516 6.516 0 0 0-2.844.984 6.525 6.525 0 0 0-2.11 2.125 6.782 6.782 0 0 0-.968 2.828 6.64 6.64 0 0 0 .375 2.969c.36.953.906 1.797 1.625 2.5a6.455 6.455 0 0 0 2.531 1.547 6.713 6.713 0 0 0 3 .297 6.347 6.347 0 0 0 2.828-1.047 6.589 6.589 0 0 0 2.047-2.157 6.956 6.956 0 0 0 .938-2.843Z" />
      </symbol>
    </defs>
    <use href={mode === 'one' ? '#icon-player_refresh_one_icon' : '#icon-player_refresh_icon'} />
  </svg>;
}

function VolumeIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-none stroke-current stroke-[1.7]"><path d="M4 10v4h3l4 3V7l-4 3H4Zm11.5-2.5a6.3 6.3 0 0 1 0 9M18 5a10 10 0 0 1 0 14" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function LyricsIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-none stroke-current stroke-[1.7]"><path d="M8 18.5a2.5 2.5 0 1 1-2-2.45V7l11-2v9.5a2.5 2.5 0 1 1-2-2.45V8.1L8 9.55v8.95Z" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function QueueIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-none stroke-current stroke-[1.8]"><path d="M4 6h16M4 12h16M4 18h10" strokeLinecap="round" /></svg>;
}

function HeartIcon({ filled, className = 'size-5' }: { filled: boolean; className?: string }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className={filled ? `${className} fill-[#ff6f91] stroke-[#ff6f91]` : `${className} fill-none stroke-current stroke-[1.7]`}><path d="M12 20.2 3.8 12A5.2 5.2 0 0 1 11.15 4.65L12 5.5l.85-.85A5.2 5.2 0 0 1 20.2 12L12 20.2Z" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function ShareIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 fill-current"><path d="M14 4 22 11l-8 7v-5c-5 0-8 1.5-11 6 1-8 4-12 11-12V4Z" /></svg>;
}

function playerArtists(track: { artist: string; artists?: { id: string | null; name: string; slug?: string | null }[] }) {
  if (track.artists?.length) return track.artists;

  return track.artist
    .split(',')
    .map((name) => name.trim())
    .filter((name) => name && name !== 'Nghệ sĩ chưa cập nhật')
    .map((name) => ({ name }));
}

function formatCount(count: number) {
  return new Intl.NumberFormat('vi-VN').format(count);
}

export default function MusicPlayer() {
  const { track, isPremium, isPlaying, isLoading, shuffle, repeatMode, volume, elapsed, duration, notice, togglePlay, playPrevious, playNext, seek, toggleShuffle, cycleRepeat, setVolume, setQuality, refreshTrackMetadata } = usePlayer();
  const [panel, setPanel] = useState<'volume' | 'queue' | 'quality' | null>(null);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const lyricsVisible = lyricsOpen && Boolean(track);
  const lyricsWasOpen = useRef(false);
  const playerRootRef = useRef<HTMLDivElement>(null);
  const lyricsButtonRef = useRef<HTMLButtonElement>(null);
  const queueButtonRef = useRef<HTMLButtonElement>(null);
  const [qualityRefreshing, setQualityRefreshing] = useState(false);
  const qualityControlRef = useRef<HTMLDivElement>(null);
  const qualityButtonRef = useRef<HTMLButtonElement>(null);
  const [favoriteState, setFavoriteState] = useState<{ songId: string; favorited: boolean }>({ songId: '', favorited: false });
  const [engagementCounts, setEngagementCounts] = useState<Record<string, { favorites: number; shares: number }>>({});
  const [isFavoritePending, setIsFavoritePending] = useState(false);
  const [actionFeedback, setActionFeedback] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const [sharePending, setSharePending] = useState(false);
  const shareControlRef = useRef<HTMLDivElement>(null);
  const shareButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!actionFeedback) return;
    const timeout = window.setTimeout(() => setActionFeedback(''), 4000);
    return () => window.clearTimeout(timeout);
  }, [actionFeedback]);
  const displayDuration = duration || track?.durationSeconds || 0;
  const displayElapsed = Math.min(elapsed, displayDuration);
  const visibleArtists = track ? playerArtists(track) : [];
  const isLiked = Boolean(track && (favoriteState.songId === track.id
    ? favoriteState.favorited
    : getCachedSongFavorite(track.id) ?? track.isFavorite ?? false));
  const favoriteCount = track ? engagementCounts[track.id]?.favorites ?? track.favoriteCount ?? 0 : 0;
  const shareCount = track ? engagementCounts[track.id]?.shares ?? track.shareCount ?? 0 : 0;
  const activeTrackId = track?.id;
  const qualityOptions = [...(track?.audioQualities ?? [])].sort((left, right) => {
    const rank = (quality: typeof left) => /lossless|flac|alac/i.test(quality.label)
      ? Number.MAX_SAFE_INTEGER
      : quality.bitrate ?? (Number.parseInt(quality.label, 10) || Number.MAX_SAFE_INTEGER - 1);
    return rank(left) - rank(right);
  });

  const closeLyrics = useCallback(() => {
    setLyricsOpen(false);
    setPanel(null);
  }, []);

  const closeQueue = useCallback(() => {
    setPanel(null);
    queueButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!panel && !lyricsVisible) return;
    const close = (event: KeyboardEvent) => {
      // Do not dismiss the player underneath an authentication/action dialog.
      if (event.key !== 'Escape' || !(event.target instanceof Node)) return;
      if (event.target !== document.body && !playerRootRef.current?.contains(event.target)) return;
      if (shareOpen) {
        setShareOpen(false);
        shareButtonRef.current?.focus();
      } else if (panel === 'queue') closeQueue();
      else if (panel) {
        setPanel(null);
        if (panel === 'quality') qualityButtonRef.current?.focus();
      } else closeLyrics();
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [panel, lyricsVisible, shareOpen, closeLyrics, closeQueue]);

  useEffect(() => {
    if (!shareOpen) return;
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !shareControlRef.current?.contains(event.target)) setShareOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [shareOpen]);

  useEffect(() => {
    if (!lyricsVisible) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const keepFocusInPlayer = (event: KeyboardEvent) => {
      const root = playerRootRef.current;
      if (event.key !== 'Tab' || !root || !root.contains(document.activeElement)) return;
      const focusable = Array.from(root.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), summary, [tabindex="0"]')).filter((element) => element.getClientRects().length > 0);
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', keepFocusInPlayer);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', keepFocusInPlayer);
    };
  }, [lyricsVisible]);

  useEffect(() => {
    if (lyricsVisible) lyricsWasOpen.current = true;
    else if (lyricsWasOpen.current) {
      lyricsWasOpen.current = false;
      lyricsButtonRef.current?.focus();
    }
  }, [lyricsVisible]);

  useEffect(() => {
    if (panel !== 'quality') return;
    const closeOutside = (event: Event) => {
      if (event.target instanceof Node && !qualityControlRef.current?.contains(event.target)) {
        setPanel(null);
      }
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('focusin', closeOutside);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('focusin', closeOutside);
    };
  }, [panel]);

  useEffect(() => {
    const syncFavorite = (event: Event) => {
      const detail = (event as CustomEvent<{ songId: string; favorited: boolean }>).detail;
      if (activeTrackId && detail?.songId === activeTrackId) {
        setFavoriteState({ songId: detail.songId, favorited: detail.favorited });
      }
    };
    window.addEventListener('melodify:song-favorite', syncFavorite);
    return () => window.removeEventListener('melodify:song-favorite', syncFavorite);
  }, [activeTrackId]);

  const handleFavorite = async () => {
    if (!track || isFavoritePending) return;
    setIsFavoritePending(true);
    setActionFeedback('');
    try {
      const response = await setSongFavorite(track.id, !isLiked, getVisitorId());
      setFavoriteState({ songId: track.id, favorited: response.favorited });
      setEngagementCounts((current) => ({ ...current, [track.id]: { favorites: response.favorites, shares: current[track.id]?.shares ?? track.shareCount ?? 0 } }));
    } catch {
      setActionFeedback('Không thể cập nhật lượt yêu thích. Hãy kiểm tra kết nối API rồi thử lại.');
    } finally {
      setIsFavoritePending(false);
    }
  };

  const handleShare = async (source: 'facebook' | 'copy_link') => {
    if (!track || sharePending) return;
    const url = new URL(songPath({ id: track.id, slug: track.slug ?? null, title: track.title }), window.location.origin).toString();
    setActionFeedback('');
    if (source === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'noopener,noreferrer');
    } else {
      try {
        await copyTextToClipboard(url);
      } catch {
        setShareOpen(false);
        setActionFeedback('Không thể sao chép liên kết. Hãy thử lại hoặc kiểm tra quyền clipboard của trình duyệt.');
        return;
      }
    }

    setShareOpen(false);
    setSharePending(true);
    try {
      const response = await recordSongShare(track.id, source === 'facebook' ? 'web' : 'copy_link', getVisitorId());
      setEngagementCounts((current) => ({ ...current, [track.id]: { favorites: current[track.id]?.favorites ?? track.favoriteCount ?? 0, shares: response.shares } }));
      setActionFeedback(source === 'facebook' ? 'Đã mở chia sẻ Facebook.' : 'Đã sao chép đường dẫn.');
    } catch {
      setActionFeedback('Đã chia sẻ nhưng máy chủ chưa ghi nhận lượt chia sẻ. Hãy kiểm tra kết nối API.');
    } finally {
      setSharePending(false);
    }
  };

  return (
    <div ref={playerRootRef} className={lyricsVisible ? 'fixed inset-0 z-40' : undefined} role={lyricsVisible ? 'dialog' : undefined} aria-modal={lyricsVisible ? true : undefined} aria-label={lyricsVisible ? 'Lời bài hát toàn màn hình' : undefined}>
    {lyricsVisible && track ? <PlayerLyrics track={track} elapsed={displayElapsed} duration={displayDuration} onSeek={seek} onClose={closeLyrics} actions={<>
      <button type="button" aria-label={`${isLiked ? 'Bỏ yêu thích' : 'Yêu thích'} ${track.title}, ${formatCount(favoriteCount)} lượt tim`} aria-pressed={isLiked} disabled={isFavoritePending} onClick={() => void handleFavorite()} className="grid min-w-[46px] justify-items-center gap-0.5 rounded-lg px-1 py-1 text-white/85 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-cyan-300 disabled:opacity-50"><HeartIcon filled={isLiked} className="size-6" /><span className="text-[11px] leading-4 tabular-nums">{formatCount(favoriteCount)}</span></button>
      <div ref={shareControlRef} className="relative">
        <button ref={shareButtonRef} type="button" aria-label={`Chia sẻ ${track.title}, ${formatCount(shareCount)} lượt chia sẻ`} aria-haspopup="menu" aria-expanded={shareOpen} disabled={sharePending} onClick={() => setShareOpen((open) => !open)} className="grid min-w-[46px] justify-items-center gap-0.5 rounded-lg px-1 py-1 text-white/85 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-cyan-300 disabled:opacity-50"><ShareIcon /><span className="text-[11px] leading-4 tabular-nums">{formatCount(shareCount)}</span></button>
        {shareOpen ? <div role="menu" aria-label="Chia sẻ bài hát" className="absolute bottom-full left-1/2 z-20 mb-3 w-52 -translate-x-1/2 overflow-hidden rounded-xl border border-white/10 bg-[#292c2b] p-1.5 text-[13px] font-bold text-white shadow-2xl">
          <button type="button" role="menuitem" onClick={() => void handleShare('facebook')} className="block w-full rounded-lg px-3 py-2.5 text-left hover:bg-white/10 hover:text-[#00d3e5] focus-visible:outline-2 focus-visible:outline-cyan-300">Facebook</button>
          <button type="button" role="menuitem" onClick={() => void handleShare('copy_link')} className="block w-full rounded-lg px-3 py-2.5 text-left hover:bg-white/10 hover:text-[#00d3e5] focus-visible:outline-2 focus-visible:outline-cyan-300">Sao chép đường dẫn</button>
        </div> : null}
      </div>
              <SongRowActionMenu placement="up" buttonClassName="!size-10" iconClassName="size-6" onStatus={setActionFeedback} onShareRecorded={(shares) => setEngagementCounts((current) => ({ ...current, [track.id]: { favorites: current[track.id]?.favorites ?? track.favoriteCount ?? 0, shares } }))} downloadUrl={track.downloadUrl} song={{ id: track.id, slug: track.slug ?? null, title: track.title, duration_seconds: track.durationSeconds, artist: track.artists?.[0] ?? null, artists: track.artists, cover_url: track.coverUrl, audio_url: track.audioUrl, audio_qualities: track.audioQualities, download_url: track.downloadUrl, preview_url: null, premium_only: track.premiumOnly }} />
    </>} /> : null}
    <div role="region" aria-label="Trình phát nhạc" className={`fixed bottom-0 left-0 z-50 flex w-full flex-col px-2.5 py-1.5 text-white sm:px-3 ${lyricsVisible ? 'h-[98px] bg-transparent' : 'h-[74px] border-t border-white/[0.04] bg-[#242424] shadow-[0_-12px_30px_rgba(0,0,0,0.2)]'}`}>
      {lyricsVisible && track ? <div className="flex h-6 shrink-0 items-center gap-2 px-5 text-[11px] tabular-nums text-white/70 sm:px-9">
        <span>{formatPlaybackTime(displayElapsed)}</span>
        <input aria-label="Tiến trình trong lời bài hát" type="range" min="0" max={displayDuration} step="0.01" value={displayElapsed} onChange={(event) => seek(Number(event.target.value))} className="h-1 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-white/20 accent-white" />
        <span>{formatPlaybackTime(displayDuration)}</span>
      </div> : null}
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 lg:grid-cols-[minmax(240px,350px)_minmax(280px,1fr)_minmax(220px,350px)] lg:gap-4">
        {track ? (
          <div className="flex min-w-0 items-center gap-2.5">
            <div role="img" aria-label={`Ảnh bìa ${track.title}`} className={`${lyricsVisible ? 'hidden lg:block lg:size-[46px]' : 'size-[46px]'} shrink-0 rounded-md bg-cover bg-center`} style={{ backgroundImage: `url("${track.coverUrl}")` }} />
            <div className="min-w-0">
              <Link href={songPath({ id: track.id, slug: track.slug ?? null, title: track.title })} className="block truncate text-sm font-bold transition-colors hover:text-[#00d3e5] focus-visible:text-[#00d3e5] focus-visible:outline-none">{track.title}</Link>
              <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
                {visibleArtists.length ? <ArtistNames artists={visibleArtists} className="truncate text-xs text-white/60" /> : <span className="truncate text-xs text-white/60">{track.artist}</span>}
                {track.previewLimitSeconds !== null ? <span className="shrink-0 rounded bg-[#ffcf66]/20 px-1 text-[9px] font-bold text-[#ffcf66]">30s</span> : null}
              </div>
            </div>
            <div className="ml-auto hidden items-center gap-2 sm:flex">
              <button type="button" aria-label={isLiked ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'} aria-pressed={isLiked} disabled={isFavoritePending} onClick={() => void handleFavorite()} className="grid size-7 place-items-center rounded-full text-white/65 outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-[#00d3e5] disabled:cursor-wait disabled:opacity-50"><HeartIcon filled={isLiked} /></button>
              <SongRowActionMenu placement="up" onStatus={setActionFeedback} onShareRecorded={(shares) => setEngagementCounts((current) => ({ ...current, [track.id]: { favorites: current[track.id]?.favorites ?? track.favoriteCount ?? 0, shares } }))} downloadUrl={track.downloadUrl} song={{ id: track.id, slug: track.slug ?? null, title: track.title, duration_seconds: track.durationSeconds, artist: track.artists?.[0] ?? null, artists: track.artists, cover_url: track.coverUrl, audio_url: track.audioUrl, audio_qualities: track.audioQualities, download_url: track.downloadUrl, preview_url: null, premium_only: track.premiumOnly }} />
            </div>
          </div>
        ) : (
          <div className="flex min-w-0 items-center gap-2.5 text-white/75">
            <div className="grid size-[46px] shrink-0 place-items-center rounded-md bg-white/20 text-white/45"><EmptyPlayerIcon /></div>
            <p className="truncate text-sm font-bold">Chọn bài hát để phát</p>
          </div>
        )}

        <div className="hidden min-w-0 flex-col items-center justify-center gap-1 lg:flex">
          <div className="flex items-center gap-3">
            <PlayerButton label="Phát ngẫu nhiên" pressed={shuffle} onClick={toggleShuffle} className={`size-5 ${shuffle ? '!text-[#00d3e5]' : ''}`} disabled={!track}><ShuffleIcon /></PlayerButton>
            <PlayerButton label="Bài trước" className="size-6" onClick={playPrevious} disabled={!track}><PreviousIcon /></PlayerButton>
            <button type="button" aria-label={isPlaying ? 'Tạm dừng' : 'Phát'} aria-pressed={isPlaying} onClick={togglePlay} disabled={!track} className="grid size-9 place-items-center rounded-full bg-white text-[#202020] outline-none transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:bg-white/25 disabled:text-white/40 disabled:hover:scale-100 focus-visible:ring-2 focus-visible:ring-[#00d3e5]">
              {isLoading ? <span role="status" aria-label="Đang tải âm thanh" className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : isPlaying ? <span className="flex gap-1"><span className="h-4 w-1 rounded-full bg-current" /><span className="h-4 w-1 rounded-full bg-current" /></span> : <PlayGlyph className="size-5" />}
            </button>
            <PlayerButton label="Bài tiếp theo" className="size-6" onClick={playNext} disabled={!track}><NextIcon /></PlayerButton>
            <PlayerButton label={repeatMode === 'one' ? 'Lặp lại một bài' : repeatMode === 'all' ? 'Lặp lại toàn bộ danh sách' : 'Bật lặp lại toàn bộ danh sách'} pressed={repeatMode !== 'off'} onClick={cycleRepeat} className={`relative size-6 ${repeatMode !== 'off' ? '!text-[#00d3e5]' : '!text-[#bdbdbd]'}`} disabled={!track}><RepeatIcon mode={repeatMode} /></PlayerButton>
          </div>
          {track && !lyricsVisible ? <div className="flex w-full max-w-[500px] items-center gap-1.5 text-[10px] tabular-nums text-white/45">
            <span>{formatPlaybackTime(displayElapsed)}</span>
            <input aria-label="Tiến trình bài hát" type="range" min="0" max={displayDuration} step="0.01" value={displayElapsed} onChange={(event) => seek(Number(event.target.value))} className="h-1 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-white/15 accent-white" />
            <span>{formatPlaybackTime(displayDuration)}</span>
          </div> : null}
        </div>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
          {lyricsVisible ? <PlayerButton label="Bài trước" onClick={playPrevious} className="size-7 lg:hidden" disabled={!track}><PreviousIcon /></PlayerButton> : null}
          <PlayerButton label={isPlaying ? 'Tạm dừng' : 'Phát'} onClick={togglePlay} className="size-9 bg-white !text-[#202020] lg:hidden" disabled={!track}>{isLoading ? <span role="status" aria-label="Đang tải âm thanh" className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : isPlaying ? <span className="font-bold">Ⅱ</span> : <PlayGlyph className="size-5" />}</PlayerButton>
          {lyricsVisible ? <PlayerButton label="Bài tiếp theo" onClick={playNext} className="size-7 lg:hidden" disabled={!track}><NextIcon /></PlayerButton> : null}
          {track ? <div ref={qualityControlRef} className="relative flex shrink-0 items-center">
            <button ref={qualityButtonRef} type="button" aria-label={`Chất lượng nghe: ${track.qualityLabel || 'mặc định'}`} aria-expanded={panel === 'quality'} aria-controls={panel === 'quality' ? 'player-audio-quality' : undefined} onClick={() => {
              if (panel === 'quality') {
                setPanel(null);
                return;
              }
              setPanel('quality');
              setQualityRefreshing(true);
              void refreshTrackMetadata().finally(() => setQualityRefreshing(false));
            }} className="inline-flex max-w-[80px] truncate rounded bg-white/75 px-1.5 py-0.5 text-[11px] font-semibold text-[#202020] outline-none hover:bg-white focus-visible:ring-2 focus-visible:ring-[#00d3e5] sm:max-w-none sm:text-xs">{track.qualityLabel || 'Mặc định'}</button>
            {panel === 'quality' ? <section id="player-audio-quality" aria-label="Chất lượng nghe" className="absolute bottom-[calc(100%+24px)] left-1/2 z-[60] w-[212px] max-w-[calc(100vw-24px)] -translate-x-1/2 overflow-hidden rounded-2xl border border-white/10 bg-[#282828] text-white shadow-[0_8px_28px_rgba(0,0,0,0.35)]">
              <h2 className="px-5 py-4 text-sm font-medium text-white/70">Chất lượng nghe</h2>
              {qualityOptions.length ? <ul className="max-h-[min(320px,50vh)] overflow-y-auto px-1 pb-1">
                {qualityOptions.map((quality) => {
                  const unavailable = quality.available === false || !quality.audio_url;
                  const requiresVip = track.premiumOnly || quality.premium_only;
                  const disabled = unavailable && !(requiresVip && !isPremium);
                  const selected = track.selectedQualityId === quality.quality_id;
                  return <li key={quality.quality_id}>
                    <button type="button" disabled={disabled} aria-pressed={selected} title={disabled ? 'Chất lượng này chưa có nguồn phát' : undefined} onClick={() => {
                      setQuality(quality.quality_id);
                      if (isPremium || (!track.premiumOnly && !quality.premium_only)) {
                        setPanel(null);
                        qualityButtonRef.current?.focus();
                      }
                    }} className="flex min-h-[50px] w-full items-center justify-between gap-3 rounded-xl px-4 text-left text-sm font-semibold outline-none transition-colors hover:bg-[#383838] focus-visible:bg-[#383838] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00d3e5] disabled:cursor-not-allowed disabled:opacity-40">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span className="truncate">{quality.label}</span>
                        {quality.premium_only ? <span className="shrink-0 rounded-sm bg-[#ffe0ae] px-1 text-[10px] font-extrabold leading-[14px] text-[#704b25]">VIP</span> : null}
                      </span>
                      {selected ? <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 shrink-0 fill-none stroke-[#00d3e5] stroke-2"><path d="m4 12 5 5L20 6" strokeLinecap="round" strokeLinejoin="round" /></svg> : null}
                    </button>
                  </li>;
                })}
              </ul> : <p role="status" className="px-5 pb-5 text-xs leading-5 text-white/60">{qualityRefreshing ? 'Đang tải chất lượng…' : 'Bài hát chưa có thông tin chất lượng.'}</p>}
              <span role="status" className="sr-only">{qualityRefreshing && qualityOptions.length ? 'Đang cập nhật chất lượng nghe' : ''}</span>
            </section> : null}
          </div> : null}
          <PlayerButton label="Âm lượng" pressed={panel === 'volume'} onClick={() => setPanel(panel === 'volume' ? null : 'volume')} className="hidden size-7 sm:grid" disabled={!track}><VolumeIcon /></PlayerButton>
          <PlayerButton buttonRef={lyricsButtonRef} label="Lời bài hát" pressed={lyricsVisible} expanded={lyricsVisible} controls={lyricsVisible ? 'player-lyrics' : undefined} onClick={() => {
            if (lyricsVisible) closeLyrics();
            else { setPanel(null); setLyricsOpen(true); }
          }} className={`size-7 ${lyricsVisible ? '!text-[#00d3e5]' : ''}`} disabled={!track}><LyricsIcon /></PlayerButton>
          <PlayerButton buttonRef={queueButtonRef} label="Danh sách phát" pressed={panel === 'queue'} expanded={panel === 'queue'} controls={panel === 'queue' ? 'player-queue' : undefined} onClick={() => setPanel(panel === 'queue' ? null : 'queue')} className={`size-7 ${panel === 'queue' ? '!text-[#00d3e5]' : ''}`} disabled={!track}><QueueIcon /></PlayerButton>
        </div>
      </div>
    </div>
    {panel === 'queue' ? <PlayerQueue onClose={closeQueue} onStatus={setActionFeedback} /> : null}
    {panel === 'volume' ? <section aria-label="Điều chỉnh âm lượng" className="fixed bottom-[82px] right-3 z-[60] max-h-[60vh] w-[min(360px,calc(100vw-24px))] overflow-y-auto rounded-xl border border-white/10 bg-[#242a28] p-4 text-white shadow-2xl">
      <div className="mb-3 flex items-center justify-between"><h2 className="font-bold">Âm lượng</h2><button type="button" aria-label="Đóng bảng điều khiển" onClick={() => setPanel(null)} className="size-8 rounded-full hover:bg-white/10">×</button></div>
      <div className="flex items-center gap-3"><button type="button" aria-label={volume === 0 ? 'Bật âm thanh' : 'Tắt âm thanh'} onClick={() => setVolume(volume === 0 ? 1 : 0)} className="rounded-lg px-2 py-1 hover:bg-white/10">{volume === 0 ? 'Bật' : 'Tắt'}</button><input type="range" aria-label="Mức âm lượng" min="0" max="1" step="0.01" value={volume} onChange={(event) => setVolume(Number(event.target.value))} className="min-w-0 flex-1 accent-[#00d3e5]" /><span className="w-10 text-right text-xs">{Math.round(volume * 100)}%</span></div>
    </section> : null}
    {notice ? <div role="status" className="fixed bottom-[88px] right-4 z-[60] max-w-[min(90vw,380px)] rounded-xl border border-cyan-200/20 bg-[#173d35] px-4 py-3 text-sm font-semibold text-cyan-50 shadow-2xl">{notice}</div> : null}
    {actionFeedback ? <div role="status" aria-live="polite" className={`fixed left-1/2 z-[70] max-w-[calc(100vw-24px)] -translate-x-1/2 rounded-xl border border-white/10 bg-[#202a28]/95 px-4 py-3 text-sm font-semibold text-white shadow-2xl ${lyricsVisible ? 'bottom-[108px]' : 'bottom-[84px]'}`}>{actionFeedback}</div> : null}
    </div>
  );
}
