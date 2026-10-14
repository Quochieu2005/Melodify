import type { ReactNode } from 'react';

import { LoginModalProvider } from '@/components/auth/LoginModalProvider';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';

export default function ChartsLayout({ children }: { children: ReactNode }) {
  return (
    <LoginModalProvider>
      <div className="min-h-screen bg-[#202a28] text-white lg:flex">
        <Sidebar />
        <div className="min-w-0 flex-1 bg-[#151d1c]">
          <Header />
          {children}
        </div>
      </div>
    </LoginModalProvider>
  );
}
