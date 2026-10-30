'use client';

import { useEffect, useRef, useState } from 'react';

import { updateUserPlaylist, type Playlist, type UserPlaylistSummary } from '@/lib/api';

export function EditUserPlaylistDialog({
  playlist,
  onClose,
  onSaved,
}: {
  playlist: Playlist;
  onClose: () => void;
  onSaved: (playlist: UserPlaylistSummary) => void;
}) {
  const [name, setName] = useState(playlist.name);
  const [visibility, setVisibility] = useState<'public' | 'private'>(playlist.visibility === 'public' ? 'public' : 'private');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState(playlist.cover_url);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const previewObjectUrl = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewObjectUrl.current) URL.revokeObjectURL(previewObjectUrl.current);
    };
  }, []);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSaving) onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isSaving, onClose]);

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName || isSaving) return;
    setIsSaving(true);
    setError('');
    try {
      const response = await updateUserPlaylist(playlist.id, { name: trimmedName, visibility, coverFile });
      onSaved(response.data);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể cập nhật playlist. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[130] grid place-items-center bg-black/70 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !isSaving) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="edit-playlist-title" className="w-full max-w-[800px] rounded-2xl border border-white/10 bg-[#202120] p-6 text-white shadow-2xl sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <h2 id="edit-playlist-title" className="text-2xl font-extrabold">Chỉnh sửa playlist</h2>
          <button type="button" aria-label="Đóng" onClick={onClose} disabled={isSaving} className="grid size-9 place-items-center rounded-full text-3xl leading-none text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-50">×</button>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-[212px_minmax(0,1fr)]">
          <label className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg bg-[#393b3a] bg-cover bg-center" style={previewUrl ? { backgroundImage: `url("${previewUrl}")` } : undefined}>
            <input type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" aria-label="Tải ảnh bìa playlist lên" className="sr-only" onChange={(event) => {
              const nextFile = event.currentTarget.files?.[0] ?? null;
              if (previewObjectUrl.current) URL.revokeObjectURL(previewObjectUrl.current);
              previewObjectUrl.current = nextFile ? URL.createObjectURL(nextFile) : null;
              setCoverFile(nextFile);
              setPreviewUrl(previewObjectUrl.current || playlist.cover_url);
            }} />
            <span className="absolute inset-0 grid place-content-center gap-2 bg-black/45 text-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="mx-auto size-11 fill-none stroke-current stroke-[1.8]"><path d="m14.5 5.5 4 4M4 20l4.2-.8L19 8.4a2.8 2.8 0 0 0-4-4L4.2 15.2 4 20Z" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <span className="font-bold">Đổi ảnh bìa</span>
            </span>
            {!previewUrl ? <span className="absolute inset-0 grid place-items-center text-white/45">Chọn ảnh bìa</span> : null}
          </label>

          <div className="min-w-0">
            <label htmlFor="edit-playlist-name" className="sr-only">Tên playlist</label>
            <input id="edit-playlist-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={100} className="h-14 w-full rounded-lg border border-white/10 bg-[#383a39] px-4 text-base font-semibold text-white outline-none focus:border-cyan-400" />
            <p className="mt-1 text-right text-sm text-white/45">{name.length}/100</p>
            <fieldset className="mt-6">
              <legend className="text-sm font-semibold text-white/60">Ai có thể xem playlist này?</legend>
              <div className="mt-3 flex flex-wrap gap-6">
                {(['public', 'private'] as const).map((value) => (
                  <label key={value} className="flex cursor-pointer items-center gap-2.5 text-sm font-bold">
                    <input type="radio" name="playlist-visibility" value={value} checked={visibility === value} onChange={() => setVisibility(value)} className="size-4 accent-[#00cfe3]" />
                    {value === 'public' ? 'Công khai' : 'Riêng tư'}
                  </label>
                ))}
              </div>
            </fieldset>
            <p className="mt-5 text-xs leading-5 text-white/45">Ảnh JPG hoặc PNG, tối đa 5 MB, tối thiểu 640 × 640 px.</p>
          </div>
        </div>

        {error ? <p role="alert" className="mt-4 text-sm text-rose-300">{error}</p> : null}
        <div className="mt-7 flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={isSaving} className="h-11 min-w-32 rounded-full bg-[#393b3a] px-5 font-bold text-white hover:bg-[#4a4d4c] disabled:opacity-50">Hủy</button>
          <button type="button" onClick={() => void handleSave()} disabled={!name.trim() || isSaving} className="h-11 min-w-40 rounded-full bg-[#00cfe3] px-6 font-bold text-[#07363a] hover:bg-[#34dbea] disabled:cursor-not-allowed disabled:opacity-50">{isSaving ? 'Đang lưu…' : 'Lưu'}</button>
        </div>
      </section>
    </div>
  );
}
