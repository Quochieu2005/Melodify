'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserPlaylist } from '@/lib/api';

export default function CreatePlaylistDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  useEffect(() => { const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); }; window.addEventListener('keydown', escape); return () => window.removeEventListener('keydown', escape); }, [onClose]);
  return <div className="fixed inset-0 z-[90] grid place-items-center bg-black/65 p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <form role="dialog" aria-modal="true" aria-labelledby="create-playlist-title" className="w-full max-w-md rounded-xl bg-[#272727] p-6 text-white shadow-2xl" onSubmit={async (event) => {
      event.preventDefault(); if (pending || !name.trim()) return; setPending(true); setError('');
      try { const result = await createUserPlaylist(name.trim()); onClose(); router.push(`/playlist/${encodeURIComponent(result.data.slug || result.data.id)}`); }
      catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể tạo playlist.'); setPending(false); }
    }}>
      <div className="flex items-center justify-between"><h2 id="create-playlist-title" className="text-xl font-bold">Tạo playlist</h2><button type="button" aria-label="Đóng" onClick={onClose}>✕</button></div>
      <label className="mt-6 block text-sm">Tên playlist<input autoFocus required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} className="mt-2 block w-full rounded-lg border border-white/20 bg-white/5 p-3 outline-cyan-300" /></label>
      <p className="mt-3 text-sm text-white/55">Playlist mới chỉ hiển thị với bạn.</p>
      {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
      <button disabled={pending || !name.trim()} className="mt-5 w-full rounded-full bg-[#00cfe3] py-3 font-bold text-[#07363a] disabled:opacity-50">{pending ? 'Đang tạo…' : 'Tạo playlist'}</button>
    </form>
  </div>;
}
