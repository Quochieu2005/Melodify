'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { useLoginModal } from '@/components/auth/LoginModalProvider';
import UserAvatar from '@/components/auth/UserAvatar';
import { PlayGlyph } from '@/components/icons/PlayGlyph';
import { useLibrary } from '@/components/library/LibraryProvider';
import CreatePlaylistDialog from '@/components/playlists/CreatePlaylistDialog';
import { getMyUploads } from '@/lib/api';
import { readRecentItems, subscribeRecentHistory } from '@/lib/recent-history';

function ProfileAvatar({ name, avatarUrl, large = false }: { name: string; avatarUrl: string | null; large?: boolean }) {
  return <UserAvatar name={name} avatarUrl={avatarUrl} className={large ? 'size-[96px] text-4xl' : 'size-[72px] text-3xl'} fallbackClassName="bg-[#9a796d]" />;
}

function CollectionIcon({ type }: { type: 'favorite' | 'recent' | 'upload' }) {
  if (type === 'favorite') {
    return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-8 fill-current"><path d="M12 20.2 3.8 12A5.2 5.2 0 0 1 11.15 4.65L12 5.5l.85-.85A5.2 5.2 0 0 1 20.2 12L12 20.2Z" /></svg>;
  }

  if (type === 'recent') {
    return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-8 fill-none stroke-current stroke-2"><path d="M12 5a7 7 0 1 1-6.6 4.65" strokeLinecap="round" /><path d="M5.4 5.1v4.8h4.8M12 8v4l2.8 1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  }

  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-8 fill-none stroke-current stroke-2"><path d="M12 16V3m0 0L7.5 7.5M12 3l4.5 4.5M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function EmptyPlaylistIcon() {
  return (
    <svg viewBox="0 0 96 96" aria-hidden="true" className="size-24">
      <path d="M24 35h48v34H24z" fill="#80d9a1" />
      <path d="m24 35 14-13h20l14 13" fill="#a4edb7" />
      <path d="M35 36h26v20H35z" fill="#253f3a" opacity=".75" />
      <path d="M29 69h38" stroke="#54bb91" strokeWidth="4" strokeLinecap="round" />
      <path d="m48 18 6 10H42l6-10Z" fill="#c4f4c0" />
    </svg>
  );
}

function LibraryCollectionCard({ href, coverUrl, title, subtitle, isPrivate = false }: { href: string; coverUrl: string | null; title: string; subtitle?: string; isPrivate?: boolean }) {
  return (
    <Link href={href} className="group block rounded-lg p-2 outline-none focus-visible:outline-2 focus-visible:outline-cyan-300">
      <div role="img" aria-label={`Ảnh bìa ${title}`} className="relative aspect-square overflow-hidden rounded-lg bg-[#18211f] bg-cover bg-center" style={{ backgroundImage: `url("${coverUrl || '/images/cover-placeholder.svg'}")` }}>
        <span aria-hidden="true" className="absolute inset-0 bg-black/25 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100" />
        <span aria-hidden="true" className="absolute bottom-3 right-3 grid size-12 translate-y-2 place-items-center rounded-full bg-[#00d3e5] text-[#13201e] opacity-0 shadow-lg shadow-black/30 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
          <PlayGlyph className="size-6" />
        </span>
      </div>
      <h3 className="mt-3 truncate font-bold text-white transition-colors group-hover:text-cyan-300">{title}</h3>
      {subtitle ? <p className="mt-1 flex items-center gap-1.5 text-sm text-white/50">{subtitle}{isPrivate ? <svg role="img" aria-label="Playlist riêng tư" viewBox="0 0 16 16" className="size-3.5 fill-none stroke-current stroke-[1.5]"><rect x="3.5" y="7" width="9" height="7" rx="1.5" /><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" strokeLinecap="round" /></svg> : null}</p> : null}
    </Link>
  );
}

export default function MyProfilePage() {
  const router = useRouter();
  const { user, authReady, openLogin } = useLoginModal();
  const { data, error, refresh } = useLibrary();
  const [creating, setCreating] = useState(false);
  const [uploadedCount, setUploadedCount] = useState<number | null>(null);
  const [uploadCountFailed, setUploadCountFailed] = useState(false);
  const recentCount = useSyncExternalStore(subscribeRecentHistory, () => readRecentItems().filter((item) => item.category === 'song').length, () => 0);

  useEffect(() => {
    if (!authReady || !user) return;

    let isCurrent = true;
    void getMyUploads().then(({ meta }) => {
      if (isCurrent) {
        setUploadedCount(meta.total);
        setUploadCountFailed(false);
      }
    }).catch(() => {
      if (isCurrent) setUploadCountFailed(true);
    });

    return () => {
      isCurrent = false;
    };
  }, [authReady, user]);

  if (!user) {
    return (
      <main className="min-h-[calc(100vh-80px)] bg-[#202a28] px-5 py-10 text-white sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[900px] rounded-2xl border border-white/10 bg-white/5 p-10 text-center">
          <h1 className="text-3xl font-extrabold">Của tui</h1>
          <p className="mt-3 text-white/60">Đăng nhập để xem thư viện cá nhân của bạn.</p>
          <button type="button" onClick={() => openLogin()} className="mt-6 rounded-full bg-cyan-400 px-6 py-3 font-bold text-[#07363a] hover:bg-cyan-300">
            Đăng nhập
          </button>
        </div>
      </main>
    );
  }

  const displayName = user.name || user.username || 'Người dùng Melodify';
  const accountId = user.id.length > 10 ? user.id.slice(-8) : user.id;
  const collections = [
    { type: 'favorite' as const, title: 'Yêu thích', count: data ? `${data.favorite_song_count} bài hát` : 'Đang tải…', color: 'bg-gradient-to-br from-[#ff6f91] to-[#ff4fba]', href: '/favorite' },
    { type: 'recent' as const, title: 'Nghe gần đây', count: `${recentCount} bài hát`, color: 'bg-gradient-to-br from-[#1f9ee2] to-[#124791]', href: '/recent' },
    { type: 'upload' as const, title: 'Đã tải lên', count: uploadedCount === null ? (uploadCountFailed ? 'Xem nội dung đã tải' : 'Đang tải…') : `${uploadedCount} bài hát`, color: 'bg-gradient-to-br from-[#69d99a] to-[#0a5d3c]', href: '/me/uploaded' },
  ];

  return (
    <main className="min-h-[calc(100vh-80px)] overflow-x-hidden bg-[#202a28] px-5 pb-12 pt-8 text-white sm:px-8 lg:px-7">
      <div className="w-full">
        <section className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <ProfileAvatar name={displayName} avatarUrl={user.avatar_url} large />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="truncate text-[20px] font-bold leading-7 text-[#fff]">{displayName}</h1>
              <span className="text-[12px] leading-7 text-[#8f8f8f]">ID: {accountId}</span>
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white/85">{user.is_premium ? 'VIP' : 'Miễn phí'}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-6 text-sm font-semibold text-white/65">
              <button type="button" onClick={() => router.push('/following')} className="hover:text-cyan-300">Đang theo dõi · <strong>{data?.following_count ?? '…'}</strong></button>
              <button type="button" onClick={() => router.push('/followers')} className="hover:text-cyan-300">Người theo dõi · <strong>{data?.followers_count ?? '…'}</strong></button>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-3">
          {collections.map((collection) => (
            <button key={collection.title} type="button" onClick={() => router.push(collection.href)} className="flex min-h-[112px] items-center gap-4 rounded-xl bg-white/10 px-5 text-left outline-none transition-colors hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-cyan-300">
              <span className={`grid size-[72px] shrink-0 place-items-center rounded-xl ${collection.color}`}>
                <CollectionIcon type={collection.type} />
              </span>
              <span>
                <span className="block text-lg font-bold">{collection.title}</span>
                <span className="mt-1 block text-sm text-white/50">{collection.count}</span>
              </span>
            </button>
          ))}
        </section>

        {error && <p role="alert" className="mt-5 text-red-300">{error} <button onClick={refresh} className="underline">Thử lại</button></p>}
        <section className="mt-10">
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-extrabold tracking-[-0.04em]">Playlist đã tạo ({data?.created_playlists.length ?? '…'})</h2>
            <button type="button" aria-label="Tạo playlist" onClick={() => setCreating(true)} className="grid size-8 place-items-center rounded-full border-2 border-white text-xl leading-none hover:border-cyan-300 hover:text-cyan-300">+</button>
          </div>
          {data?.created_playlists.length ? <div className="mt-6 grid grid-cols-2 gap-5 md:grid-cols-4 xl:grid-cols-5">{data.created_playlists.map((playlist) => <LibraryCollectionCard key={playlist.id} href={`/playlist/${encodeURIComponent(playlist.slug || playlist.id)}`} coverUrl={playlist.cover_url} title={playlist.name} subtitle={`${playlist.song_count} bài hát`} isPrivate={playlist.visibility === 'private'} />)}</div> : data ? <div className="mt-8 flex min-h-[300px] flex-col items-center justify-center rounded-2xl bg-black/10 text-center">
            <EmptyPlaylistIcon />
            <h3 className="mt-3 text-lg font-bold">Danh sách playlist chưa có</h3>
            <p className="mt-2 text-sm text-white/55">Hãy tạo playlist đầu tiên của bạn.</p>
            <button type="button" onClick={() => setCreating(true)} className="mt-6 rounded-full bg-white/15 px-8 py-3 text-sm font-bold text-white hover:bg-white/25">Tạo playlist</button>
          </div> : <p className="mt-6 text-white/50">Đang tải playlist…</p>}
        </section>

        <section className="mt-12">
          <h2 className="text-3xl font-extrabold tracking-[-0.04em]">Playlist yêu thích ({data?.favorite_playlists.length ?? '…'})</h2>
          {data?.favorite_playlists.length ? <div className="mt-6 grid grid-cols-2 gap-5 md:grid-cols-4 xl:grid-cols-5">{data.favorite_playlists.map((playlist) => <LibraryCollectionCard key={playlist.id} href={`/playlist/${encodeURIComponent(playlist.slug || playlist.id)}`} coverUrl={playlist.cover_url} title={playlist.name} subtitle={`${playlist.song_count} bài hát`} />)}</div> : data ? <p className="mt-5 text-white/50">Bạn chưa có playlist yêu thích.</p> : <p className="mt-5 text-white/50">Đang tải playlist yêu thích…</p>}
        </section>

        <section className="mt-12">
          <h2 className="text-3xl font-extrabold tracking-[-0.04em]">Album yêu thích ({data?.favorite_albums.length ?? '…'})</h2>
          {data?.favorite_albums.length ? <div className="mt-6 grid grid-cols-2 gap-5 md:grid-cols-4 xl:grid-cols-5">{data.favorite_albums.map((album) => <LibraryCollectionCard key={album.id} href={`/album/${encodeURIComponent(album.slug || album.id)}`} coverUrl={album.cover_url} title={album.title} />)}</div> : data ? <p className="mt-5 text-white/50">Bạn chưa có album yêu thích.</p> : <p className="mt-5 text-white/50">Đang tải album yêu thích…</p>}
        </section>
      </div>
      {creating && <CreatePlaylistDialog onClose={() => setCreating(false)} />}
    </main>
  );
}
