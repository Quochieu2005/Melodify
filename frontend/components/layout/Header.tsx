'use client';

import type { ReactNode } from 'react';

import SearchBox from './SearchBox';
import SettingsMenu from './SettingsMenu';

const roundButtonClass =
  'grid size-12 shrink-0 cursor-pointer place-items-center rounded-full bg-white/8 text-white outline-none transition-colors hover:bg-white/14 focus-visible:ring-2 focus-visible:ring-cyan-300';

function IconButton({ label, children, onClick, muted = false }: { label: string; children: ReactNode; onClick?: () => void; muted?: boolean }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className={[roundButtonClass, muted ? 'text-white/35' : ''].join(' ')}>
      {children}
    </button>
  );
}

export default function Header() {
  return (
    <header className="sticky top-0 z-30 h-[80px] w-full bg-[#202a28] px-5 text-white lg:px-7">
      <div className="flex h-full items-center gap-3 xl:gap-5">
        <div className="hidden items-center gap-3 sm:flex">
          <IconButton label="Quay lại" muted onClick={() => window.history.back()}>
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 fill-none stroke-current stroke-2"><path d="m15 5-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </IconButton>
          <IconButton label="Đi tới" onClick={() => window.history.forward()}>
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 fill-none stroke-current stroke-2"><path d="m9 5 7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </IconButton>
        </div>

        <SearchBox />

        <div className="ml-auto flex shrink-0 items-center gap-3">
          <IconButton label="Tải nhạc lên">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 fill-none stroke-current stroke-2"><path d="M12 16V3m0 0L7.5 7.5M12 3l4.5 4.5M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </IconButton>

          <button type="button" className="hidden h-12 cursor-pointer items-center gap-2 rounded-full bg-white/8 px-5 text-sm font-bold text-[#ffc36b] outline-none transition-colors hover:bg-white/14 focus-visible:ring-2 focus-visible:ring-cyan-300 xl:inline-flex">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-none stroke-current stroke-2"><path d="M4 7h16v10H4V7Zm3 0v3m0 4v3m10-10v3m0 4v3" strokeLinecap="round" /></svg>
            Nhập code
          </button>

          <button type="button" className="hidden h-12 cursor-pointer rounded-full bg-[#071817] px-6 text-sm font-bold text-[#ffc36b] outline-none transition-colors hover:bg-black focus-visible:ring-2 focus-visible:ring-cyan-300 2xl:block">Trung tâm VIP</button>
          <button type="button" className="h-12 cursor-pointer rounded-full bg-[#08c6d9] px-5 text-sm font-bold text-[#07363a] outline-none transition-colors hover:bg-[#22d7e7] focus-visible:ring-2 focus-visible:ring-white">Đăng nhập</button>

          <SettingsMenu />
        </div>
      </div>
    </header>
  );
}
