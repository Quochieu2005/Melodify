import Link from 'next/link';

const navigation = [
  {
    label: 'Khám phá',
    href: '/home',
    active: true,
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
    href: '/home#for-you',
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
    href: '/home#my-music',
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
    href: '/home#favorites',
    icon: (
      <span aria-hidden="true" className="size-7 rounded-[5px] bg-cover bg-center" style={{ backgroundImage: "url('/sidebar-favorites.png')" }} />
    ),
  },
  {
    label: 'Nghe gần đây',
    href: '/home#recent',
    icon: (
      <span aria-hidden="true" className="size-7 rounded-[5px] bg-cover bg-center" style={{ backgroundImage: "url('/sidebar-history.png')" }} />
    ),
  },
];

function Navigation({ items }: { items: typeof navigation }) {
  return (
    <ul className="space-y-1">
      {items.map((item) => (
        <li key={item.label}>
          <Link
            href={item.href}
            aria-current={item.active ? 'page' : undefined}
            className={[
              'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-violet-300',
              item.active
                ? 'bg-violet-500 text-white shadow-[0_8px_24px_rgba(124,92,255,0.24)]'
                : 'text-[#b8b2ca] hover:bg-white/7 hover:text-white',
            ].join(' ')}
          >
            <span className="grid size-6 place-items-center text-lg">{item.icon}</span>
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col overflow-y-auto border-r border-white/10 bg-[#151329] text-[#f7f5ff] lg:flex">
      <Link href="/home" className="flex items-center gap-3 px-5 pb-7 pt-6 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-300">
        <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-violet-400 to-fuchsia-500 text-xl shadow-[0_8px_22px_rgba(124,92,255,0.32)]">♫</span>
        <span className="text-xl font-bold tracking-[-0.04em]">Melodify</span>
      </Link>

      <nav aria-label="Điều hướng chính" className="px-3">
        <Navigation items={navigation} />
      </nav>

      <section aria-labelledby="library-title" className="mt-7 px-3">
        <h2 id="library-title" className="px-3 text-xs font-semibold tracking-[0.08em] text-[#8f88a7]">Thư viện</h2>
        <div className="mt-3"><Navigation items={library} /></div>
      </section>

      <div className="mt-auto p-5">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm leading-5 text-[#d9d5e7]">Đăng nhập để lưu nhạc và đồng bộ thư viện của bạn.</p>
          <button type="button" className="mt-4 w-full rounded-xl bg-white px-3 py-2.5 text-sm font-semibold text-[#211d3b] outline-none transition-colors hover:bg-violet-100 focus-visible:ring-2 focus-visible:ring-violet-300">Đăng nhập</button>
        </div>
      </div>
    </aside>
  );
}
