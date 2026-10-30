'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { useLoginModal } from '@/components/auth/LoginModalProvider';
import CreatePlaylistDialog from '@/components/playlists/CreatePlaylistDialog';
import {
  addSongsToUserPlaylist,
  AUTH_TOKEN_STORAGE_KEY,
  listUserPlaylists,
  type Song,
  type UserPlaylistSummary,
} from '@/lib/api';

const fallbackCover = '/images/cover-placeholder.svg';

function SearchIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 shrink-0 fill-none stroke-current stroke-[1.8]"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" strokeLinecap="round" /></svg>;
}

function PlusIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 shrink-0 fill-none stroke-current stroke-[1.8]"><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>;
}

function isUnauthorized(cause: unknown) {
  return cause instanceof Error && 'status' in cause && cause.status === 401;
}

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
  const { openLogin, user, authReady } = useLoginModal();
  // The token is the source of truth for API access. Context hydration can lag
  // behind the sidebar during client navigation, so don't label that session logged out.
  const hasStoredToken = typeof window !== 'undefined'
    && Boolean(window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY));
  const canLoadPlaylists = Boolean(user) || hasStoredToken;
  const [playlists, setPlaylists] = useState<UserPlaylistSummary[]>([]);
  const [search, setSearch] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [savingPlaylistId, setSavingPlaylistId] = useState('');
  const [addedIds, setAddedIds] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const isBusy = Boolean(savingPlaylistId);

  const closeDialog = useCallback(() => {
    if (isBusy) return;
    setIsLoading(true);
    setError('');
    setStatus('');
    setSearch('');
    setCreateDialogOpen(false);
    setAddedIds([]);
    onClose();
  }, [isBusy, onClose]);

  useEffect(() => {
    if (!open || !authReady) return;
    if (!canLoadPlaylists) return;
    let cancelled = false;

    listUserPlaylists()
      .then(({ data }) => {
        if (!cancelled) setPlaylists(data);
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(isUnauthorized(cause)
            ? canLoadPlaylists
              ? 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại để xem playlist cá nhân.'
              : 'Bạn cần đăng nhập để thêm bài vào playlist cá nhân.'
            : 'Không thể tải playlist. Vui lòng thử lại.');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [authReady, canLoadPlaylists, open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isBusy && !createDialogOpen) closeDialog();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeDialog, createDialogOpen, isBusy, open]);

  const filteredPlaylists = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('vi');
    return query
      ? playlists.filter((playlist) => playlist.name.toLocaleLowerCase('vi').includes(query))
      : playlists;
  }, [playlists, search]);
  const visibleError = error || (authReady && !canLoadPlaylists
    ? 'Bạn cần đăng nhập để thêm bài vào playlist cá nhân.'
    : '');

  if (!open || typeof document === 'undefined') return null;

  const handleAdd = async (playlist: UserPlaylistSummary) => {
    if (songs.length === 0 || isBusy || addedIds.includes(playlist.id)) return;
    setSavingPlaylistId(playlist.id);
    setError('');
    setStatus('');
    try {
      const result = await addSongsToUserPlaylist(playlist.id, songs.map((song) => song.id));
      setAddedIds((current) => current.includes(playlist.id) ? current : [...current, playlist.id]);
      setPlaylists((current) => current.map((item) => item.id === playlist.id
        ? { ...item, song_count: item.song_count + result.added_count }
        : item));
      setStatus(result.message);
      onAdded?.(result.message);
    } catch (cause) {
      setError(isUnauthorized(cause)
        ? 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại rồi thử lần nữa.'
        : 'Không thể thêm bài hát vào playlist.');
    } finally {
      setSavingPlaylistId('');
    }
  };

  const handlePlaylistCreated = (playlist: UserPlaylistSummary) => {
    setCreateDialogOpen(false);
    setPlaylists((current) => [playlist, ...current.filter((item) => item.id !== playlist.id)]);
    void handleAdd(playlist);
  };

  return createPortal((
    <>
    <div className="fixed inset-0 z-[200] grid place-items-center bg-black/70 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDialog(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="add-songs-dialog-title" className="flex h-[min(646px,calc(100dvh-32px))] w-full max-w-[800px] flex-col overflow-hidden rounded-xl border border-white/10 bg-[#222] text-white shadow-2xl">
        <header className="flex shrink-0 items-center justify-between gap-4 px-7 pt-6">
          <h2 id="add-songs-dialog-title" className="text-[28px] font-extrabold leading-tight tracking-[-0.025em]">Thêm vào playlist</h2>
          <button type="button" aria-label="Đóng" onClick={closeDialog} disabled={isBusy} className="grid size-9 shrink-0 place-items-center rounded-full text-[30px] font-light leading-none text-white/55 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:opacity-50">×</button>
        </header>

        <div className="shrink-0 px-7 pt-5">
          <label className="flex h-12 items-center gap-3 rounded-full bg-[#444] px-4 text-white/90 focus-within:ring-2 focus-within:ring-cyan-300/70">
            <SearchIcon />
            <input value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Tìm playlist" placeholder="Nhập tên playlist" className="min-w-0 flex-1 bg-transparent text-[15px] text-white outline-none placeholder:text-white/55" />
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-7 pb-6 pt-4">
          <button type="button" onClick={() => { setCreateDialogOpen(true); setError(''); setStatus(''); }} disabled={isBusy} className="flex min-h-[60px] w-full items-center gap-3 rounded-lg text-left transition-colors hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:opacity-50">
            <span aria-hidden="true" className="grid size-14 shrink-0 place-items-center rounded-md bg-[#292929] text-white/90"><PlusIcon /></span>
            <span className="font-bold">Tạo playlist mới</span>
          </button>

          <h3 className="mb-2 mt-5 text-[16px] font-bold text-white/70">Playlist của bạn</h3>
          {authReady && canLoadPlaylists && isLoading ? <p className="py-5 text-sm text-white/60">Đang tải playlist…</p> : null}
          {authReady && canLoadPlaylists && !isLoading && filteredPlaylists.length === 0 && !visibleError ? <p className="py-5 text-sm text-white/60">{playlists.length ? 'Không tìm thấy playlist phù hợp.' : 'Bạn chưa có playlist cá nhân.'}</p> : null}

          {authReady && canLoadPlaylists && !isLoading ? <div className="space-y-1">
            {filteredPlaylists.map((playlist) => {
              const isAdded = addedIds.includes(playlist.id);
              const isRowSaving = savingPlaylistId === playlist.id;
              return <div key={playlist.id} className="flex min-h-[74px] items-center gap-3 rounded-lg px-2 transition-colors hover:bg-white/[0.04]">
                <span role="img" aria-label={`Ảnh bìa ${playlist.name}`} className="size-14 shrink-0 rounded-md bg-cover bg-center" style={{ backgroundImage: `url("${playlist.cover_url || fallbackCover}")` }} />
                <span className="min-w-0 flex-1 truncate text-[15px] font-bold">{playlist.name}</span>
                <button type="button" aria-label={`Thêm vào playlist ${playlist.name}`} onClick={() => void handleAdd(playlist)} disabled={isBusy || isAdded || songs.length === 0} className="min-w-[112px] shrink-0 rounded-full border border-white/15 px-3.5 py-2 text-[14px] font-bold text-[#00d3e5] transition-colors hover:border-[#00d3e5]/60 hover:bg-[#00d3e5]/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-not-allowed disabled:opacity-50">
                  {isRowSaving ? 'Đang thêm…' : isAdded ? 'Đã thêm' : 'Thêm vào'}
                </button>
              </div>;
            })}
          </div> : null}

          {visibleError ? <div role="alert" className="mt-4 flex flex-wrap items-center gap-3 text-sm text-rose-300"><p>{visibleError}</p>{/đăng nhập|phiên đăng nhập/i.test(visibleError) ? <button type="button" onClick={() => openLogin()} className="font-bold text-cyan-300 underline decoration-cyan-300/50 underline-offset-2 hover:text-cyan-200">Đăng nhập</button> : null}</div> : null}
          {status ? <p role="status" className="mt-4 text-sm text-cyan-200">{status}</p> : null}
        </div>
      </section>
    </div>
    {createDialogOpen ? <CreatePlaylistDialog onClose={() => setCreateDialogOpen(false)} onCreated={handlePlaylistCreated} zIndex={250} /> : null}
    </>
  ), document.body);
}
