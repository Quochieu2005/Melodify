'use client';

import { useRouter } from 'next/navigation';
import { useLoginModal } from '@/components/auth/LoginModalProvider';

function ProfileAvatar({ name, avatarUrl, large = false }: { name: string; avatarUrl: string | null; large?: boolean }) {
  const initial = name.trim().charAt(0).toUpperCase() || 'M';

  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-[#9a796d] font-bold text-white ${large ? 'size-[96px] text-4xl' : 'size-[72px] text-3xl'}`}
      style={avatarUrl ? { backgroundImage: `url("${avatarUrl}")`, backgroundPosition: 'center', backgroundSize: 'cover' } : undefined}
    >
      {!avatarUrl ? initial : null}
    </span>
  );
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

export default function MyProfilePage() {
  const router = useRouter();
  const { user, openLogin } = useLoginModal();

  if (!user) {
    return (
      <main className="min-h-[calc(100vh-80px)] bg-[#202a28] px-5 py-10 text-white sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[900px] rounded-2xl border border-white/10 bg-white/5 p-10 text-center">
          <h1 className="text-3xl font-extrabold">Của tui</h1>
          <p className="mt-3 text-white/60">Đăng nhập để xem thư viện cá nhân của bạn.</p>
          <button type="button" onClick={openLogin} className="mt-6 rounded-full bg-cyan-400 px-6 py-3 font-bold text-[#07363a] hover:bg-cyan-300">
            Đăng nhập
          </button>
        </div>
      </main>
    );
  }

  const displayName = user.name || user.username || 'Người dùng Melodify';
  const accountId = user.id.length > 10 ? user.id.slice(-8) : user.id;
  const collections = [
    { type: 'favorite' as const, title: 'Yêu thích', count: '0 bài hát', color: 'bg-gradient-to-br from-[#ff6f91] to-[#ff4fba]', href: '/favorite' },
    { type: 'recent' as const, title: 'Nghe gần đây', count: '5 bài hát', color: 'bg-gradient-to-br from-[#1f9ee2] to-[#124791]', href: '/recent' },
    { type: 'upload' as const, title: 'Đã tải lên', count: '0 bài hát · 0 video', color: 'bg-gradient-to-br from-[#69d99a] to-[#0a5d3c]', href: '/upload' },
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
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white/85">Miễn phí</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-6 text-sm font-semibold text-white/65">
              <button type="button" onClick={() => router.push('/following')} className="group cursor-pointer text-left transition-colors hover:text-[#00d3e5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00d3e5] focus-visible:ring-offset-2 focus-visible:ring-offset-[#202a28]">Đang theo dõi · <strong className="text-white transition-colors group-hover:text-[#00d3e5]">0</strong></button>
              <button type="button" onClick={() => router.push('/followers')} className="group cursor-pointer text-left transition-colors hover:text-[#00d3e5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00d3e5] focus-visible:ring-offset-2 focus-visible:ring-offset-[#202a28]">Người theo dõi · <strong className="text-white transition-colors group-hover:text-[#00d3e5]">0</strong></button>
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

        <section className="mt-10">
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-extrabold tracking-[-0.04em]">Playlist đã tạo (0)</h2>
            <button type="button" aria-label="Tạo playlist" className="grid size-8 place-items-center rounded-full border-2 border-white text-xl leading-none hover:border-cyan-300 hover:text-cyan-300">+</button>
          </div>
          <div className="mt-8 flex min-h-[300px] flex-col items-center justify-center rounded-2xl bg-black/10 text-center">
            <EmptyPlaylistIcon />
            <h3 className="mt-3 text-lg font-bold">Danh sách playlist chưa có</h3>
            <p className="mt-2 text-sm text-white/55">Hãy tạo playlist đầu tiên của bạn.</p>
            <button type="button" className="mt-6 rounded-full bg-white/15 px-8 py-3 text-sm font-bold text-white hover:bg-white/25">Tạo playlist</button>
          </div>
        </section>
      </div>
    </main>
  );
}
