'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLoginModal } from '@/components/auth/LoginModalProvider';
import { usePlayerControls } from '@/components/player';
import { getMyUploads, type Song, type UserUploadSummary } from '@/lib/api';
import { downloadSongFiles } from '@/lib/song-actions';
import styles from '@/components/albums/AlbumDetailPage.module.css';

const maxUploads = 200;
const fallbackCover = '/images/cover-placeholder.svg';

function uploadedSong(song: UserUploadSummary): Song {
  const artist = { id: null, name: song.artist_name || 'Chưa có nghệ sĩ' };

  return {
    id: song.id,
    title: song.title,
    slug: song.slug,
    duration_seconds: song.duration_seconds,
    artist,
    artists: [artist],
    cover_url: song.cover_url,
    audio_url: song.audio_url,
    download_url: song.audio_url,
    preview_url: null,
    premium_only: false,
    status: song.status,
  };
}

function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds < 0) return '--:--';
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function uploadStatus(status: string): { label: string; className: string } {
  if (status === 'published') return { label: 'Đã duyệt', className: 'text-emerald-300' };
  if (status === 'blocked' || status === 'rejected') return { label: 'Không được duyệt', className: 'text-rose-300' };
  return { label: 'Đang kiểm duyệt', className: 'text-amber-300' };
}

function PlayIcon({ pause = false }: { pause?: boolean }) {
  return pause
    ? <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-current"><path d="M7 5h4v14H7zm6 0h4v14h-4z" /></svg>
    : <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-current"><path d="M7 4.8c0-1.1 1.2-1.8 2.2-1.2l11 6.7a2 2 0 0 1 0 3.4l-11 6.7A1.5 1.5 0 0 1 7 19.2z" /></svg>;
}

function MoreIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-current"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg>;
}

function ClockIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="mx-auto size-4 fill-none stroke-current stroke-[1.8]"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function UploadedSongRow({
  song,
  index,
  isCurrentTrack,
  isPlaying,
  onPlay,
}: {
  song: UserUploadSummary;
  index: number;
  isCurrentTrack: boolean;
  isPlaying: boolean;
  onPlay: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const status = uploadStatus(song.status);
  const playable = Boolean(song.audio_url);

  useEffect(() => {
    if (!menuOpen) return;
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) setMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  const handleDownload = () => {
    if (playable) downloadSongFiles([uploadedSong(song)]);
    setMenuOpen(false);
  };

  return (
    <li className={`${styles.songRow} song-row-menu-host group grid grid-cols-[32px_minmax(0,1fr)_64px_30px] items-center gap-3 rounded-lg px-2 py-2.5 hover:z-20 focus-within:z-20 sm:grid-cols-[40px_minmax(0,1fr)_minmax(160px,0.8fr)_64px_32px] sm:gap-4`}>
      <span className={`grid size-7 place-items-center text-[13px] text-white/65 transition-opacity group-hover:opacity-0 group-focus-within:opacity-0 ${isCurrentTrack ? 'text-cyan-300' : ''}`}>{index + 1}</span>
      <div className="flex min-w-0 items-center gap-3">
        <div className="group/cover relative size-11 shrink-0 overflow-hidden rounded-[4px] bg-black/20 bg-cover bg-center" role="img" aria-label={`Ảnh bìa ${song.title}`} style={{ backgroundImage: `url("${song.cover_url || fallbackCover}")` }}>
          <button
            type="button"
            onClick={onPlay}
            disabled={!playable}
            aria-label={isCurrentTrack && isPlaying ? `Tạm dừng ${song.title}` : `Phát ${song.title}`}
            className={`absolute inset-0 grid place-items-center bg-black/45 text-white outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-cyan-300 ${isCurrentTrack ? 'opacity-100' : 'pointer-events-none opacity-0 group-hover/cover:pointer-events-auto group-hover/cover:opacity-100 group-focus-within/cover:pointer-events-auto group-focus-within/cover:opacity-100'} disabled:cursor-not-allowed disabled:opacity-40`}
          >
            <PlayIcon pause={isCurrentTrack && isPlaying} />
          </button>
        </div>
        <div className="min-w-0">
          <button type="button" onClick={onPlay} disabled={!playable} className={`block max-w-full truncate text-left text-sm font-bold transition-colors hover:text-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-default ${isCurrentTrack ? 'text-cyan-300' : 'text-white/95'}`}>{song.title}</button>
          <span className={`mt-1 block truncate text-[11px] font-medium ${status.className}`}>{status.label}</span>
          {song.status === 'blocked' && song.moderation_note && <span className="mt-1 block max-w-[420px] truncate text-[11px] text-white/50" title={song.moderation_note}>Lý do: {song.moderation_note}</span>}
        </div>
      </div>
      <span className="hidden truncate text-[13px] text-white/65 sm:block">{song.artist_name || 'Chưa có nghệ sĩ'}</span>
      <span className="text-right text-xs text-[#bcd4e4]">{formatDuration(song.duration_seconds)}</span>
      <div ref={menuRef} className="relative grid place-items-center">
        <button
          type="button"
          aria-label={`Tùy chọn bài ${song.title}`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((value) => !value)}
          className={`${styles.rowMore} grid size-8 place-items-center rounded-full text-white/75 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300`}
        ><MoreIcon /></button>
        {menuOpen && (
          <div role="menu" aria-label={`Thao tác bài ${song.title}`} className="absolute right-0 top-full z-40 mt-1 w-52 rounded-xl border border-white/[0.06] bg-[#292c2b] p-1.5 text-[13px] font-bold text-white shadow-2xl">
            <button type="button" role="menuitem" disabled={!playable} onClick={() => { setMenuOpen(false); onPlay(); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white/[0.09] hover:text-[#00d3e5] disabled:cursor-not-allowed disabled:opacity-45">Phát bài hát</button>
            <button type="button" role="menuitem" disabled={!playable} onClick={handleDownload} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white/[0.09] hover:text-[#00d3e5] disabled:cursor-not-allowed disabled:opacity-45">Tải file gốc</button>
          </div>
        )}
      </div>
    </li>
  );
}

export default function MyUploadedSongsPage() {
  const router = useRouter();
  const { user, authReady, openLogin } = useLoginModal();
  const { track, isPlaying, playSong, togglePlay } = usePlayerControls();
  const [uploads, setUploads] = useState<UserUploadSummary[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loadedForUser, setLoadedForUser] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [reloadVersion, setReloadVersion] = useState(0);
  const playableSongs = useMemo(() => uploads.filter((song) => song.audio_url).map(uploadedSong), [uploads]);
  const currentUploadIsPlaying = Boolean(track && playableSongs.some((song) => song.id === track.id) && isPlaying);
  const loading = Boolean(user && loadedForUser !== user.id);

  useEffect(() => {
    if (!authReady || !user) return;

    let isCurrent = true;
    void getMyUploads().then((response) => {
      if (isCurrent) {
        setUploads(response.data);
        setTotal(response.meta.total);
        setError('');
        setLoadedForUser(user.id);
      }
    }).catch((loadError: unknown) => {
      if (isCurrent) {
        setError(loadError instanceof Error ? loadError.message : 'Không thể tải danh sách bài hát đã tải lên.');
        setLoadedForUser(user.id);
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [authReady, reloadVersion, user]);

  const handlePlaySong = (song: Song) => {
    if (!song.audio_url && !song.stream_url && !song.preview_url) return;
    if (track?.id === song.id) {
      togglePlay();
      return;
    }
    playSong(song, playableSongs);
  };

  const handlePlayAll = () => {
    if (playableSongs.length === 0) return;
    if (currentUploadIsPlaying) {
      togglePlay();
      return;
    }
    playSong(playableSongs[0], playableSongs);
  };

  if (!authReady || loading && !user) {
    return <main className="min-h-[calc(100vh-80px)] bg-[#202a28] px-5 py-10 text-white sm:px-7">Đang tải…</main>;
  }

  if (!user) {
    return (
      <main className="min-h-[calc(100vh-80px)] bg-[#202a28] px-5 py-10 text-white sm:px-7">
        <section className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
          <h1 className="text-3xl font-extrabold">Đã tải lên</h1>
          <p className="mt-3 text-white/60">Đăng nhập để xem và nghe những bài hát bạn đã tải lên.</p>
          <button type="button" onClick={() => openLogin()} className="mt-6 rounded-full bg-cyan-400 px-6 py-3 font-bold text-[#07363a] hover:bg-cyan-300">Đăng nhập</button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-80px)] overflow-x-auto bg-[#202a28] px-4 pb-12 pt-5 text-white sm:px-7 lg:px-7">
      <div className="min-w-[620px] w-full">
        <h1 className="text-[30px] font-extrabold tracking-[-0.04em]">Đã tải lên</h1>
        <div className="mt-5 border-b border-white/10">
          <span className="relative inline-flex pb-3 text-sm font-bold text-white after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:rounded-full after:bg-[#00d3e5]">Bài hát</span>
        </div>

        <section className="mt-6" aria-label="Danh sách bài hát đã tải lên">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <button type="button" onClick={handlePlayAll} disabled={playableSongs.length === 0} className="inline-flex items-center gap-3 text-left text-xl font-extrabold tracking-[-0.02em] text-white transition-colors hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-50">
              <span className="grid size-10 place-items-center rounded-full bg-[#08c6d9] text-[#07363a]"><PlayIcon pause={currentUploadIsPlaying} /></span>
              <span>Phát tất cả <span className="text-sm font-medium text-white/55">({total ?? uploads.length})</span></span>
            </button>
            <span className="text-xs font-semibold text-white/70">Đã tải lên: <strong className="text-white">{total ?? uploads.length}/{maxUploads}</strong></span>
          </div>

          <div className="mt-5 grid grid-cols-[32px_minmax(0,1fr)_64px_30px] items-center gap-3 border-b border-white/10 px-2 pb-3 text-[12px] font-bold text-white/65 sm:grid-cols-[40px_minmax(0,1fr)_minmax(160px,0.8fr)_64px_32px] sm:gap-4">
            <span>#</span><span>Tiêu đề</span><span className="hidden sm:block">Nghệ sĩ</span><ClockIcon /><span aria-hidden="true" />
          </div>

          {loading && <p className="py-8 text-sm text-white/55">Đang tải bài hát…</p>}
          {!loading && error && <div role="alert" className="mt-5 rounded-xl border border-rose-300/15 bg-rose-400/5 px-4 py-4 text-sm text-rose-200">{error}<button type="button" onClick={() => { setLoadedForUser(null); setError(''); setReloadVersion((value) => value + 1); }} className="ml-3 font-bold underline">Thử lại</button></div>}
          {!loading && !error && uploads.length === 0 && (
            <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
              <span className="grid size-16 place-items-center rounded-full bg-white/10 text-cyan-300"><svg viewBox="0 0 24 24" aria-hidden="true" className="size-8 fill-none stroke-current stroke-2"><path d="M12 16V4m0 0L7 9m5-5 5 5M5 14v5h14v-5" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
              <h2 className="mt-4 text-lg font-bold">Bạn chưa tải bài hát nào lên</h2>
              <p className="mt-2 text-sm text-white/55">Tải nhạc lên để nghe lại và theo dõi trạng thái kiểm duyệt tại đây.</p>
              <button type="button" onClick={() => router.push('/upload')} className="mt-5 rounded-full bg-[#08c6d9] px-6 py-3 text-sm font-bold text-[#07363a] transition-colors hover:bg-[#22d7e7]">Tải nhạc lên</button>
            </div>
          )}
          {!loading && !error && uploads.length > 0 && (
            <ol className="mt-2 space-y-0.5">
              {uploads.map((song, index) => (
                <UploadedSongRow
                  key={song.id}
                  song={song}
                  index={index}
                  isCurrentTrack={track?.id === song.id}
                  isPlaying={isPlaying}
                  onPlay={() => handlePlaySong(uploadedSong(song))}
                />
              ))}
            </ol>
          )}
        </section>
      </div>
    </main>
  );
}
