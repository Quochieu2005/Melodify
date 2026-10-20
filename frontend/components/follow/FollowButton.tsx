'use client';

import { useState } from 'react';
import { useLoginModal } from '@/components/auth/LoginModalProvider';
import { useLibrary } from '@/components/library/LibraryProvider';
import { setFollowing } from '@/lib/library-api';

export default function FollowButton({ kind = 'artist', id, className = '', onChanged, pendingText = 'Đang cập nhật…' }: { kind?: 'artist' | 'user'; id: string; className?: string; pendingText?: string | null; onChanged?: (following: boolean, count: number) => void }) {
  const { user, openLogin, authReady } = useLoginModal();
  const { data } = useLibrary();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [optimistic, setOptimistic] = useState<{ value: boolean; base: typeof data; owner: string } | null>(null);
  const following = user && (optimistic?.base === data && optimistic.owner === user.id ? optimistic.value : (kind === 'artist' ? data?.following_artists : data?.following_users)?.some((item) => item.id === id));
  const pendingLabel = pendingText === null ? (following ? 'Đang theo dõi' : 'Theo dõi') : pendingText;
  if (kind === 'user' && user?.id === id) return null;
  async function toggle() {
    if (!user) { openLogin(); return; }
    if (pending) return;
    setPending(true); setError('');
    try {
      const result = await setFollowing(kind, id, !following);
      setOptimistic({ value: result.following, base: data, owner: user.id });
      onChanged?.(result.following, result.followers_count);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể cập nhật theo dõi.'); }
    finally { setPending(false); }
  }
  return <span className="inline-flex flex-col items-start gap-1">
    <button type="button" aria-pressed={Boolean(following)} disabled={pending || !authReady || Boolean(user && !data)} onClick={() => void toggle()} className={`rounded-full border border-white/60 px-5 py-1.5 text-sm font-bold text-white hover:border-cyan-300 hover:text-cyan-300 focus-visible:outline-2 focus-visible:outline-cyan-300 disabled:opacity-50 ${className}`}>{pending ? pendingLabel : following ? 'Đang theo dõi' : 'Theo dõi'}</button>
    {error && <span role="alert" className="max-w-64 text-xs text-red-300">{error}</span>}
  </span>;
}
