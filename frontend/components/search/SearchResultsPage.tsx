'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { searchCatalog, type SearchKind, type SearchResults } from '@/lib/library-api';
import { type Artist } from '@/lib/api';
import { usePlayerControls } from '@/components/player';
import FollowButton from '@/components/follow/FollowButton';
import UserAvatar from '@/components/auth/UserAvatar';
import { ArtistNames } from '@/components/artists/ArtistLink';
import { SongRowActionMenu } from '@/components/songs/SongRowActionMenu';
import { songPath } from '@/lib/recent-history';
import { PlayGlyph } from '@/components/icons/PlayGlyph';

const tabs: { kind: SearchKind; label: string }[] = [{ kind: 'all', label: 'Tất cả' }, { kind: 'song', label: 'Bài hát' }, { kind: 'playlist', label: 'Playlist' }, { kind: 'artist', label: 'Nghệ sĩ' }, { kind: 'album', label: 'Album' }, { kind: 'video', label: 'Video' }, { kind: 'user', label: 'Người dùng' }];
const fallback = '/images/cover-placeholder.svg';

function ArtistResult({ artist, featured = false }: { artist: Artist & { followers_count: number }; featured?: boolean }) {
  const [count, setCount] = useState(artist.followers_count);
  return <article className={featured ? 'flex max-w-[720px] items-center gap-5 rounded-xl p-2 hover:bg-white/5' : 'flex flex-col items-center gap-3 rounded-xl p-2 text-center hover:bg-white/5'}>
    <Link href={`/artist/${encodeURIComponent(artist.slug || artist.id)}`} className={featured ? 'shrink-0' : 'w-full'}><UserAvatar name={artist.name} avatarUrl={artist.avatar_url} className={featured ? 'size-24 text-3xl' : 'mx-auto aspect-square h-auto w-full text-5xl'} /></Link>
    <div className={featured ? 'min-w-0 flex-1' : ''}><Link href={`/artist/${encodeURIComponent(artist.slug || artist.id)}`} className="font-bold hover:text-cyan-300">{artist.name}</Link><p className="mt-1 text-sm text-white/55">{count.toLocaleString('vi-VN')} người theo dõi</p></div>
    <FollowButton id={artist.id} onChanged={(_, total) => setCount(total)} />
  </article>;
}

