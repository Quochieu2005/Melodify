'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useLoginModal } from '@/components/auth/LoginModalProvider';

type FollowListPageProps = {
  kind: 'following' | 'followers';
};

function EmptyFollowIcon() {
  return (
    <svg viewBox="0 0 112 112" aria-hidden="true" className="size-28">
      <path d="M20 43h72v48H20z" fill="#8adf9e" />
      <path d="m20 43 19-18h34l19 18" fill="#b1efb9" />
      <path d="M36 45h40v28H36z" fill="#2a5148" opacity=".72" />
      <path d="M27 91h58" stroke="#56bd8e" strokeWidth="5" strokeLinecap="round" />
      <path d="m56 17 8 14H48l8-14Z" fill="#d0f6c8" />
      <path d="m27 43 11-11 9 11m38 0L74 32l-9 11" fill="none" stroke="#d0f6c8" strokeWidth="2" opacity=".8" />
    </svg>
  );
}

function FollowTab({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`relative whitespace-nowrap pb-4 text-base outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#00d3e5] focus-visible:ring-offset-4 focus-visible:ring-offset-[#202a28] ${active ? 'font-bold text-white' : 'font-semibold text-white/55 hover:text-white'}`}
    >
      {children}
      {active ? <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1 rounded-full bg-[#00d3e5]" /> : null}
    </button>
  );
}

export default function FollowListPage({ kind }: FollowListPageProps) {
  const router = useRouter();
  const { user, openLogin } = useLoginModal();
  const isFollowing = kind === 'following';
  const [followAudience, setFollowAudience] = useState<'artists' | 'users'>('artists');

  if (!user) {
    return (
      <main className="min-h-[calc(100vh-80px)] bg-[#202a28] px-5 py-10 text-white sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[900px] rounded-2xl border border-white/10 bg-white/5 p-10 text-center">
          <h1 className="text-3xl font-extrabold">{isFollowing ? 'Đang theo dõi' : 'Người theo dõi'}</h1>
          <p className="mt-3 text-white/60">Đăng nhập để xem danh sách của bạn.</p>
          <button type="button" onClick={openLogin} className="mt-6 rounded-full bg-cyan-400 px-6 py-3 font-bold text-[#07363a] hover:bg-cyan-300">
            Đăng nhập
          </button>
        </div>
      </main>
    );
  }

  const displayName = user.name || user.username || 'Người dùng Melodify';

  return (
    <main className="min-h-[calc(100vh-80px)] overflow-x-hidden bg-[#202a28] px-5 pb-12 pt-7 text-white sm:px-8 lg:px-7">
      <div className="flex min-h-[calc(100vh-115px)] w-full flex-col">
        <h1 className="truncate text-[34px] font-bold leading-tight tracking-normal text-[#fff]">{displayName}</h1>

        <nav aria-label="Danh sách theo dõi" className="mt-7 border-b border-white/10">
          <div className="flex gap-6">
            <FollowTab active={isFollowing} onClick={() => router.push('/following')}>
              Đang theo dõi · 0
            </FollowTab>
            <FollowTab active={!isFollowing} onClick={() => router.push('/followers')}>
              Người theo dõi · 0
            </FollowTab>
          </div>
        </nav>

        {isFollowing ? (
          <div role="tablist" aria-label="Loại tài khoản đang theo dõi" className="mt-7 flex gap-[12px]">
            <button
              type="button"
              role="tab"
              aria-selected={followAudience === 'artists'}
              onClick={() => setFollowAudience('artists')}
              className={`h-10 rounded-full px-5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white ${followAudience === 'artists' ? 'bg-[#00d3e5] text-[#06363b] hover:bg-[#2de0ee]' : 'bg-white/15 text-white hover:bg-white/25'}`}
            >
              Nghệ sĩ
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={followAudience === 'users'}
              onClick={() => setFollowAudience('users')}
              className={`h-10 rounded-full px-5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#00d3e5] ${followAudience === 'users' ? 'bg-[#00d3e5] text-[#06363b] hover:bg-[#2de0ee]' : 'bg-white/15 text-white hover:bg-white/25'}`}
            >
              Người dùng
            </button>
          </div>
        ) : null}

        <section className="flex min-h-[390px] flex-1 flex-col items-center justify-center pb-6 text-center sm:min-h-[460px]">
          <EmptyFollowIcon />
          <p className="mt-4 text-lg font-bold text-white">
            {isFollowing
              ? followAudience === 'artists' ? 'Bạn chưa theo dõi nghệ sĩ nào' : 'Bạn chưa theo dõi người dùng nào'
              : 'Bạn chưa được theo dõi bởi bất kỳ ai'}
          </p>
        </section>
      </div>
    </main>
  );
}
