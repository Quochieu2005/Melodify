import type { ReactNode } from 'react';

import HomeLayout from '../home/layout';

export default function PlaylistLayout({ children }: { children: ReactNode }) {
  return <HomeLayout>{children}</HomeLayout>;
}
