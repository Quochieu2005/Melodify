'use client';

import { useEffect, useState } from 'react';

import { useLoginModal } from '@/components/auth/LoginModalProvider';
import {
  addSongsToUserPlaylist,
  createUserPlaylist,
  listUserPlaylists,
  type Song,
  type UserPlaylistSummary,
} from '@/lib/api';

export function AddSongsToPlaylistDialog({
  songs,
  open,
  onClose,
  onAdded,
}: {
  songs: Song[];
  open: boolean;
  onClose: () => void;
  onAdded?: (message: string) => void;
}) {
  const { openLogin } = useLoginModal();
  const [playlists, setPlaylists] = useState<UserPlaylistSummary[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [newName, setNewName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    listUserPlaylists()
      .then(({ data }) => {
        if (cancelled) return;
        setError('');
        setPlaylists(data);
        setSelectedId((current) => current || data[0]?.id || '');
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(cause instanceof Error && 'status' in cause && cause.status === 401
            ? 'Bạn cần đăng nhập để thêm bài vào playlist cá nhân.'
            : 'Không thể tải playlist. Vui lòng thử lại.');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSaving) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isSaving, onClose, open]);

  if (!open) return null;

  const handleCreate = async () => {
    const trimmedName = newName.trim();
    if (!trimmedName || isSaving) return;
    setIsSaving(true);
    setError('');
    try {
      const { data } = await createUserPlaylist(trimmedName);
      setPlaylists((current) => [data, ...current]);
      setSelectedId(data.id);
      setNewName('');
    } catch (cause) {
      setError(cause instanceof Error && 'status' in cause && cause.status === 401
        ? 'Bạn cần đăng nhập để tạo playlist cá nhân.'
        : 'Không thể tạo playlist mới.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAdd = async () => {
    if (!selectedId || songs.length === 0 || isSaving) return;
    setIsSaving(true);
    setError('');
    try {
      const result = await addSongsToUserPlaylist(selectedId, songs.map((song) => song.id));
      onAdded?.(result.message);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error && 'status' in cause && cause.status === 401
        ? 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại rồi thử lần nữa.'
        : 'Không thể thêm bài hát vào playlist.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-black/65 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !isSaving) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="add-songs-dialog-title" className="w-full max-w-[440px] rounded-2xl border border-white/10 bg-[#202a28] p-5 text-white shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="add-songs-dialog-title" className="text-xl font-extrabold">Thêm vào playlist</h2>
            <p className="mt-1 text-sm text-white/60">{songs.length} bài hát được chọn</p>
          </div>
          <button type="button" aria-label="Đóng" onClick={onClose} disabled={isSaving} className="grid size-8 place-items-center rounded-full text-xl text-white/65 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50">×</button>
        </div>

        <div className="mt-5 max-h-56 space-y-1 overflow-y-auto">
          {isLoading ? <p className="px-2 py-4 text-sm text-white/60">Đang tải playlist…</p> : null}
          {!isLoading && playlists.length === 0 && !error ? <p className="px-2 py-4 text-sm text-white/60">Bạn chưa có playlist cá nhân.</p> : null}
          {playlists.map((playlist) => (
            <label key={playlist.id} className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${selectedId === playlist.id ? 'bg-white/10' : 'hover:bg-white/[0.06]'}`}>
              <input type="radio" name="target-playlist" value={playlist.id} checked={selectedId === playlist.id} onChange={() => setSelectedId(playlist.id)} className="accent-[#00cfe3]" />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{playlist.name}</span>
              <span className="text-xs text-white/50">{playlist.song_count} bài</span>
            </label>
          ))}
        </div>

        <div className="mt-4 flex gap-2">
          <input value={newName} onChange={(event) => setNewName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void handleCreate(); } }} maxLength={80} aria-label="Tên playlist mới" placeholder="Tên playlist mới" className="h-10 min-w-0 flex-1 rounded-lg border border-white/15 bg-black/20 px-3 text-sm text-white outline-none placeholder:text-white/45 focus:border-[#00cfe3]" />
          <button type="button" onClick={() => void handleCreate()} disabled={!newName.trim() || isSaving} className="shrink-0 rounded-lg border border-white/25 px-3 text-sm font-bold transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45">Tạo mới</button>
        </div>

        {error ? <div role="alert" className="mt-3 flex flex-wrap items-center gap-3 text-sm text-rose-300"><p>{error}</p>{/đăng nhập|phiên đăng nhập/i.test(error) ? <button type="button" onClick={() => openLogin()} className="font-bold text-cyan-300 underline decoration-cyan-300/50 underline-offset-2 hover:text-cyan-200">Đăng nhập</button> : null}</div> : null}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={isSaving} className="h-10 rounded-full px-4 text-sm font-bold text-white/70 transition-colors hover:bg-white/10 disabled:opacity-50">Hủy</button>
          <button type="button" onClick={() => void handleAdd()} disabled={!selectedId || songs.length === 0 || isLoading || isSaving} className="h-10 rounded-full bg-[#00cfe3] px-5 text-sm font-extrabold text-[#07363a] transition-colors hover:bg-[#34dbea] disabled:cursor-not-allowed disabled:opacity-50">{isSaving ? 'Đang lưu…' : 'Thêm bài hát'}</button>
        </div>
      </section>
    </div>
  );
}
