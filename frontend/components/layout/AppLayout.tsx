import type { ReactNode } from 'react';

type AppLayoutProps = { children: ReactNode };

export default function AppLayout({ children }: AppLayoutProps) {
  return <div className="min-h-screen bg-zinc-50 text-zinc-950">{children}</div>;
}
