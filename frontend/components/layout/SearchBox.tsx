'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { searchCatalog } from '@/lib/library-api';
import { songPath } from '@/lib/recent-history';

type Suggestion = { title: string; category: string; href: string; image?: string | null };

function SearchInput({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(initialQuery);
  const [active, setActive] = useState(-1);
  const [result, setResult] = useState<{ query: string; items: Suggestion[]; error: string }>({ query: '', items: [], error: '' });
  const containerRef = useRef<HTMLDivElement>(null);
  const term = query.trim();
  const items = result.query === term ? result.items : [];
  useEffect(() => {
    if (!isOpen || !term) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      searchCatalog(term, 'all', 1, 3, true).then(({ data }) => {
        if (cancelled) return;
        const suggestions: Suggestion[] = [
          ...(data.artist || []).slice(0, 2).map((item) => ({ title: item.name, category: 'Nghệ sĩ', href: `/artist/${encodeURIComponent(item.slug || item.id)}`, image: item.avatar_url })),
          ...(data.song || []).map((item) => ({ title: item.title, category: 'Bài hát', href: songPath(item), image: item.cover_url })),
          ...(data.playlist || []).slice(0, 1).map((item) => ({ title: item.name, category: 'Playlist', href: `/playlist/${encodeURIComponent(item.slug || item.id)}`, image: item.cover_url })),
          ...(data.album || []).slice(0, 1).map((item) => ({ title: item.title, category: 'Album', href: `/album/${encodeURIComponent(item.slug || item.id)}`, image: item.cover_url })),
          ...(data.user || []).slice(0, 1).map((item) => ({ title: item.name, category: 'Người dùng', href: `/user/${encodeURIComponent(item.id)}`, image: item.avatar_url })),
        ];
        setResult({ query: term, items: suggestions, error: '' });
      }).catch((cause: unknown) => { if (!cancelled) setResult({ query: term, items: [], error: cause instanceof Error ? cause.message : 'Không thể tải gợi ý.' }); });
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [term, isOpen]);
  useEffect(() => {
    const outside = (event: MouseEvent) => { if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false); };
    document.addEventListener('mousedown', outside);
    return () => document.removeEventListener('mousedown', outside);
  }, []);
  function go(href?: string) {
    if (!term) return;
    setIsOpen(false); setActive(-1);
    router.push(href || `/search?key=${encodeURIComponent(term)}&t=all`);
  }
  return <div ref={containerRef} className="relative min-w-0 w-full max-w-[555px] flex-1">
    <form role="search" onSubmit={(event) => { event.preventDefault(); go(active >= 0 ? items[active]?.href : undefined); }} className={`flex h-10 items-center rounded-full bg-[#435854] px-4 text-white ${isOpen ? 'ring-1 ring-white' : 'focus-within:ring-2 focus-within:ring-cyan-300/60'}`}>
      <button type="submit" aria-label="Tìm" className="shrink-0"><svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-none stroke-current stroke-2"><circle cx="10.5" cy="10.5" r="7" /><path d="m16 16 5 5" /></svg></button>
      <input aria-label="Tìm kiếm" role="combobox" aria-expanded={isOpen} aria-controls="search-suggestions" aria-autocomplete="list" aria-activedescendant={active >= 0 ? `search-option-${active}` : undefined} type="search" maxLength={100} value={query}
        onChange={(event) => { setQuery(event.target.value); setIsOpen(true); setActive(-1); }} onFocus={() => setIsOpen(true)}
        onKeyDown={(event) => { if (event.key === 'Escape') setIsOpen(false); if (event.key === 'ArrowDown') { event.preventDefault(); setIsOpen(true); setActive((value) => Math.min(value + 1, items.length - 1)); } if (event.key === 'ArrowUp') { event.preventDefault(); setActive((value) => Math.max(value - 1, -1)); } }}
        className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm text-white outline-none placeholder:text-white/55 [&::-webkit-search-cancel-button]:appearance-none" placeholder="Tìm bài hát, nghệ sĩ, album..." />
      {query && <button type="button" aria-label="Xóa nội dung tìm kiếm" onClick={() => { setQuery(''); setActive(-1); }} className="grid size-7 shrink-0 place-items-center rounded-full hover:bg-white/10">✕</button>}
    </form>
    {isOpen && <div className="absolute left-0 top-[calc(100%+6px)] max-h-[70vh] w-full min-w-64 overflow-y-auto rounded-xl bg-[#252525] p-3 text-white shadow-2xl">
      <p className="px-2 pb-2 text-sm font-bold text-white/55">{term ? 'Gợi ý tìm kiếm' : 'Tìm kiếm trên Melodify'}</p>
      {!term && <p className="px-2 py-4 text-sm text-white/60">Nhập tên bài hát, nghệ sĩ, playlist, album hoặc người dùng.</p>}
      {term && result.query !== term && <p role="status" className="px-2 py-3 text-sm text-white/60">Đang tìm…</p>}
      {term && result.query === term && result.error && <p role="alert" className="px-2 py-3 text-sm text-red-300">{result.error}</p>}
      {term && result.query === term && !result.error && !items.length && <p className="px-2 py-3 text-sm text-white/60">Không có gợi ý phù hợp.</p>}
      <ul id="search-suggestions" role="listbox" aria-label="Gợi ý tìm kiếm">{items.map((item, index) => <li key={item.href}>
        <button id={`search-option-${index}`} role="option" aria-selected={active === index} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => go(item.href)} className={`flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-white/10 focus-visible:bg-white/10 ${active === index ? 'bg-white/10' : ''}`}>
          <span className="size-10 shrink-0 rounded bg-white/10 bg-cover bg-center" style={{ backgroundImage: item.image ? `url("${item.image}")` : undefined }} />
          <span className="min-w-0"><span className="block truncate text-sm font-semibold">{item.title}</span><span className="block text-xs text-white/50">{item.category}</span></span>
        </button>
      </li>)}</ul>
      {term && <button type="button" onClick={() => go()} className="mt-2 w-full border-t border-white/10 px-2 pt-3 text-left text-sm text-cyan-300 hover:underline">Xem tất cả kết quả cho “{term}”</button>}
    </div>}
  </div>;
}

export default function SearchBox() {
  const params = useSearchParams();
  const initialQuery = params.get('key') || '';
  return <SearchInput key={initialQuery} initialQuery={initialQuery} />;
}
