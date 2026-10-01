'use client';

import { useEffect, useRef, useState } from 'react';

const triggerClass =
  'grid size-12 shrink-0 cursor-pointer place-items-center rounded-full bg-white/8 text-white outline-none transition-colors hover:bg-white/14 focus-visible:ring-2 focus-visible:ring-cyan-300';

function GlobeIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-none stroke-current stroke-[1.7]"><circle cx="12" cy="12" r="8" /><path d="M4 12h16M12 4a13 13 0 0 1 0 16M12 4a13 13 0 0 0 0 16" /></svg>;
}

export default function SettingsMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const [language, setLanguage] = useState<'English' | 'Tiếng Việt'>('Tiếng Việt');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setIsLanguageOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setIsLanguageOpen(false);
      }
    }

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  return (
    <div ref={menuRef} className="relative" onMouseLeave={() => setIsLanguageOpen(false)}>
      <button type="button" aria-label="Cài đặt" aria-expanded={isOpen} onClick={() => { setIsOpen((value) => !value); setIsLanguageOpen(false); }} className={triggerClass}>
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-6 text-white">
          <circle cx="12" cy="12" r="6.5" stroke="currentColor" strokeWidth="2.2" />
          <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="2.2" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
            <rect key={angle} x="10.75" y="1" width="2.5" height="4" rx="0.8" fill="currentColor" transform={"rotate(" + angle + " 12 12)"} />
          ))}
        </svg>
      </button>

      {isOpen && (
        <>
          <div role="menu" className="absolute right-0 top-[58px] h-[129px] w-[242px] rounded-2xl border border-white/10 bg-[#272727] p-1 text-white shadow-[0_18px_45px_rgba(0,0,0,0.42)]">
            <button type="button" role="menuitem" onMouseEnter={() => setIsLanguageOpen(true)} onFocus={() => setIsLanguageOpen(true)} className="flex h-11 w-full cursor-pointer items-center gap-3 rounded-xl bg-white/8 px-3 text-left text-[13px] font-normal outline-none hover:bg-white/12 focus-visible:ring-2 focus-visible:ring-cyan-300">
              <span className="text-white/35"><GlobeIcon /></span>
              <span>Language</span>
              <svg viewBox="0 0 24 24" aria-hidden="true" className="ml-auto size-5 fill-none stroke-white/45 stroke-2"><path d="m9 5 7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <div className="my-0.5 h-px bg-white/10" />
            <button type="button" role="menuitem" className="flex h-9 w-full cursor-pointer items-center gap-3 rounded-xl px-3 text-left text-[13px] font-normal outline-none hover:bg-white/8 focus-visible:ring-2 focus-visible:ring-cyan-300">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-none stroke-current stroke-[1.7]"><circle cx="12" cy="12" r="8" /><path d="m6.35 6.35 3.1 3.1m5.1 5.1 3.1 3.1m0-11.3-3.1 3.1m-5.1 5.1-3.1 3.1" /></svg>
              Hướng dẫn và hỗ trợ
            </button>
            <button type="button" role="menuitem" className="flex h-9 w-full cursor-pointer items-center gap-3 rounded-xl px-3 text-left text-[13px] font-normal outline-none hover:bg-white/8 focus-visible:ring-2 focus-visible:ring-cyan-300">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-none stroke-current stroke-[1.7]"><path d="M5 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-6l-4 3v-3H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" /><path d="M7 8h10M7 12h7" strokeLinecap="round" /></svg>
              Góp ý
            </button>
          </div>

          {isLanguageOpen && (
            <div role="menu" aria-label="Chọn ngôn ngữ" className="absolute right-[250px] top-[58px] h-[96px] w-[258px] rounded-2xl bg-[#272727] p-1 text-white shadow-[0_18px_45px_rgba(0,0,0,0.42)]">
              {(['English', 'Tiếng Việt'] as const).map((item) => (
                <button key={item} type="button" role="menuitemradio" aria-checked={language === item} onClick={() => setLanguage(item)} className="flex h-11 w-full cursor-pointer items-center rounded-xl px-4 text-left text-[13px] font-normal outline-none hover:bg-white/8 focus-visible:ring-2 focus-visible:ring-cyan-300">
                  {item}
                  {language === item && <svg viewBox="0 0 24 24" aria-hidden="true" className="ml-auto size-6 fill-none stroke-[#08d4e8] stroke-2"><path d="m5 12 4 4L19 6" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
