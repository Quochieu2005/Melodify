import type { ReactNode } from 'react';

import './sidebar-reference.css';

import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';

export default function HomeLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#202a28] pb-[74px] text-white lg:flex">
      <Sidebar />
      <div className="min-w-0 flex-1 bg-[#202a28]">
        <Header />
        {children}
      </div>
    </div>
  );
}
