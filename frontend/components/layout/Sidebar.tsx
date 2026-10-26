'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useLoginModal } from '@/components/auth/LoginModalProvider';
import { useLibrary } from '@/components/library/LibraryProvider';
import CreatePlaylistDialog from '@/components/playlists/CreatePlaylistDialog';

const navigation = [
  {
    label: 'Khám phá',
    href: '/home',
    active: false,
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6">
        <rect x="1" y="9" width="2" height="6" rx="1" fill="#49cbd5" />
        <rect x="4.5" y="6" width="2" height="12" rx="1" fill="#5cd9df" />
        <rect x="8" y="3" width="2" height="18" rx="1" fill="#f4f2e9" />
        <rect x="11.5" y="7" width="2" height="10" rx="1" fill="#55c8db" />
        <rect x="15" y="4" width="2" height="16" rx="1" fill="#9edb80" />
        <rect x="18.5" y="7" width="2" height="10" rx="1" fill="#f2c865" />
        <rect x="22" y="10" width="1.5" height="4" rx="0.75" fill="#67d5e0" />
      </svg>
    ),
  },
  {
    label: 'Dành cho bạn',
    href: '/for-you',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 fill-current">
        <rect x="2" y="10" width="2.5" height="10" rx="1.25" />
        <rect x="6.5" y="6" width="2.5" height="14" rx="1.25" />
        <rect x="11" y="8" width="2.5" height="12" rx="1.25" />
        <rect x="15.5" y="10" width="2.5" height="10" rx="1.25" />
        <path d="m19 11.2-4.15-3.96a2.9 2.9 0 0 1 4.1-4.1l.05.05.05-.05a2.9 2.9 0 0 1 4.1 4.1L19 11.2Z" />
      </svg>
    ),
  },
  {
    label: 'Của tui',
    href: '/me',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 fill-current">
        <path d="M12 12.25a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0-2.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5ZM3 21.75a9 9 0 0 1 18 0h-2.5a6.5 6.5 0 0 0-13 0H3Z" />
      </svg>
    ),
  },
];

const library = [
  {
    label: 'Bài hát yêu thích',
    href: '/favorite',
    icon: (
      <span aria-hidden="true" className="size-7 rounded-[5px] bg-cover bg-center" style={{ backgroundImage: "url('/sidebar-favorites.png')" }} />
    ),
  },
  {
    label: 'Nghe gần đây',
    href: '/recent',
    icon: (
      <span aria-hidden="true" className="size-7 rounded-[5px] bg-cover bg-center" style={{ backgroundImage: "url('/sidebar-history.png')" }} />
    ),
  },
];

function Navigation({ items, onLogin, isAuthenticated, isLibrary = false }: { items: typeof navigation; onLogin: () => void; isAuthenticated: boolean; isLibrary?: boolean }) {
  const pathname = usePathname();

  return (
    <ul className="space-y-1">
      {items.map((item) => (
        <li key={item.label}>
          {item.label === 'Của tui' && !isAuthenticated ? (
            <button
              type="button"
              onClick={onLogin}
              className={[
                'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-violet-300',
                'text-[#b8b2ca] hover:bg-white/7 hover:text-white',
              ].join(' ')}
            >
              <span className="grid size-6 place-items-center text-lg">{item.icon}</span>
              {item.label}
            </button>
          ) : <Link
            href={item.href}
            aria-current={item.active || pathname === item.href ? 'page' : undefined}
            className={[
              'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-violet-300',
              isLibrary
                ? 'text-[#b8b2ca] hover:bg-transparent hover:text-white'
                : item.active || pathname === item.href
                  ? 'bg-violet-500 text-white shadow-[0_8px_24px_rgba(124,92,255,0.24)]'
                  : 'text-[#b8b2ca] hover:bg-white/7 hover:text-white',
            ].join(' ')}
          >
            <span className="grid size-6 place-items-center text-lg">{item.icon}</span>
            {item.label}
          </Link>}
        </li>
      ))}
    </ul>
  );
}

