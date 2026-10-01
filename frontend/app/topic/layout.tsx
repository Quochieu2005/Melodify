import type { ReactNode } from 'react';

import HomeLayout from '../home/layout';

export default function TopicLayout({ children }: { children: ReactNode }) {
  return <HomeLayout>{children}</HomeLayout>;
}