'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SongRowActionMenu } from '@/components/songs/SongRowActionMenu';
import { usePlayer, usePlayerControls } from '@/components/player/PlayerProvider';
import { copyTextToClipboard } from '@/lib/clipboard';
import {
  getForYouArtists,
  getForYouSong,
  getSong,
  getSongLyrics,
  getVisitorId,
  listAllGenres,
  recordSongShare,
  toggleSongFavorite,
  type Artist,
  type GenreRecord,
  type Lyric,
  type Song,
} from '@/lib/api';
import { LyricText } from '@/components/player/LyricText';
import { activeLyricIndex, formatPlaybackTime, getPlainLyrics, parseSyncedLyrics } from '@/lib/lyrics';
import { recentItemsByCategory, songPath } from '@/lib/recent-history';

type Step = 1 | 2 | 3;

const genreColors = [
  'from-sky-500 to-blue-700',
  'from-rose-500 to-red-800',
  'from-cyan-500 to-sky-700',
  'from-emerald-500 to-green-800',
  'from-fuchsia-500 to-purple-800',
  'from-amber-500 to-orange-800',
  'from-violet-500 to-indigo-800',
  'from-indigo-500 to-blue-900',
  'from-lime-500 to-green-800',
  'from-pink-500 to-rose-800',
];

function toggleSelection(current: string[], id: string) {
  return current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
}

function HeartIcon({ filled }: { filled: boolean }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 fill-current"><path d="M12 21.1 3.4 12.7a5.8 5.8 0 0 1 8.2-8.2l.4.4.4-.4a5.8 5.8 0 0 1 8.2 8.2L12 21.1Z" className={filled ? 'text-[#ff3b66]' : 'text-white'} /></svg>;
}

function ShareIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 fill-current"><path d="M14 3 23 11l-9 8v-5C8.2 14 4.4 15.5 1 21c.7-8 4.3-12.1 13-12.8V3Z" /></svg>;
}

function formatCount(count: number | undefined) {
  return new Intl.NumberFormat('vi-VN').format(count ?? 0);
}

type ForYouSong = Song & {
  lyrics?: Lyric[];
  lyricsStatus?: 'loading' | 'ready' | 'error';
};

async function loadForYouLyrics(song: Song): Promise<ForYouSong> {
  try {
    const { data } = await getSongLyrics(song.slug || song.id);
    return { ...song, lyrics: data, lyricsStatus: 'ready' };
  } catch {
    return { ...song, lyrics: [], lyricsStatus: 'error' };
  }
}

