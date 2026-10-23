'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import styles from './trending-artist.module.css';
import rowStyles from '@/components/albums/AlbumDetailPage.module.css';
import { PlayGlyph } from '@/components/icons/PlayGlyph';
import FollowButton from '@/components/follow/FollowButton';
import { usePlayerControls } from '@/components/player';
import { SongRowActionMenu } from '@/components/songs/SongRowActionMenu';
import type { HomeTrendingArtist, Song } from '@/lib/api';
import { getSong, getTrendingArtists } from '@/lib/api';
import { recordRecentItem, songPath } from '@/lib/recent-history';

const FALLBACK_IMAGE = '/images/cover-placeholder.svg';

function formatCount(count: number) {
  return new Intl.NumberFormat('vi-VN').format(count);
}

function imageStyle(image: string | null | undefined) {
  return { backgroundImage: `url(${JSON.stringify(image || FALLBACK_IMAGE)})` };
}

function TrendingSong({ artist }: { artist: HomeTrendingArtist }) {
  const { track, isPlaying, playSong, togglePlay } = usePlayerControls();
  const [isLoadingSong, setIsLoadingSong] = useState(false);
  const [playError, setPlayError] = useState('');
  const song = artist.featured_song;
  if (!song) return null;

  const href = songPath(song);
  const songId = song.id;
  const cover = song.cover_url || FALLBACK_IMAGE;
  const publisher = song.publisher || 'Melodify';
  const isCurrentTrack = track?.id === song.id;
  const actionSong: Song = {
    id: song.id,
    title: song.title,
    slug: song.slug,
    duration_seconds: null,
    artist: song.artist ?? { id: artist.id, name: artist.name },
    artists: song.artists?.length ? song.artists : [{ id: artist.id, name: artist.name, slug: artist.slug, avatar_url: artist.avatar_url }],
    publisher,
    preview_url: null,
    cover_url: cover,
  };

  async function handlePlay() {
    if (isLoadingSong) return;
    if (isCurrentTrack) {
      togglePlay();
      return;
    }

    setIsLoadingSong(true);
    setPlayError('');
    try {
      const response = await getSong(songId);
      playSong(response.data, [response.data]);
    } catch {
      setPlayError('Không thể phát bài hát này lúc này.');
    } finally {
      setIsLoadingSong(false);
    }
  }

  return (
    <article className={`${rowStyles.songRow} group/song grid min-w-0 grid-cols-[minmax(0,1fr)_32px] items-center gap-2 rounded-lg px-2 py-2.5 sm:gap-3`}>
      <div className="flex min-w-0 items-center gap-3">
        <div className="group/cover relative size-[76px] shrink-0 overflow-hidden rounded-md sm:size-[92px]">
          <span aria-hidden="true" className="block size-full bg-cover bg-center" style={imageStyle(cover)} />
          <button type="button" aria-label={isCurrentTrack && isPlaying ? `Tạm dừng ${song.title}` : `Phát ${song.title}`} disabled={isLoadingSong} onClick={() => void handlePlay()} className={`absolute inset-0 grid place-items-center bg-black/45 text-white transition-opacity disabled:cursor-wait ${isCurrentTrack ? 'opacity-100' : 'opacity-0 group-hover/cover:opacity-100 group-focus-within/cover:opacity-100'}`}>
            {isCurrentTrack && isPlaying ? <span aria-hidden="true" className="flex gap-1"><span className="h-4 w-1.5 rounded-sm bg-white" /><span className="h-4 w-1.5 rounded-sm bg-white" /></span> : <PlayGlyph className="ml-0.5 size-4" />}
          </button>
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold text-white transition-colors group-hover/song:text-[#00d3e5] sm:text-base">
            <Link href={href} onClick={() => recordRecentItem({ id: song.id, category: 'song', title: song.title, subtitle: artist.name, imageUrl: cover, href, publisher })}>{song.title}</Link>
          </h3>
          <p className="mt-1 truncate text-xs text-white/60 sm:text-sm">{artist.name}</p>
          {playError && <span role="status" className="mt-1 block text-xs text-rose-300">{playError}</span>}
        </div>
      </div>
      <SongRowActionMenu song={actionSong} buttonClassName="pointer-events-none opacity-0 group-hover/song:pointer-events-auto group-hover/song:opacity-100 group-focus-within/song:pointer-events-auto group-focus-within/song:opacity-100" />
    </article>
  );
}

export default function TrendingArtistPage() {
  const [artists, setArtists] = useState<HomeTrendingArtist[]>([]);
  const [updatedAt, setUpdatedAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    getTrendingArtists().then((response) => {
      if (cancelled) return;
      setArtists(response.data.filter((artist) => artist.featured_song).slice(0, 50));
      setUpdatedAt(response.meta.date);
      setError('');
    }).catch((cause: unknown) => {
      if (!cancelled) setError(cause instanceof Error ? cause.message : 'Không thể tải bảng xếp hạng nghệ sĩ.');
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, []);

  const topArtist = artists[0];
  const showingCatalogArtists = topArtist?.ranking_source === 'catalog';
  const formattedDate = updatedAt
    ? new Intl.DateTimeFormat('vi-VN').format(new Date(`${updatedAt}T00:00:00`))
    : '';
  const heroImage = topArtist ? (topArtist.avatar_url || FALLBACK_IMAGE) : null;
  const heroStyle = heroImage
    ? { backgroundImage: `linear-gradient(180deg, rgba(8, 8, 25, 0.08) 0%, rgba(21, 21, 21, 0.28) 58%, #151515 100%), url(${JSON.stringify(heroImage)})` }
    : undefined;

  return (
    <main className={`${styles.page} min-h-[calc(100vh-80px)] overflow-y-auto pb-24 text-white`}>
      <div className="relative w-full">
        <header className={`${styles.artistHeader} relative overflow-hidden px-5 pb-16 pt-20 sm:px-8 sm:pt-24 lg:px-11`} style={heroStyle}>
          <div className="relative z-10">
            <h1 className="text-4xl font-black sm:text-[40px]">{showingCatalogArtists ? 'Nghệ sĩ nổi bật' : 'Popular Artists'}</h1>
            <p className="mt-6 text-sm font-semibold sm:text-base">
              {showingCatalogArtists ? 'Gợi ý từ các nghệ sĩ có bài hát đã phát hành.' : formattedDate ? `Cập nhật vào lúc ${formattedDate}` : 'Xếp hạng theo lượt nghe và lượt xem nghệ sĩ trong 7 ngày gần nhất'}
            </p>
            {topArtist && !showingCatalogArtists && <p className="mt-2 text-sm font-bold text-white/75">#1 {topArtist.name}</p>}
          </div>
        </header>

        <section aria-label="Bảng xếp hạng nghệ sĩ và bài hát nổi bật" className="mt-8 min-w-0">
          <div className="grid grid-cols-1 gap-3 px-5 pb-4 text-sm font-bold text-white/75 sm:px-8 lg:px-11 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.72fr)] xl:gap-8">
            <h2 id="artist-ranking-heading">{showingCatalogArtists ? 'Nghệ sĩ' : 'Rank'}</h2>
            <h2 id="trending-song-heading">{showingCatalogArtists ? 'Bài hát' : 'Trending song'}</h2>
          </div>
          {loading ? (
            <p role="status" className="px-3 py-8 text-sm text-white/60">Đang tải bảng xếp hạng…</p>
          ) : error ? (
            <p role="alert" className="px-3 py-8 text-sm text-red-300">{error}</p>
          ) : artists.length ? (
            <div className="pt-2">
              {artists.slice(0, 50).map((artist, index) => {
                const href = `/artist/${encodeURIComponent(artist.slug || artist.id)}`;
                const recentArtist = () => recordRecentItem({
                  id: artist.id,
                  category: 'artist',
                  title: artist.name,
                  subtitle: 'Nghệ sĩ',
                  imageUrl: artist.avatar_url || FALLBACK_IMAGE,
                  href,
                });

                return (
                  <article key={artist.id} className={`${styles.rankEntry} group/rank grid min-w-0 grid-cols-1 items-center gap-3 px-4 py-3 sm:px-8 sm:py-4 lg:px-11 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.72fr)] xl:gap-8`}>
                    <div className="flex min-w-0 items-center gap-3 sm:gap-5">
                      {!showingCatalogArtists && <span className="w-9 shrink-0 text-lg font-semibold text-white/75 sm:w-12 sm:text-xl">#{index + 1}</span>}
                      <Link href={href} onClick={recentArtist} aria-label={`Xem nghệ sĩ ${artist.name}`} className="size-[76px] shrink-0 rounded-full bg-cover bg-center sm:size-[100px]" style={imageStyle(artist.avatar_url)} />
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 flex-wrap items-center gap-3">
                          <h3 className="max-w-full min-w-0 break-words text-lg font-extrabold transition-colors hover:text-cyan-300 sm:text-[22px]">
                            <Link href={href} onClick={recentArtist}>{artist.name}</Link>
                          </h3>
                          <FollowButton
                            id={artist.id}
                            pendingText={null}
                            onChanged={(_following, count) => setArtists((current) => current.map((item) => item.id === artist.id ? { ...item, followers_count: count } : item))}
                            className={`${styles.followControl} shrink-0 transition-opacity`}
                          />
                        </div>
                        <p className="mt-2 text-sm font-semibold text-white/75">{formatCount(artist.followers_count || 0)} người theo dõi</p>
                      </div>
                    </div>
                    <div className="min-w-0">
                      <TrendingSong artist={artist} />
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="px-3 py-8 text-sm text-white/60">Chưa có nghệ sĩ có bài hát đã phát hành để hiển thị.</p>
          )}
        </section>
      </div>
    </main>
  );
}
