'use client';

import { useEffect, useRef, useState } from 'react';

const trendingKeywords = [
  'TỊNH HÀ “SAY HI”',
  'Tell Me Why',
  'Đến Khi Nào',
  'Không Môn Đăng Hộ Đối',
  'Jack - J97',
];

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 shrink-0 fill-none stroke-current stroke-2">
      <circle cx="11" cy="11" r="7" />
      <path d="m16.5 16.5 4 4" strokeLinecap="round" />
    </svg>
  );
}

function TrendingIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-7 shrink-0 fill-none stroke-current stroke-[1.7]">
      <path d="M4 3v17h17M7 16l4-4 3 2 6-7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 7h4v4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 7v6m4-8v4m4-6v7" opacity=".65" strokeLinecap="round" />
    </svg>
  );
}

export default function SearchBox() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative min-w-0 w-full max-w-[555px] flex-1">
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          setIsOpen(false);
        }}
        className={[
          'flex h-10 items-center rounded-full bg-[#435854] px-4 text-white transition-colors',
          isOpen ? 'ring-1 ring-white' : 'focus-within:bg-[#4b615d] focus-within:ring-2 focus-within:ring-cyan-300/60',
        ].join(' ')}
      >
        <SearchIcon />
        <input
          aria-label="Tìm kiếm"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls="trending-searches"
          aria-autocomplete="list"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setIsOpen(true)}
          className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm text-white outline-none placeholder:text-white/55 [&::-webkit-search-cancel-button]:appearance-none"
          placeholder="Tìm bài hát, nghệ sĩ, album..."
        />
        {query && (
          <button
            type="button"
            aria-label="Xóa nội dung tìm kiếm"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setQuery('')}
            className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-full text-white/80 outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 fill-none stroke-current stroke-2">
              <path d="m7 7 10 10M17 7 7 17" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </form>

      {isOpen && (
        <div id="trending-searches" role="listbox" aria-label="Từ khóa nổi bật" className="absolute left-0 top-[calc(100%+6px)] h-[268px] w-[555px] max-w-[calc(100vw-40px)] overflow-hidden rounded-[14px] bg-[#252525] px-4 pb-3 pt-4 text-white shadow-[0_18px_45px_rgba(0,0,0,0.38)]">
          <p className="px-1 pb-2 text-sm font-bold text-white/60">Từ khóa nổi bật</p>
          <ul>
            {trendingKeywords.map((keyword) => (
              <li key={keyword}>
                <button
                  type="button"
                  role="option"
                  aria-selected={query === keyword}
                  onClick={() => {
                    setQuery(keyword);
                    setIsOpen(false);
                  }}
                  className="flex h-[42px] w-full cursor-pointer items-center gap-4 rounded-lg px-1 text-left text-sm font-semibold text-white outline-none transition-colors hover:bg-white/7 focus-visible:bg-white/10"
                >
                  <span className="text-white/55"><TrendingIcon /></span>
                  <span>{keyword}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