function ForYouLyrics({ song, onRetry }: { song: ForYouSong; onRetry: () => void }) {
  const { track, elapsed, isPlaying, playSong, seek, togglePlay } = usePlayer();
  const pendingSeekRef = useRef<number | null>(null);
  const currentResult = { status: song.lyricsStatus ?? 'loading', lyrics: song.lyrics ?? [] };
  const syncedLines = useMemo(() => parseSyncedLyrics(currentResult.lyrics), [currentResult.lyrics]);
  const isActiveTrack = track?.id === song.id;
  const plainLyrics = useMemo(() => getPlainLyrics(currentResult.lyrics), [currentResult.lyrics]);
  const activeIndex = isActiveTrack ? activeLyricIndex(syncedLines, elapsed) : -1;

  useEffect(() => {
    const target = pendingSeekRef.current;
    if (track?.id !== song.id || target === null) return;

    pendingSeekRef.current = null;
    seek(target);
  }, [seek, song.id, track?.id]);

  const seekToLyric = (seconds: number) => {
    if (isActiveTrack) {
      seek(seconds);
      if (!isPlaying) togglePlay();
      return;
    }

    pendingSeekRef.current = seconds;
    playSong(song, [song], 'for_you');
  };

  if (!currentResult || currentResult.status === 'loading') {
    return <p role="status" className="mt-5 text-sm text-white/55">Đang tải lời bài hát…</p>;
  }
  if (currentResult.status === 'error') {
    return <div role="alert" className="mt-5 flex items-center gap-3 text-sm text-white/55">
      <span>Không tải được lời bài hát.</span>
      <button type="button" onClick={onRetry} className="font-semibold text-cyan-200 hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">Thử lại</button>
    </div>;
  }
  if (!syncedLines.length && !plainLyrics.trim()) {
    return <p className="mt-5 text-sm text-white/55">Lời bài hát sẽ sớm được cập nhật...</p>;
  }

  if (syncedLines.length > 0) {
    return <div className="mt-5 w-full max-w-[620px]">
      <div
        role="region"
        aria-label={`Lời bài hát ${song.title}; chọn câu để phát từ đó`}
        className="w-full px-3 text-center"
      >
        <div className="space-y-3 py-3">
          {syncedLines.map((line, index) => <button
              type="button"
              key={`${song.id}-${line.time}-${index}`}
              onClick={() => seekToLyric(line.time)}
              data-lyric-time={line.time}
              aria-label={line.text}
              aria-current={index === activeIndex ? 'true' : undefined}
              title={`Phát từ ${formatPlaybackTime(line.time)}`}
              className={`block w-full rounded px-2 py-1 text-center text-sm font-semibold leading-7 transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 sm:text-base ${index === activeIndex ? 'text-cyan-300 drop-shadow-[0_0_12px_rgba(34,211,238,0.25)]' : index < activeIndex ? 'text-white/35 hover:text-white/75' : 'text-white/60 hover:text-white/90'}`}
            ><LyricText line={line} elapsed={elapsed} active={index === activeIndex} /></button>)}
        </div>
      </div>
    </div>;
  }

  return <div role="region" aria-label={`Lời bài hát ${song.title}`} className="mt-5 w-full max-w-[620px] px-3 text-center">
    <div className="space-y-5 py-1">
      <p className="whitespace-pre-line text-sm font-semibold leading-[3] text-white/65 sm:text-base">{plainLyrics}</p>
    </div>
  </div>;
}

