'use client';

import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useEffect, useReducer, type ReactNode } from 'react';

import SearchBox from './SearchBox';
import SettingsMenu from './SettingsMenu';
import { useLoginModal } from '@/components/auth/LoginModalProvider';

const homeRoute = '/home';
const roundButtonClass =
  'grid size-12 shrink-0 place-items-center rounded-full bg-white/8 text-white/45 outline-none transition-colors hover:bg-white/14 hover:text-white disabled:cursor-not-allowed disabled:text-white/20 disabled:hover:bg-white/8 disabled:hover:text-white/20 focus-visible:ring-2 focus-visible:ring-cyan-300';

type NavigationState = {
  entries: string[];
  position: number;
};

type NavigationAction =
  | { type: 'path'; pathname: string }
  | { type: 'move'; direction: 'back' | 'forward' };

type IconButtonProps = {
  label: string;
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
};

function navigationReducer(state: NavigationState, action: NavigationAction): NavigationState {
  if (action.type === 'move') {
    return {
      ...state,
      position: action.direction === 'back'
        ? Math.max(0, state.position - 1)
        : Math.min(state.entries.length - 1, state.position + 1),
    };
  }

  if (action.pathname === state.entries[state.position]) {
    return state;
  }

  const existingPosition = state.entries.indexOf(action.pathname);

  if (existingPosition >= 0) {
    return { ...state, position: existingPosition };
  }

  return {
    entries: state.entries.slice(0, state.position + 1).concat(action.pathname),
    position: state.position + 1,
  };
}

function IconButton({ label, children, onClick, disabled = false }: IconButtonProps) {
  return (
    <button type="button" aria-label={label} onClick={onClick} disabled={disabled} className={roundButtonClass}>
      {children}
    </button>
  );
}

export default function Header() {
  const router = useRouter();
  const { openLogin } = useLoginModal();
  const pathname = usePathname();
  const [navigation, dispatch] = useReducer(navigationReducer, {
    entries: [homeRoute],
    position: 0,
  });

  useEffect(() => {
    dispatch({ type: 'path', pathname });
  }, [pathname]);

  const canGoBack = navigation.position > 0;
  const canGoForward = navigation.position < navigation.entries.length - 1;

  function goBack() {
    if (!canGoBack) {
      return;
    }

    dispatch({ type: 'move', direction: 'back' });
    window.history.back();
  }

  function goForward() {
    if (!canGoForward) {
      return;
    }

    dispatch({ type: 'move', direction: 'forward' });
    window.history.forward();
  }

  return (
    <header className="sticky top-0 z-30 h-[80px] w-full bg-[#202a28] px-5 text-white lg:px-7">
      <div className="flex h-full items-center gap-3 xl:gap-5">
        <div className="hidden items-center gap-3 sm:flex">
          <IconButton label="Quay lại" disabled={!canGoBack} onClick={goBack}>
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 fill-none stroke-current stroke-2"><path d="m15 5-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </IconButton>
          <IconButton label="Đi tới" disabled={!canGoForward} onClick={goForward}>
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 fill-none stroke-current stroke-2"><path d="m9 5 7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </IconButton>
        </div>

        <SearchBox />

        <div className="ml-auto flex shrink-0 items-center gap-3">
          <IconButton label="Tải nhạc lên" onClick={() => router.push('/upload')}>
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 fill-none stroke-current stroke-2"><path d="M12 16V3m0 0L7.5 7.5M12 3l4.5 4.5M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </IconButton>

          <button type="button" className="hidden h-12 cursor-pointer items-center gap-2 rounded-full bg-white/8 px-5 text-sm font-bold text-[#ffc36b] outline-none transition-colors hover:bg-white/14 focus-visible:ring-2 focus-visible:ring-cyan-300 xl:inline-flex">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-none stroke-current stroke-2"><path d="M4 7h16v10H4V7Zm3 0v3m0 4v3m10-10v3m0 4v3" strokeLinecap="round" /></svg>
            Nhập code
          </button>

          <button type="button" className="hidden h-12 cursor-pointer rounded-full bg-[#071817] px-6 text-sm font-bold text-[#ffc36b] outline-none transition-colors hover:bg-black focus-visible:ring-2 focus-visible:ring-cyan-300 2xl:block">Trung tâm VIP</button>
          <button type="button" onClick={openLogin} className="h-12 cursor-pointer rounded-full bg-[#08c6d9] px-5 text-sm font-bold text-[#07363a] outline-none transition-colors hover:bg-[#22d7e7] focus-visible:ring-2 focus-visible:ring-white">Đăng nhập</button>

          <SettingsMenu />
        </div>
      </div>
    </header>
  );
}
