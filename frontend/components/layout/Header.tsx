'use client';

import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useEffect, useReducer, useRef, useState, type ReactNode } from 'react';

import SearchBox from './SearchBox';
import SettingsMenu from './SettingsMenu';
import { useLoginModal } from '@/components/auth/LoginModalProvider';
import type { AuthUser } from '@/lib/api';

const homeRoute = '/home';
const roundButtonClass =
  'grid shrink-0 place-items-center rounded-full bg-white/8 text-white/45 outline-none transition-colors hover:bg-white/14 hover:text-white disabled:cursor-not-allowed disabled:text-white/20 disabled:hover:bg-white/8 disabled:hover:text-white/20 focus-visible:ring-2 focus-visible:ring-cyan-300';

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
  className?: string;
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

function IconButton({ label, children, onClick, disabled = false, className = 'size-12' }: IconButtonProps) {
  return (
    <button type="button" aria-label={label} onClick={onClick} disabled={disabled} className={`${roundButtonClass} ${className}`}>
      {children}
    </button>
  );
}

function UserAvatar({ user, className = 'size-9' }: { user: AuthUser; className?: string }) {
  const initial = (user.name || user.username || 'M').trim().charAt(0).toUpperCase();

  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-[#765d8d] font-bold text-white ${className}`}
      style={user.avatar_url ? { backgroundImage: `url("${user.avatar_url}")`, backgroundPosition: 'center', backgroundSize: 'cover' } : undefined}
    >
      {!user.avatar_url ? initial : null}
    </span>
  );
}

export default function Header() {
  const router = useRouter();
  const { openLogin, user, logout } = useLoginModal();
  const pathname = usePathname();
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const [navigation, dispatch] = useReducer(navigationReducer, {
    entries: [homeRoute],
    position: 0,
  });

  useEffect(() => {
    dispatch({ type: 'path', pathname });
  }, [pathname]);

  useEffect(() => {
    function closeAccountMenu(event: MouseEvent) {
      if (!accountMenuRef.current?.contains(event.target as Node)) setIsAccountOpen(false);
    }

    function closeAccountMenuOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsAccountOpen(false);
    }

    document.addEventListener('mousedown', closeAccountMenu);
    document.addEventListener('keydown', closeAccountMenuOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeAccountMenu);
      document.removeEventListener('keydown', closeAccountMenuOnEscape);
    };
  }, []);

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
          <IconButton label="Quay lại" disabled={!canGoBack} onClick={goBack} className="size-10">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 fill-none stroke-current stroke-2"><path d="m15 5-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </IconButton>
          <IconButton label="Đi tới" disabled={!canGoForward} onClick={goForward} className="size-10">
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
          {user ? (
            <div ref={accountMenuRef} className="relative">
              <button
                type="button"
                aria-label={`Tài khoản ${user.name}`}
                aria-expanded={isAccountOpen}
                onClick={() => setIsAccountOpen((value) => !value)}
                className="flex h-12 max-w-[220px] cursor-pointer items-center gap-2 rounded-full bg-white/8 px-2 pr-4 text-left outline-none transition-colors hover:bg-white/14 focus-visible:ring-2 focus-visible:ring-cyan-300"
              >
                <UserAvatar user={user} />
                <span className="hidden max-w-[140px] truncate text-sm font-bold text-white xl:block">{user.name || user.username}</span>
              </button>
              {isAccountOpen ? (
                <div className="absolute right-0 top-[58px] w-[330px] rounded-2xl border border-white/10 bg-[#272727] p-3 text-white shadow-[0_18px_45px_rgba(0,0,0,0.42)]">
                  <button type="button" onClick={() => { setIsAccountOpen(false); router.push('/me'); }} className="mt-2 flex min-h-[76px] w-full items-center gap-4 rounded-xl border-b border-white/10 px-4 py-3 text-left outline-none hover:bg-white/8 focus-visible:ring-2 focus-visible:ring-cyan-300">
                    <UserAvatar user={user} className="size-11" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{user.name || user.username}</p>
                      <p className="truncate text-xs text-white/50">{user.email || user.phone || 'Tài khoản Melodify'}</p>
                    </div>
                  </button>
                  <button type="button" onClick={() => { setIsAccountOpen(false); void logout(); }} className="mt-2 flex h-10 w-full items-center rounded-xl px-2 text-left text-sm text-white/80 hover:bg-white/8 hover:text-white">
                    Đăng xuất
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <button type="button" onClick={openLogin} className="h-12 cursor-pointer rounded-full bg-[#08c6d9] px-5 text-sm font-bold text-[#07363a] outline-none transition-colors hover:bg-[#22d7e7] focus-visible:ring-2 focus-visible:ring-white">Đăng nhập</button>
          )}

          <SettingsMenu />
        </div>
      </div>
    </header>
  );
}
