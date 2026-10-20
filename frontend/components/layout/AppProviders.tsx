'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

import { LoginModalProvider } from '@/components/auth/LoginModalProvider';
import { LibraryProvider } from '@/components/library/LibraryProvider';
import { MusicPlayer, PlayerProvider } from '@/components/player';

function PersistentPlayer() {
  const pathname = usePathname();
  const isVipPage = pathname === '/mua-vip' || pathname.startsWith('/mua-vip/');

  return isVipPage ? null : <MusicPlayer />;
}

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <LoginModalProvider>
      <LibraryProvider><PlayerProvider>
        {children}
        <PersistentPlayer />
      </PlayerProvider></LibraryProvider>
    </LoginModalProvider>
  );
}