export default function Sidebar() {
  const { openLogin, user, logout } = useLoginModal();
  const { data, error, loading, refresh } = useLibrary();
  const [creating, setCreating] = useState(false);
  const pathname = usePathname();
  const hasCollections = Boolean(data && (data.created_playlists.length || data.favorite_playlists.length || data.favorite_albums.length));
  const groups = data ? [
    { title: 'Playlist đã tạo', create: true, items: data.created_playlists.map((item) => ({ ...item, href: `/playlist/${encodeURIComponent(item.slug || item.id)}` })) },
    { title: 'Playlist yêu thích', items: data.favorite_playlists.map((item) => ({ ...item, href: `/playlist/${encodeURIComponent(item.slug || item.id)}` })) },
    { title: 'Album yêu thích', items: data.favorite_albums.map((item) => ({ ...item, name: item.title, href: `/album/${encodeURIComponent(item.slug || item.id)}` })) },
  ] : [];
  return (
    <>
    <aside className="sidebar-scrollbar-hidden relative z-20 sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col overflow-y-auto border-r border-white/10 bg-[#151329] text-[#f7f5ff] lg:flex">
      <Link href="/home" className="flex items-center gap-3 px-5 pb-7 pt-6 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-300">
        <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-violet-400 to-fuchsia-500 text-xl shadow-[0_8px_22px_rgba(124,92,255,0.32)]">♫</span>
        <span className="text-xl font-bold tracking-[-0.04em]">Melodify</span>
      </Link>

      <nav aria-label="Điều hướng chính" className="px-3">
        <Navigation items={navigation} onLogin={openLogin} isAuthenticated={Boolean(user)} />
      </nav>

      <section aria-labelledby="library-title" className="mt-7 px-3">
        <h2 id="library-title" className="px-3 text-xs font-semibold tracking-[0.08em] text-[#8f88a7]">Thư viện</h2>
        <div className="mt-3"><Navigation items={library} onLogin={openLogin} isAuthenticated={Boolean(user)} isLibrary /></div>
      </section>

      {loading && !data ? <div aria-label="Đang tải thư viện" aria-busy="true" className="mt-8 space-y-8 px-6 pb-28">
        {['Playlist đã tạo', 'Playlist yêu thích', 'Album yêu thích'].map((title) => <section key={title}>
          <div className="mb-4 h-3 w-32 animate-pulse rounded bg-white/10 motion-reduce:animate-none" />
          <div className="flex items-center gap-3"><span className="size-10 animate-pulse rounded bg-white/10 motion-reduce:animate-none" /><span className="h-3 w-28 animate-pulse rounded bg-white/10 motion-reduce:animate-none" /></div>
        </section>)}
      </div> : hasCollections ? <div className="sidebar-collections mt-8 space-y-8 px-6 pb-28">
        {groups.map((group) => <section key={group.title} aria-label={group.title}>
          <div className="mb-4 flex items-center justify-between gap-2"><h2 className="text-xs font-bold uppercase text-white/50">{group.title}</h2>{group.create && <button type="button" aria-label="Tạo playlist" onClick={() => user ? setCreating(true) : openLogin()} className="grid size-6 shrink-0 place-items-center rounded-full border border-white/50 leading-none text-white/60 transition-colors hover:border-cyan-300 hover:text-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"><svg aria-hidden="true" viewBox="0 0 20 20" className="size-3.5" fill="none"><path d="M10 3.5v13M3.5 10h13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg></button>}</div>
          <ul className="space-y-2">{group.items.map((item) => <li key={item.id}><Link href={item.href} aria-current={pathname === item.href ? 'page' : undefined} className={`group flex items-center gap-3 rounded-lg p-1.5 text-sm text-white/75 transition-colors hover:bg-white/10 hover:text-cyan-300 focus-visible:outline-2 focus-visible:outline-cyan-300 ${pathname === item.href ? 'bg-white/10 text-cyan-300' : ''}`}>
            <span role="img" aria-label={item.name} className="relative size-10 shrink-0 overflow-hidden rounded bg-white/10 bg-cover bg-center" style={{ backgroundImage: `url("${item.cover_url || (group.title === 'Playlist đã tạo' ? '/images/cover-placeholder.svg' : '/sidebar-favorites.png')}")` }}><span className="absolute inset-0 grid place-items-center bg-black/35 text-white opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100">▶</span></span><span className="line-clamp-2 leading-5">{item.name}</span>
          </Link></li>)}</ul>
          {!group.items.length && <p className="text-xs text-white/40">Chưa có {group.title.toLowerCase()}.</p>}
        </section>)}
        {error && <button type="button" onClick={refresh} className="text-xs text-red-300">Không thể cập nhật thư viện. Thử lại</button>}
      </div> : <div className="sidebar-account mt-auto p-5">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          {user ? (
            <>
              <p className="truncate text-sm leading-5 text-[#d9d5e7]">Xin chào, {user.name || user.username}</p>
              <button type="button" onClick={() => { void logout(); }} className="mt-4 w-full rounded-xl bg-white px-3 py-2.5 text-sm font-semibold text-[#211d3b] outline-none transition-colors hover:bg-violet-100 focus-visible:ring-2 focus-visible:ring-violet-300">Đăng xuất</button>
            </>
          ) : (
            <>
              <p className="text-sm leading-5 text-[#d9d5e7]">Đăng nhập để lưu nhạc và đồng bộ thư viện của bạn.</p>
              <button type="button" onClick={() => openLogin()} className="mt-4 w-full rounded-xl bg-white px-3 py-2.5 text-sm font-semibold text-[#211d3b] outline-none transition-colors hover:bg-violet-100 focus-visible:ring-2 focus-visible:ring-violet-300">Đăng nhập</button>
            </>
          )}
        </div>
      </div>}
    </aside>
    {creating && <CreatePlaylistDialog onClose={() => setCreating(false)} />}
    </>
  );
}
