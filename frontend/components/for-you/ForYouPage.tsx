'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePlayerControls } from '@/components/player/PlayerProvider';
import {
  getForYouArtists,
  getForYouSong,
  getSong,
  listAllGenres,
  type Artist,
  type GenreRecord,
  type Song,
} from '@/lib/api';
import { recentItemsByCategory } from '@/lib/recent-history';

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

export default function ForYouPage() {
  const router = useRouter();
  const { track, isPlaying, playSong, togglePlay } = usePlayerControls();
  const [genres, setGenres] = useState<GenreRecord[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [selectedGenreIds, setSelectedGenreIds] = useState<string[]>([]);
  const [selectedArtistIds, setSelectedArtistIds] = useState<string[]>([]);
  const [step, setStep] = useState<Step>(1);
  const [song, setSong] = useState<Song | null>(null);
  const [isLoadingGenres, setIsLoadingGenres] = useState(true);
  const [isLoadingArtists, setIsLoadingArtists] = useState(false);
  const [isFindingSong, setIsFindingSong] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noMatch, setNoMatch] = useState(false);
  const requestId = useRef(0);

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
    setSong(null);
    setIsFindingSong(true);
    setNoMatch(false);
    setError(null);
    try {
      const response = await getForYouSong(selectedGenreIds, selectedArtistIds, excludeSongIds);
      if (currentRequest !== requestId.current) return;
      if (!response.data) {
        setNoMatch(true);
        return;
      }
      setSong(response.data);
      playSong(response.data, [response.data]);
    } catch {
      if (currentRequest === requestId.current) setError('Có lỗi khi tìm bài hát. Hãy thử lại.');
    } finally {
      if (currentRequest === requestId.current) setIsFindingSong(false);
    }
  }, [playSong, selectedArtistIds, selectedGenreIds]);

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

  const title = step === 1
    ? 'Chọn thể loại bạn yêu thích'
    : step === 2
      ? 'Chọn nghệ sĩ bạn yêu thích'
      : song
        ? 'Gợi ý dành riêng cho bạn'
        : 'Đang tìm nhạc cho bạn!';

  return (
    <main className="relative min-h-[calc(100vh-90px)] overflow-hidden bg-[radial-gradient(ellipse_at_52%_45%,rgba(87,45,139,0.28),transparent_48%),linear-gradient(145deg,#111315,#17151d_55%,#111315)] px-3 py-5 text-white sm:px-6 sm:py-8">
      {song ? (
        <section className="mx-auto flex min-h-[calc(100vh-145px)] max-w-5xl flex-col justify-center py-5">
          <div className="mb-8 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">Melodify · Dành cho bạn</p>
              <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">Gợi ý dành riêng cho bạn</h1>
            </div>
            <button type="button" onClick={() => void closeFlow()} className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-bold text-white/85 transition hover:border-cyan-300 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
              Tắt đề xuất
            </button>
          </div>

          <div className="grid items-center gap-8 rounded-3xl border border-white/10 bg-white/[0.035] p-5 shadow-[0_24px_100px_rgba(0,0,0,0.3)] sm:p-8 md:grid-cols-[minmax(260px,390px)_1fr]">
            <div
              role="img"
              aria-label={`Ảnh bìa ${song.title}`}
              className="mx-auto aspect-square w-full max-w-[390px] rounded-2xl bg-white/5 bg-cover bg-center shadow-[0_18px_65px_rgba(0,0,0,0.48)]"
              style={{ backgroundImage: song.cover_url ? `url("${song.cover_url}")` : undefined }}
            >
              {!song.cover_url && <span className="grid h-full place-items-center text-7xl text-white/20">♫</span>}
            </div>
            <div className="min-w-0 text-center md:text-left">
              <p className="text-sm font-semibold text-cyan-200">Đề xuất ngẫu nhiên từ sở thích của bạn</p>
              <h2 className="mt-3 break-words text-3xl font-extrabold leading-tight sm:text-4xl">{song.title}</h2>
              <p className="mt-3 text-lg text-white/65">{song.artists?.map((artist) => artist.name).join(', ') || song.artist?.name || 'Nghệ sĩ chưa cập nhật'}</p>
              <div className="mt-6 flex flex-wrap justify-center gap-2 md:justify-start">
                {selectedGenres.map((genre) => <span key={genre.id} className="rounded-full border border-cyan-200/20 bg-cyan-300/10 px-3 py-1.5 text-sm text-cyan-100">{genre.name}</span>)}
              </div>
              <div className="mt-9 flex flex-wrap justify-center gap-3 md:justify-start">
                <button type="button" disabled={isFindingSong} onClick={() => void findSong(song ? [song.id] : [])} className="rounded-full bg-cyan-400 px-6 py-3 text-sm font-bold text-[#102023] transition hover:bg-cyan-300 disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                  {isFindingSong ? 'Đang tìm…' : 'Bài tiếp theo'}
                </button>
                <button type="button" onClick={() => void closeFlow()} className="rounded-full border border-white/25 px-6 py-3 text-sm font-bold text-white/85 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
                  Tắt đề xuất
                </button>
              </div>
              {track?.id === song.id && <p className="mt-5 text-sm text-white/50">{isPlaying ? 'Đang phát tự động' : 'Bài hát đã sẵn sàng trong trình phát.'}</p>}
            </div>
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
