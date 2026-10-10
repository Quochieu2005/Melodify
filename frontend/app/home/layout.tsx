import type { ReactNode } from 'react';

import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { LoginModalProvider } from '@/components/auth/LoginModalProvider';
import { MusicPlayer, PlayerProvider } from '@/components/player';

export default function HomeLayout({ children }: { children: ReactNode }) {
  return (
    <LoginModalProvider>
      <PlayerProvider>
        <div className="min-h-screen bg-[#202a28] pb-[100px] text-white lg:flex">
          <Sidebar />
          <div className="min-w-0 flex-1 bg-[#202a28]">
            <Header />
            {children}
          </div>
        </div>
        <MusicPlayer />
      </PlayerProvider>
    </LoginModalProvider>
  );
}