export default function SearchResultsPage({ query, kind, page }: { query: string; kind: SearchKind; page: number }) {
  const { playSong, track, isPlaying, togglePlay } = usePlayerControls();
  const [result, setResult] = useState<SearchResults | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!query.trim()) return;
    let active = true;
    searchCatalog(query, kind, page, undefined, kind === 'all').then((data) => { if (active) { setResult(data); setError(''); } }).catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : 'Không thể tải kết quả.'); });
    return () => { active = false; };
  }, [query, kind, page, retry]);
  const href = (type: SearchKind, nextPage = 1) => `/search?key=${encodeURIComponent(query)}&t=${type}${nextPage > 1 ? `&page=${nextPage}` : ''}`;
  const data = result?.data;
  const all = kind === 'all';
  const reportedTotal = Object.values(result?.meta.totals || {}).reduce((sum, count) => sum + count, 0);
  const visibleResultCount = Object.values(result?.data || {}).reduce((sum, items) => sum + (items?.length || 0), 0);
  const total = reportedTotal || visibleResultCount;
  function section(title: string, type: SearchKind, children: ReactNode) {
    return <section className="mt-10"><div className="mb-5 flex items-center justify-between"><h2 className="text-2xl font-bold">{title}</h2>{all && <Link href={href(type)} className="text-sm font-bold text-white/65 hover:text-cyan-300">Thêm</Link>}</div>{children}</section>;
  }
  return <main className="min-h-[calc(100vh-80px)] bg-[linear-gradient(180deg,#1e3531_0%,#202a28_240px,#111_100%)] px-5 pb-28 pt-8 text-white lg:px-7">
    <h1 className="text-3xl font-bold sm:text-4xl">Kết quả tìm kiếm</h1>
    <nav aria-label="Loại kết quả tìm kiếm" className="mt-8 flex flex-wrap gap-x-7 gap-y-3">{tabs.map((tab) => <Link key={tab.kind} href={href(tab.kind)} aria-current={kind === tab.kind ? 'page' : undefined} className={`border-b-2 pb-2 font-bold transition-colors hover:text-white ${kind === tab.kind ? 'border-[#00cfe3] text-white' : 'border-transparent text-white/45'}`}>{tab.label}</Link>)}</nav>
    {!query.trim() ? <p className="mt-10 text-white/60">Nhập từ khóa trong ô tìm kiếm để tìm nhạc và người dùng.</p> : error ? <p role="alert" className="mt-10 text-red-300">{error} <button onClick={() => setRetry((value) => value + 1)} className="underline">Thử lại</button></p> : !result ? <p role="status" className="mt-10 text-white/60">Đang tìm “{query}”…</p> : total === 0 ? <div className="py-16 text-center"><h2 className="text-xl font-bold">Không tìm thấy kết quả cho “{query}”</h2><p className="mt-3 text-white/55">Thử tên ngắn hơn hoặc kiểm tra lại từ khóa.</p></div> : <>
      {all && data?.artist?.[0] && <section className="mt-10"><h2 className="mb-5 text-2xl font-bold">Kết quả đề xuất</h2><ArtistResult artist={data.artist[0]} featured /></section>}
      {!!data?.song?.length && section('Bài hát', 'song', <ul className={`grid gap-x-8 gap-y-2 ${all ? 'xl:grid-cols-2' : ''}`}>{data.song.map((song) => <li key={song.id} className="song-row-menu-host group relative z-0 flex items-center gap-3 rounded-lg p-2 hover:z-20 hover:bg-white/10 focus-within:z-20 focus-within:bg-white/10">
        <button type="button" aria-label={`${track?.id === song.id && isPlaying ? 'Tạm dừng' : 'Phát'} ${song.title}`} onClick={() => track?.id === song.id ? togglePlay() : playSong(song, data.song || [])} className="relative size-16 shrink-0 overflow-hidden rounded bg-white/10 bg-cover bg-center" style={{ backgroundImage: `url("${song.cover_url || fallback}")` }}><span className="absolute inset-0 grid place-items-center bg-black/45 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100">{track?.id === song.id && isPlaying ? 'Ⅱ' : <PlayGlyph className="size-5 text-white" />}</span></button>
        <div className="min-w-0 flex-1"><Link href={songPath(song)} className="line-clamp-1 font-bold hover:text-cyan-300">{song.title}</Link><div className="mt-1 truncate text-sm text-white/60"><ArtistNames artists={song.artists?.length ? song.artists : song.artist ? [song.artist] : []} /></div></div>
        <SongRowActionMenu song={song} buttonClassName="grid size-8 place-items-center rounded-full text-white/70 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 hover:bg-white/10" />
      </li>)}</ul>)}
      {!!data?.playlist?.length && section('Playlist', 'playlist', <div className="grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-5">{data.playlist.map((item) => <Link key={item.id} href={`/playlist/${encodeURIComponent(item.slug || item.id)}`} className="group min-w-0"><div className="relative aspect-square overflow-hidden rounded-lg bg-white/10 bg-cover bg-center" style={{ backgroundImage: `url("${item.cover_url || fallback}")` }}><span className="absolute inset-0 grid place-items-center bg-black/30 text-3xl opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100">▶</span></div><h3 className="mt-3 line-clamp-2 font-bold group-hover:text-cyan-300">{item.name}</h3></Link>)}</div>)}
      {!!data?.artist?.length && section('Nghệ sĩ', 'artist', <div className="grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-5">{data.artist.map((artist) => <ArtistResult key={artist.id} artist={artist} />)}</div>)}
      {!!data?.album?.length && section('Album', 'album', <div className="grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-5">{data.album.map((item) => <Link key={item.id} href={`/album/${encodeURIComponent(item.slug || item.id)}`} className="group min-w-0"><div className="aspect-square rounded-lg bg-white/10 bg-cover bg-center" style={{ backgroundImage: `url("${item.cover_url || fallback}")` }} /><h3 className="mt-3 line-clamp-2 font-bold group-hover:text-cyan-300">{item.title}</h3></Link>)}</div>)}
      {!!data?.video?.length && section('Video', 'video', <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{data.video.map((item) => <article key={item.id}>{item.player_type === 'youtube' && item.embed_url ? <iframe title={item.title} src={item.embed_url} loading="lazy" allowFullScreen className="aspect-video w-full rounded-lg border-0 bg-black" /> : <video controls preload="none" poster={item.thumbnail_url || undefined} src={item.video_url || undefined} onPlay={() => { if (isPlaying) togglePlay(); }} className="aspect-video w-full rounded-lg bg-black" />}<h3 className="mt-3 font-bold">{item.title}</h3></article>)}</div>)}
      {!!data?.user?.length && section('Người dùng', 'user', <div className="grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-5">{data.user.map((item) => <article key={item.id} className="flex flex-col items-center gap-3 p-2 text-center"><Link href={`/user/${encodeURIComponent(item.id)}`} className="group"><UserAvatar name={item.name} avatarUrl={item.avatar_url} className="mx-auto size-32 text-4xl" /><h3 className="mt-3 font-bold group-hover:text-cyan-300">{item.name}</h3></Link><FollowButton kind="user" id={item.id} /></article>)}</div>)}
      {!all && result && total > result.meta.per_page && <nav aria-label="Phân trang tìm kiếm" className="mt-10 flex items-center justify-center gap-6">{page > 1 && <Link href={href(kind, page - 1)} className="hover:text-cyan-300">Trang trước</Link>}<span className="text-white/55">Trang {page} / {Math.ceil(total / result.meta.per_page)}</span>{page * result.meta.per_page < total && <Link href={href(kind, page + 1)} className="hover:text-cyan-300">Trang sau</Link>}</nav>}
    </>}
  </main>;
}
