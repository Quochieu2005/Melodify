import type { ReactNode } from 'react';

import HomeLayout from '../home/layout';
import '../home/sidebar-reference.css';

export default function FollowersLayout({ children }: { children: ReactNode }) {
  return <HomeLayout>{children}</HomeLayout>;
}
