'use client';

import { useEffect, useRef } from 'react';

type VipAccessDialogProps = {
  open: boolean;
  onClose: () => void;
  onUpgrade: () => void;
};

function CrownArtwork() {
  return (
    <svg viewBox="0 0 240 170" aria-hidden="true" className="h-[138px] w-[194px] drop-shadow-[0_12px_18px_rgba(230,151,52,0.16)] sm:h-[154px] sm:w-[217px]">
      <defs>
        <linearGradient id="vip-crown-gold" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#ffe3a0" />
          <stop offset="0.42" stopColor="#ffbf61" />
          <stop offset="1" stopColor="#df8e32" />
        </linearGradient>
        <linearGradient id="vip-crown-rim" x1="0" x2="0" y1="0" y2="1">
          <stop stopColor="#ffe1a0" />
          <stop offset="1" stopColor="#f2ad4d" />
        </linearGradient>
        <linearGradient id="vip-crown-inner" x1="0" x2="1" y1="0" y2="1">
          <stop stopColor="#b86b21" />
          <stop offset="1" stopColor="#8e4c17" />
        </linearGradient>
      </defs>
      <path d="M23 42c-1-7 6-11 12-7l38 26c8 5 18 3 23-5l20-39c4-8 14-8 18 0l20 39c5 8 15 10 23 5l38-26c6-4 13 0 12 7l-15 81H38L23 42Z" fill="url(#vip-crown-gold)" />
      <path d="m48 119 144 0-4 23c-31 14-105 14-136 0l-4-23Z" fill="#e9a444" />
      <ellipse cx="120" cy="140" rx="70" ry="17" fill="url(#vip-crown-rim)" />
      <ellipse cx="120" cy="141" rx="55" ry="9" fill="url(#vip-crown-inner)" />
      <path d="m120 27 12 15-12 15-12-15 12-15Z" fill="#fff0c8" opacity=".94" />
      <path d="M37 51c20 15 32 25 48 32M203 51c-20 15-32 25-48 32" fill="none" stroke="#fff0c8" strokeLinecap="round" strokeWidth="4" opacity=".38" />
      <path d="M48 127c34 12 110 12 144 0" fill="none" stroke="#fff0bb" strokeLinecap="round" strokeWidth="4" opacity=".72" />
    </svg>
  );
}

export function VipAccessDialog({ open, onClose, onUpgrade }: VipAccessDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const frame = window.requestAnimationFrame(() => cancelRef.current?.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled])'));
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[120] grid place-items-center bg-black/75 px-4 py-6 backdrop-blur-[3px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="vip-access-title"
        aria-describedby="vip-access-description"
        className="w-full max-w-[560px] overflow-hidden rounded-[14px] border border-white/[0.08] bg-[#222222] px-5 pb-6 pt-6 text-center shadow-[0_24px_72px_rgba(0,0,0,0.62)] sm:px-7 sm:pb-7 sm:pt-7"
      >
        <div className="mx-auto flex h-[142px] items-center justify-center sm:h-[158px]">
          <CrownArtwork />
        </div>
        <h2 id="vip-access-title" className="mt-1 text-[22px] font-extrabold leading-tight tracking-[-0.025em] text-white sm:text-[25px]">
          Nội dung yêu cầu VIP
        </h2>
        <p id="vip-access-description" className="mx-auto mt-2.5 max-w-[400px] text-[14px] leading-6 text-white/70 sm:text-[16px]">
          Nâng cấp VIP để thưởng thức nội dung này
        </p>
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          <button
            ref={cancelRef}
            type="button"
            onClick={onClose}
            className="inline-flex h-[50px] items-center justify-center rounded-full bg-[#383838] px-5 text-[14px] font-bold text-white transition-colors hover:bg-[#484848] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#222] sm:text-[15px]"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onUpgrade}
            className="inline-flex h-[50px] items-center justify-center rounded-full bg-gradient-to-r from-[#ffd084] to-[#ffc477] px-5 text-[14px] font-extrabold text-[#21170b] shadow-[0_8px_20px_rgba(255,190,104,0.12)] transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffe0ad] focus-visible:ring-offset-2 focus-visible:ring-offset-[#222] active:brightness-95 sm:text-[15px]"
          >
            Nâng cấp VIP
          </button>
        </div>
      </div>
    </div>
  );
}
