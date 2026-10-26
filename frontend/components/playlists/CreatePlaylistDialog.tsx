'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useLibrary } from '@/components/library/LibraryProvider';
import { createUserPlaylist, type UserPlaylistSummary } from '@/lib/api';

type PlaylistVisibility = 'public' | 'private';

export default function CreatePlaylistDialog({ onClose, onCreated, zIndex = 150 }: { onClose: () => void; onCreated?: (playlist: UserPlaylistSummary) => void; zIndex?: number }) {
  const { refresh } = useLibrary();
  const [name, setName] = useState('');
  const [visibility, setVisibility] = useState<PlaylistVisibility>('public');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !pending) onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, pending]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (pending || !trimmedName) return;

    setPending(true);
    setError('');
    try {
      const { data } = await createUserPlaylist(trimmedName, visibility);
      refresh();
      onCreated?.(data);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể tạo playlist.');
      setPending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/75 px-4 py-6"
      style={{ zIndex }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onClose();
      }}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-playlist-title"
        className={`w-full ${error ? 'h-auto min-h-[260px]' : 'h-[260px]'} max-w-[518px] rounded-[10px] border border-white/[0.08] bg-[#222] p-4 text-white shadow-[0_24px_80px_rgba(0,0,0,0.5)] sm:p-5`}
        onSubmit={(event) => void handleSubmit(event)}
      >
        <div className="flex items-center justify-between gap-4">
          <h2 id="create-playlist-title" className="text-2xl font-extrabold leading-[30px] tracking-[-0.025em]">
            Tạo playlist mới
          </h2>
          <button
            type="button"
            aria-label="Đóng"
            onClick={onClose}
            disabled={pending}
            className="grid size-9 shrink-0 place-items-center rounded-full text-[31px] font-light leading-none text-white/55 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:opacity-40"
          >
            ×
          </button>
        </div>

        <label htmlFor="create-playlist-name" className="sr-only">Tên playlist</label>
        <input
          id="create-playlist-name"
          autoFocus
          required
          maxLength={100}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Nhập tên playlist"
          className="mt-4 h-11 w-full rounded-md border border-transparent bg-[#383838] px-3 text-base text-white outline-none placeholder:text-[#aaa] focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-300/20"
        />
        <p className="mt-1 text-right text-sm leading-[18px] text-white/45" aria-live="polite">
          {name.length}/100
        </p>

        <fieldset className="mt-2 flex flex-wrap items-center gap-x-7 gap-y-2">
          <legend className="sr-only">Quyền riêng tư của playlist</legend>
          {([
            { value: 'public', label: 'Công khai' },
            { value: 'private', label: 'Riêng tư' },
          ] as const).map((option) => (
            <label key={option.value} className="relative inline-flex cursor-pointer items-center gap-2.5 text-[16px] font-semibold">
              <input
                type="radio"
                name="playlist-visibility"
                value={option.value}
                checked={visibility === option.value}
                onChange={() => setVisibility(option.value)}
                className="peer absolute left-0 top-0 z-10 size-6 cursor-pointer opacity-0"
              />
              <span aria-hidden="true" className="pointer-events-none grid size-6 shrink-0 place-items-center rounded-full border-[1.5px] border-white/90 peer-focus-visible:ring-2 peer-focus-visible:ring-cyan-300 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[#222]">
                <span className={`size-3 rounded-full ${visibility === option.value ? 'bg-[#00cfe3]' : 'bg-transparent'}`} />
              </span>
              {option.label}
            </label>
          ))}
        </fieldset>

        {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="h-11 rounded-full bg-[#383838] text-base font-bold text-white transition-colors hover:bg-[#454545] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={pending || !name.trim()}
            className="h-11 rounded-full bg-[#00cfe3] text-base font-bold text-[#07363a] transition-colors hover:bg-[#23d8e8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 disabled:cursor-not-allowed disabled:bg-[#383838] disabled:text-[#686868]"
          >
            {pending ? 'Đang lưu…' : 'Lưu'}
          </button>
        </div>
      </form>
    </div>
  );
}
