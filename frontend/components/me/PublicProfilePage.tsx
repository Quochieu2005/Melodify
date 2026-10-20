'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import UserAvatar from '@/components/auth/UserAvatar';
import FollowButton from '@/components/follow/FollowButton';
import { getPublicUser } from '@/lib/library-api';

export default function PublicProfilePage({ identifier }: { identifier: string }) {
  const [state, setState] = useState<{ data: Awaited<ReturnType<typeof getPublicUser>>['data'] | null; error: string }>({ data: null, error: '' });
  useEffect(() => {
    let active = true;
    getPublicUser(identifier).then(({ data }) => { if (active) setState({ data, error: '' }); }).catch((error: unknown) => { if (active) setState({ data: null, error: error instanceof Error ? error.message : 'Không thể tải hồ sơ.' }); });
    return () => { active = false; };
  }, [identifier]);
  return <main className="min-h-[calc(100vh-80px)] bg-[#202a28] px-5 py-8 text-white lg:px-7">
    {state.error ? <p role="alert" className="text-red-300">{state.error}</p> : !state.data ? <p>Đang tải hồ sơ…</p> : <section className="flex flex-wrap items-center gap-6">
      <UserAvatar name={state.data.name} avatarUrl={state.data.avatar_url} className="size-28 text-4xl" />
      <div><h1 className="text-3xl font-bold">{state.data.name}</h1>{state.data.username && <p className="mt-2 text-white/50">@{state.data.username}</p>}
        <p className="my-4 text-white/70">Đang theo dõi · {state.data.following_count} <span className="ml-5">Người theo dõi · {state.data.followers_count}</span></p>
        <FollowButton kind="user" id={state.data.id} onChanged={(following, count) => setState((previous) => ({ ...previous, data: previous.data ? { ...previous.data, is_following: following, followers_count: count } : null }))} />
      </div>
    </section>}
    <Link href="/search?key=&t=user" className="mt-10 inline-block text-cyan-300 hover:underline">Tìm người dùng khác</Link>
  </main>;
}