export default function ForYouPage() {
  const router = useRouter();
  const { track, isPlaying, playSong, togglePlay } = usePlayerControls();
  const [genres, setGenres] = useState<GenreRecord[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [selectedGenreIds, setSelectedGenreIds] = useState<string[]>([]);
  const [selectedArtistIds, setSelectedArtistIds] = useState<string[]>([]);
  const [step, setStep] = useState<Step>(1);
  const [song, setSong] = useState<ForYouSong | null>(null);
  const [isLoadingGenres, setIsLoadingGenres] = useState(true);
  const [isLoadingArtists, setIsLoadingArtists] = useState(false);
  const [isFindingSong, setIsFindingSong] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noMatch, setNoMatch] = useState(false);
  const requestId = useRef(0);
  const recommendationHistory = useRef<ForYouSong[]>([]);
  const recommendationIndex = useRef(-1);
  const [hasPreviousRecommendation, setHasPreviousRecommendation] = useState(false);
  const [isFavoritePending, setIsFavoritePending] = useState(false);
  const [isSharePending, setIsSharePending] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [actionStatus, setActionStatus] = useState('');

  useEffect(() => {
    let active = true;
    listAllGenres()
      .then((items) => {
        if (active) setGenres(items.filter((genre) => genre.status === 'active'));
      })
      .catch(() => {
        if (active) setError('Không tải được thể loại. Hãy thử tải lại.');
      })
      .finally(() => {
        if (active) setIsLoadingGenres(false);
      });
    return () => {
      active = false;
      requestId.current += 1;
    };
  }, []);

  const selectedGenres = useMemo(
    () => genres.filter((genre) => selectedGenreIds.includes(genre.id)),
    [genres, selectedGenreIds],
  );
  const minimumArtistCount = Math.min(3, artists.length);
  const selectionComplete = selectedArtistIds.length >= minimumArtistCount && minimumArtistCount > 0;

  const loadArtists = useCallback(async () => {
    if (!selectedGenreIds.length) return;
    setIsLoadingArtists(true);
    setError(null);
    setSelectedArtistIds([]);
    try {
      const response = await getForYouArtists(selectedGenreIds);
      setArtists(response.data);
      setStep(2);
    } catch {
      setError('Không tải được nghệ sĩ thuộc các thể loại đã chọn. Thử lại nhé.');
    } finally {
      setIsLoadingArtists(false);
    }
  }, [selectedGenreIds]);

  const findSong = useCallback(async (excludeSongIds: string[] = []) => {
    if (!selectedGenreIds.length || !selectedArtistIds.length) return;
    const currentRequest = ++requestId.current;
    setStep(3);
    setIsFindingSong(true);
    setNoMatch(false);
    setError(null);
    setActionStatus('');
    try {
      const response = await getForYouSong(selectedGenreIds, selectedArtistIds, excludeSongIds, getVisitorId());
      if (currentRequest !== requestId.current) return;
      if (!response.data) {
        if (recommendationIndex.current >= 0) {
          setActionStatus('Chưa tìm thấy bài đề xuất tiếp theo. Bạn có thể thử lại sau.');
        } else {
          setSong(null);
          setNoMatch(true);
        }
        return;
      }
      // Read lyrics before starting audio: a long-lived local audio stream can
      // otherwise block the lyrics request on single-worker PHP dev servers.
      const recommendedSong = await loadForYouLyrics(response.data);
      if (currentRequest !== requestId.current) return;
      setSong(recommendedSong);
      const nextHistory = [...recommendationHistory.current.slice(0, recommendationIndex.current + 1), recommendedSong];
      recommendationHistory.current = nextHistory;
      recommendationIndex.current = nextHistory.length - 1;
      setHasPreviousRecommendation(recommendationIndex.current > 0);
      setIsShareOpen(false);
      playSong(recommendedSong, [recommendedSong], 'for_you');
    } catch {
      if (currentRequest === requestId.current) {
        if (recommendationIndex.current >= 0) setActionStatus('Không tìm được bài tiếp theo. Hãy thử lại.');
        else setError('Có lỗi khi tìm bài hát. Hãy thử lại.');
      }
    } finally {
      if (currentRequest === requestId.current) setIsFindingSong(false);
    }
  }, [playSong, selectedArtistIds, selectedGenreIds]);

  const retryLyrics = async (songId: string) => {
    const target = recommendationHistory.current.find((item) => item.id === songId)
      ?? (song?.id === songId ? song : null);
    if (!target) return;

    const loadingSong: ForYouSong = { ...target, lyrics: [], lyricsStatus: 'loading' };
    recommendationHistory.current = recommendationHistory.current.map((item) => item.id === songId ? loadingSong : item);
    setSong((current) => current?.id === songId ? loadingSong : current);
    const updatedSong = await loadForYouLyrics(target);
    recommendationHistory.current = recommendationHistory.current.map((item) => item.id === songId ? updatedSong : item);
    setSong((current) => current?.id === songId ? updatedSong : current);
  };

  const closeFlow = useCallback(async () => {
    requestId.current += 1;
    if (track) {
      if (!isPlaying) togglePlay();
      router.replace('/home');
      return;
    }

    const recentSong = recentItemsByCategory('song')[0];
    if (recentSong) {
      try {
        const response = await getSong(recentSong.id);
        playSong(response.data, [response.data]);
      } catch {
        // Bài cũ có thể đã bị gỡ khỏi catalog; vẫn đóng luồng đề xuất.
      }
    }
    router.replace('/home');
  }, [isPlaying, playSong, router, togglePlay, track]);

  const handlePreviousSong = () => {
    const previousIndex = recommendationIndex.current - 1;
    const previousSong = recommendationHistory.current[previousIndex];
    if (!previousSong) return;
    recommendationIndex.current = previousIndex;
    setHasPreviousRecommendation(previousIndex > 0);
    setSong(previousSong);
    setIsShareOpen(false);
    setActionStatus('');
    playSong(previousSong, [previousSong], 'for_you');
  };

  const handleNextSong = () => {
    const nextIndex = recommendationIndex.current + 1;
    const nextSong = recommendationHistory.current[nextIndex];
    if (nextSong) {
      recommendationIndex.current = nextIndex;
      setHasPreviousRecommendation(nextIndex > 0);
      setSong(nextSong);
      setIsShareOpen(false);
      setActionStatus('');
      playSong(nextSong, [nextSong], 'for_you');
      return;
    }

    void findSong(recommendationHistory.current.map((item) => item.id));
  };

  const handleFavorite = async () => {
    if (!song || isFavoritePending) return;
    const targetSongId = song.id;
    const wasFavorited = Boolean(song.is_favorite);
    const previousCount = song.favorite_count ?? song.favorites ?? 0;
    setIsFavoritePending(true);
    setActionStatus('');
    setSong((current) => current?.id === targetSongId ? {
      ...current,
      is_favorite: !wasFavorited,
      favorite_count: Math.max(0, previousCount + (wasFavorited ? -1 : 1)),
    } : current);

    try {
      const result = await toggleSongFavorite(targetSongId, getVisitorId());
      setSong((current) => current?.id === targetSongId ? { ...current, is_favorite: result.favorited, favorite_count: result.favorites } : current);
    } catch {
      setSong((current) => current?.id === targetSongId ? { ...current, is_favorite: wasFavorited, favorite_count: previousCount } : current);
      setActionStatus('Chưa thể cập nhật lượt yêu thích. Vui lòng thử lại.');
    } finally {
      setIsFavoritePending(false);
    }
  };

  const handleShare = async (target: 'facebook' | 'copy_link') => {
    if (!song || isSharePending) return;
    const targetSong = song;
    const url = new URL(songPath(targetSong), window.location.origin).toString();
    if (target === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'noopener,noreferrer');
    } else {
      try {
        await copyTextToClipboard(url);
      } catch {
        setActionStatus('Không thể sao chép liên kết. Hãy thử lại.');
        setIsShareOpen(false);
        return;
      }
    }

    setIsShareOpen(false);
    setIsSharePending(true);
    setActionStatus('');
    try {
      const result = await recordSongShare(targetSong.id, target, getVisitorId());
      setSong((current) => current?.id === targetSong.id ? { ...current, share_count: result.shares, shares: result.shares } : current);
      setActionStatus(target === 'facebook' ? 'Đã mở chia sẻ trên Facebook.' : 'Đã sao chép liên kết bài hát.');
    } catch {
      setActionStatus(target === 'copy_link' ? 'Đã sao chép liên kết nhưng chưa ghi nhận lượt chia sẻ.' : 'Đã mở Facebook nhưng chưa ghi nhận lượt chia sẻ.');
    } finally {
      setIsSharePending(false);
    }
  };

  const title = step === 1
    ? 'Chọn thể loại bạn yêu thích'
    : step === 2
      ? 'Chọn nghệ sĩ bạn yêu thích'
      : song
        ? 'Gợi ý dành riêng cho bạn'
        : 'Đang tìm nhạc cho bạn!';

  return (
    <main className="relative min-h-[calc(100dvh-154px)] overflow-hidden bg-[#202a28] px-3 py-0 text-white sm:px-6">
      {song ? (
        <section className="relative mx-auto flex min-h-[calc(100dvh-202px)] max-w-[1320px] flex-col items-center justify-start px-2 pb-8 pt-5 sm:px-12">
          <div className="flex w-full flex-col items-center">
            <div className="mb-5 max-w-[min(90vw,620px)] text-center">
              <h1 className="break-words text-lg font-extrabold leading-snug sm:text-xl">{song.title}</h1>
              <p className="mt-1 text-sm font-medium text-white/65">{song.artists?.map((artist) => artist.name).join(', ') || song.artist?.name || 'Nghệ sĩ chưa cập nhật'}</p>
            </div>

            <div className="flex items-center gap-3 sm:gap-4">
              <div
                role="img"
                aria-label={`Ảnh bìa ${song.title}`}
                className="grid size-[min(68vw,248px)] shrink-0 place-items-center overflow-hidden rounded-[9px] bg-[#30443f] bg-cover bg-center"
                style={{ backgroundImage: song.cover_url ? `url("${song.cover_url}")` : undefined }}
              >
                {!song.cover_url && <span aria-hidden="true" className="text-6xl text-white/35">♫</span>}
              </div>

              <aside aria-label={`Tương tác với ${song.title}`} className="song-row-menu-host flex w-10 shrink-0 flex-col items-center gap-3 text-white">
                <button type="button" aria-label={song.is_favorite ? `Bỏ yêu thích ${song.title}` : `Yêu thích ${song.title}`} aria-pressed={Boolean(song.is_favorite)} disabled={isFavoritePending} onClick={() => void handleFavorite()} className="flex min-h-11 w-10 flex-col items-center justify-center gap-0.5 rounded-lg outline-none transition disabled:opacity-55 focus-visible:ring-2 focus-visible:ring-cyan-300">
                  <HeartIcon filled={Boolean(song.is_favorite)} />
                  <span className="text-[10px] font-bold leading-3 text-white/70">{formatCount(song.favorite_count ?? song.favorites)}</span>
                </button>
                <div className="relative">
                  <button type="button" aria-label={`Chia sẻ ${song.title}`} aria-expanded={isShareOpen} disabled={isSharePending} onClick={() => setIsShareOpen((open) => !open)} className="flex min-h-11 w-10 flex-col items-center justify-center gap-0.5 rounded-lg outline-none transition disabled:opacity-55 focus-visible:ring-2 focus-visible:ring-cyan-300">
                    <ShareIcon />
                    <span className="text-[10px] font-bold leading-3 text-white/70">{formatCount(song.share_count ?? song.shares)}</span>
                  </button>
                  {isShareOpen ? <div role="menu" aria-label="Chia sẻ bài hát" className="absolute left-full top-1/2 z-30 ml-2 w-48 -translate-y-1/2 overflow-hidden rounded-lg border border-white/10 bg-[#303c39] p-1 text-left text-sm font-semibold shadow-xl">
                    <button type="button" role="menuitem" onClick={() => void handleShare('facebook')} className="block w-full rounded-md px-3 py-2.5 text-left hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">Facebook</button>
                    <button type="button" role="menuitem" onClick={() => void handleShare('copy_link')} className="block w-full rounded-md px-3 py-2.5 text-left hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">Sao chép liên kết</button>
                  </div> : null}
                </div>
                <SongRowActionMenu
                  song={song}
                  placement="up"
                  buttonClassName="!size-9"
                  iconClassName="size-5"
                  onStatus={setActionStatus}
                  onShareRecorded={(shares) => setSong((current) => current?.id === song.id ? { ...current, share_count: shares, shares } : current)}
                  downloadUrl={song.download_url}
                />
                <span role="img" aria-label={`Nhà phát hành ${song.publisher || 'Melodify'}`} title={song.publisher || 'Melodify'} className="grid size-8 place-items-center overflow-hidden rounded-full bg-white text-[10px] font-extrabold uppercase text-[#202a28]">
                  {(song.publisher || 'Melodify').trim().slice(0, 2) || 'M'}
                </span>
              </aside>
            </div>

            <ForYouLyrics key={song.id} song={song} onRetry={() => void retryLyrics(song.id)} />
            <p role="status" aria-live="polite" className="mt-2 min-h-5 text-xs text-white/45">{actionStatus}</p>
            <div className="mt-3 flex items-center gap-3 sm:hidden">
              <button type="button" aria-label="Bài đề xuất trước" disabled={!hasPreviousRecommendation || isFindingSong} onClick={handlePreviousSong} className="grid size-11 place-items-center rounded-full bg-white/[0.06] text-xl transition hover:bg-white/15 disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">↑</button>
              <button type="button" aria-label="Bài đề xuất tiếp theo" disabled={isFindingSong} onClick={handleNextSong} className="grid size-11 place-items-center rounded-full bg-white/15 text-xl transition hover:bg-white/25 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">↓</button>
            </div>
          </div>

          <div className="absolute right-1 top-1/2 hidden -translate-y-1/2 flex-col gap-5 sm:flex">
            <button type="button" aria-label="Bài đề xuất trước" disabled={!hasPreviousRecommendation || isFindingSong} onClick={handlePreviousSong} className="grid size-12 place-items-center rounded-full bg-white/[0.06] text-xl transition hover:bg-white/15 disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">↑</button>
            <button type="button" aria-label={isFindingSong ? 'Đang tìm bài tiếp theo' : 'Bài đề xuất tiếp theo'} disabled={isFindingSong} onClick={handleNextSong} className="grid size-12 place-items-center rounded-full bg-white/15 text-xl transition hover:bg-white/25 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">↓</button>
          </div>
        </section>
      ) : (
        <div className="fixed inset-0 z-[40] flex items-center justify-center overflow-y-auto bg-black/75 px-3 py-4 backdrop-blur-[3px] sm:px-6 sm:py-8">
          <section aria-labelledby="for-you-title" aria-describedby="for-you-description" className="relative flex max-h-[min(850px,calc(100dvh-32px))] w-full max-w-[1220px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#202020] shadow-[0_30px_110px_rgba(0,0,0,0.65)]">
            <div className="h-1 shrink-0 bg-white/10"><div className={`h-full bg-[#00cddd] transition-[width] duration-300 ${step === 1 ? 'w-1/3' : step === 2 ? 'w-2/3' : 'w-full'}`} /></div>
            <div className="flex shrink-0 items-start justify-between gap-4 px-5 pb-3 pt-5 sm:px-8 sm:pt-7">
              <div>
                <p className="text-xs font-bold tracking-[0.13em] text-white/50">BƯỚC {step}</p>
                <h1 id="for-you-title" className="mt-2 text-2xl font-extrabold sm:text-3xl">{title}</h1>
                <p id="for-you-description" className="mt-2 max-w-4xl text-sm leading-6 text-white/65 sm:text-base">Câu trả lời giúp Melodify tìm bài hát phù hợp với gu âm nhạc của bạn.</p>
              </div>
              <button type="button" onClick={() => void closeFlow()} aria-label="Tắt và quay lại" className="grid size-10 shrink-0 place-items-center rounded-full text-2xl text-white/55 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">×</button>
            </div>

            {step === 1 && (
              <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 sm:px-8">
                {isLoadingGenres ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{Array.from({ length: 10 }, (_, index) => <div key={index} className="aspect-[1.1/1] animate-pulse rounded-2xl bg-white/5" />)}</div>
                ) : error ? (
                  <div role="alert" className="rounded-xl border border-red-300/20 bg-red-950/25 p-5 text-red-100"><p>{error}</p><button type="button" onClick={() => { setError(null); setIsLoadingGenres(true); listAllGenres().then((items) => setGenres(items.filter((genre) => genre.status === 'active'))).catch(() => setError('Không tải được thể loại. Hãy thử tải lại.')).finally(() => setIsLoadingGenres(false)); }} className="mt-3 rounded-full border border-red-200/40 px-4 py-2 text-sm font-bold">Thử lại</button></div>
                ) : genres.length === 0 ? (
                  <p className="rounded-xl bg-white/5 p-5 text-white/65">Hiện chưa có thể loại hoạt động trong catalog.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
                    {genres.map((genre, index) => {
                      const selected = selectedGenreIds.includes(genre.id);
                      return (
                        <button key={genre.id} type="button" aria-pressed={selected} onClick={() => setSelectedGenreIds((current) => toggleSelection(current, genre.id))} className={`group relative aspect-[1.1/1] min-h-[145px] overflow-hidden rounded-2xl border-2 p-4 text-left transition duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${selected ? 'border-white shadow-[0_0_0_2px_rgba(0,205,221,0.5)]' : 'border-transparent'}`}>
                          <span className={`absolute inset-0 bg-gradient-to-br ${genreColors[index % genreColors.length]}`} />
                          {genre.image_url && <span aria-hidden="true" className="absolute inset-0 bg-cover bg-center opacity-45 mix-blend-screen transition duration-300 group-hover:scale-105" style={{ backgroundImage: `url("${genre.image_url}")` }} />}
                          <span className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/40" />
                          <span className="relative z-10 flex items-start justify-between gap-2">
                            <span className="line-clamp-2 text-lg font-extrabold leading-tight sm:text-xl">{genre.name}</span>
                            {selected && <span aria-hidden="true" className="grid size-6 shrink-0 place-items-center rounded-full bg-white text-xs font-black text-[#172021]">✓</span>}
                          </span>
                          <span className="absolute bottom-3 left-4 z-10 text-xs font-medium text-white/80">{genre.song_count} bài hát</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 sm:px-8">
                <p className="mb-5 text-sm text-white/55">Chọn ít nhất {minimumArtistCount || 1} nghệ sĩ có bài hát thuộc thể loại bạn đã chọn. Đã chọn {selectedArtistIds.length}.</p>
                {isLoadingArtists ? (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{Array.from({ length: 10 }, (_, index) => <div key={index} className="flex flex-col items-center gap-3"><div className="aspect-square w-full max-w-[190px] animate-pulse rounded-full bg-white/8"/><div className="h-4 w-24 animate-pulse rounded bg-white/8"/></div>)}</div>
                ) : error ? (
                  <p role="alert" className="rounded-xl border border-red-300/20 bg-red-950/25 p-5 text-red-100">{error}</p>
                ) : artists.length === 0 ? (
                  <div className="rounded-xl border border-white/10 bg-white/[0.035] p-6 text-center text-white/65">Chưa có nghệ sĩ nào được liên kết chính xác với bài hát đã phát hành thuộc các thể loại này.<button type="button" onClick={() => setStep(1)} className="mx-auto mt-4 block rounded-full border border-white/20 px-5 py-2 text-sm font-bold text-white hover:bg-white/10">Chọn thể loại khác</button></div>
                ) : (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {artists.map((artist) => {
                      const selected = selectedArtistIds.includes(artist.id);
                      return (
                        <button key={artist.id} type="button" aria-pressed={selected} onClick={() => setSelectedArtistIds((current) => toggleSelection(current, artist.id))} className={`group flex min-w-0 flex-col items-center rounded-2xl border p-3 text-center transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${selected ? 'border-cyan-300 bg-cyan-300/10' : 'border-transparent'}`}>
                          <span className={`relative grid aspect-square w-full max-w-[190px] place-items-center overflow-hidden rounded-full bg-gradient-to-br from-[#3f5264] to-[#20222a] text-4xl font-bold text-white/80 ring-1 ring-white/10 transition group-hover:ring-cyan-300/70 ${selected ? 'ring-4 ring-cyan-300' : ''}`}>
                            {artist.avatar_url ? <span role="img" aria-label={artist.name} className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url("${artist.avatar_url}")` }} /> : artist.name.slice(0, 1).toLocaleUpperCase('vi')}
                            {selected && <span className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-cyan-300 text-sm font-black text-[#112023]">✓</span>}
                          </span>
                          <span className="mt-3 line-clamp-2 min-h-10 w-full break-words text-base font-bold sm:text-lg">{artist.name}</span>
                          {artist.verified && <span className="mt-1 text-xs text-cyan-200">Nghệ sĩ đã xác minh</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="flex min-h-[330px] flex-1 flex-col items-center justify-center px-5 pb-8 text-center sm:min-h-[420px]">
                {isFindingSong ? (
                  <>
                    <div aria-hidden="true" className="relative mb-8 grid size-48 place-items-center sm:size-60">
                      <span className="absolute inset-0 animate-spin rounded-full border-[5px] border-cyan-300/20 border-t-cyan-300 motion-reduce:animate-none" />
                      <span className="absolute inset-5 animate-[spin_3.5s_linear_infinite_reverse] rounded-full border-[4px] border-cyan-300/20 border-b-cyan-300 motion-reduce:animate-none" />
                      <span className="absolute inset-10 animate-spin rounded-full border-[4px] border-cyan-300/15 border-t-cyan-200 motion-reduce:animate-none" />
                      <span className="text-5xl font-black text-cyan-200">♫</span>
                    </div>
                    <h2 className="text-3xl font-extrabold sm:text-4xl">Đang tìm nhạc cho bạn!</h2>
                    <p className="mt-3 max-w-lg text-sm leading-6 text-white/55">Đang chọn một bài hát đã phát hành có liên kết đúng với thể loại và nghệ sĩ bạn yêu thích.</p>
                  </>
                ) : noMatch ? (
                  <div className="max-w-xl rounded-2xl border border-white/10 bg-white/[0.035] p-7">
                    <h2 className="text-2xl font-extrabold">Chưa tìm được bài hát phù hợp</h2>
                    <p className="mt-3 text-sm leading-6 text-white/60">Các lựa chọn này chưa có bài hát đang phát hành và có tệp nghe được. Bạn có thể đổi nghệ sĩ hoặc thể loại.</p>
                    <button type="button" onClick={() => setStep(2)} className="mt-6 rounded-full bg-cyan-400 px-5 py-2.5 font-bold text-[#102023] hover:bg-cyan-300">Đổi nghệ sĩ</button>
                  </div>
                ) : (
                  <div role="alert" className="max-w-lg rounded-2xl border border-red-300/20 bg-red-950/25 p-7 text-red-100">
                    <p>{error || 'Không thể tìm bài hát lúc này.'}</p>
                    <button type="button" onClick={() => void findSong()} className="mt-5 rounded-full border border-red-200/40 px-5 py-2.5 font-bold">Thử lại</button>
                  </div>
                )}
              </div>
            )}

            <div className="relative flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-white/8 bg-[#202020] px-5 py-4 sm:px-8">
              {step === 1 ? (
                <>
                  <span className="text-sm text-white/50">Đã chọn {selectedGenreIds.length} thể loại</span>
                  <button type="button" disabled={!selectedGenreIds.length || isLoadingArtists || isLoadingGenres} onClick={() => void loadArtists()} className="rounded-full bg-cyan-400 px-6 py-3 text-sm font-bold text-[#102023] transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/35">{isLoadingArtists ? 'Đang tải nghệ sĩ…' : 'Tiếp tục →'}</button>
                </>
              ) : step === 2 ? (
                <>
                  <button type="button" onClick={() => { setError(null); setStep(1); }} className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-bold text-white/75 transition hover:bg-white/10">← Quay lại</button>
                  <button type="button" disabled={!selectionComplete || isLoadingArtists} onClick={() => void findSong()} className="rounded-full bg-cyan-400 px-6 py-3 text-sm font-bold text-[#102023] transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/35">Tìm nhạc cho tôi →</button>
                </>
              ) : (
                <>
                  <span className="text-xs text-white/40">Đang dùng {selectedGenres.length} thể loại · {selectedArtistIds.length} nghệ sĩ</span>
                  <button type="button" onClick={() => void closeFlow()} className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-bold text-white/75 transition hover:bg-white/10">Tắt</button>
                </>
              )}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
