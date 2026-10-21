'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';

import { AddSongsToPlaylistDialog } from '@/components/playlists/AddSongsToPlaylistDialog';
import { copyTextToClipboard } from '@/lib/clipboard';
import {
  getSongDownloadUrl,
  getVisitorId,
  recordSongShare,
  reportSong,
  type Song,
  type SongReportReason,
} from '@/lib/api';
import { songPath } from '@/lib/recent-history';

const reportReasons: Array<{ value: SongReportReason; label: string }> = [
  { value: 'incorrect_audio', label: 'Âm thanh không đúng' },
  { value: 'incorrect_information', label: 'Thông tin không chính xác' },
  { value: 'duplicate', label: 'Bài hát bị trùng' },
  { value: 'inappropriate', label: 'Nội dung không phù hợp' },
  { value: 'copyright', label: 'Vấn đề bản quyền' },
  { value: 'other', label: 'Lý do khác' },
];

function MoreIcon({ className = 'size-4' }: { className?: string }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className={`${className} fill-current`}><circle cx="5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="19" cy="12" r="1.7" /></svg>;
}

function ActionIcon({ kind }: { kind: 'download' | 'playlist' | 'share' | 'report' }) {
  const paths = {
    download: <path d="M12 3v11m0 0 4-4m-4 4-4-4M4 20h16" />,
    playlist: <path d="M4 6h16M4 12h10M4 18h10m5-4v8m-4-4h8" />,
    share: <path d="M14 4 22 11l-8 7v-5c-5 0-8 1.5-11 6 1-8 4-12 11-12V4Z" />,
    report: <path d="M5 21V4m0 1h13l-2.5 4L18 13H5" />,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[17px] shrink-0 fill-none stroke-current stroke-[1.8]" strokeLinecap="round" strokeLinejoin="round">{paths[kind]}</svg>;
}

export function SongRowActionMenu({
  song,
  buttonClassName = '',
  onStatus,
  placement = 'down',
  downloadUrl,
  iconClassName,
  onShareRecorded,
}: {
  song: Song;
  buttonClassName?: string;
  onStatus?: (message: string) => void;
  placement?: 'up' | 'down';
  downloadUrl?: string | null;
  iconClassName?: string;
  onShareRecorded?: (shares: number) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState<SongReportReason>('incorrect_audio');
  const [details, setDetails] = useState('');
  const [isReporting, setIsReporting] = useState(false);
  const [reportError, setReportError] = useState('');

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        setMenuOpen(false);
        setShareOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        setShareOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  const notify = (message: string) => onStatus?.(message);

  const handleDownload = () => {
    const anchor = document.createElement('a');
    anchor.href = downloadUrl || getSongDownloadUrl(song);
    anchor.rel = 'noopener noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setMenuOpen(false);
    notify(`Đang tải ${song.title}${downloadUrl ? ' theo chất lượng đang chọn' : ''}.`);
  };

  const handleShare = async (target: 'facebook' | 'copy_link') => {
    const url = new URL(songPath(song), window.location.origin).toString();
    let copied = false;
    try {
      if (target === 'facebook') {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'noopener,noreferrer');
      } else {
        await copyTextToClipboard(url);
        copied = true;
      }
    } catch {
      notify(target === 'copy_link'
        ? 'Không thể sao chép liên kết. Hãy thử lại hoặc kiểm tra quyền clipboard của trình duyệt.'
        : 'Không thể mở cửa sổ chia sẻ Facebook.');
      setMenuOpen(false);
      setShareOpen(false);
      return;
    }

    try {
      const response = await recordSongShare(song.id, target === 'facebook' ? 'facebook' : 'copy_link', getVisitorId());
      onShareRecorded?.(response.shares);
      notify(target === 'facebook' ? `Đã mở chia sẻ ${song.title} trên Facebook.` : `Đã sao chép liên kết ${song.title}.`);
    } catch {
      notify(copied
        ? 'Đã sao chép liên kết nhưng máy chủ chưa ghi nhận lượt chia sẻ.'
        : 'Đã mở Facebook nhưng máy chủ chưa ghi nhận lượt chia sẻ.');
    } finally {
      setMenuOpen(false);
      setShareOpen(false);
    }
  };

  const handleReport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isReporting) return;
    setIsReporting(true);
    setReportError('');
    try {
      const result = await reportSong(song, reason, details.trim(), getVisitorId());
      notify(result.message);
      setReportOpen(false);
      setDetails('');
    } catch {
      setReportError('Không thể gửi báo cáo. Vui lòng thử lại.');
    } finally {
      setIsReporting(false);
    }
  };

  return (
    <div ref={rootRef} className="relative grid place-items-center">
      <button
        type="button"
        aria-label={`Tùy chọn bài ${song.title}`}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => { setMenuOpen((value) => !value); setShareOpen(false); }}
        className={`grid size-8 place-items-center rounded-full text-white/75 outline-none transition-[opacity,background-color,color] hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-[#00d3e5] ${buttonClassName}`}
      >
        <MoreIcon className={iconClassName} />
      </button>
      {menuOpen ? (
        <div role="menu" aria-label={`Thao tác bài ${song.title}`} className={`absolute right-0 z-40 w-[218px] overflow-hidden rounded-xl border border-white/[0.06] bg-[#292c2b] p-1.5 text-[13px] font-bold text-white shadow-2xl ${placement === 'up' ? 'bottom-full mb-2' : 'top-full mt-1'}`}>
          <button type="button" role="menuitem" onClick={handleDownload} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white/[0.09] hover:text-[#00d3e5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00d3e5]"><ActionIcon kind="download" />Tải về</button>
          <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); setPlaylistOpen(true); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white/[0.09] hover:text-[#00d3e5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00d3e5]"><ActionIcon kind="playlist" />Thêm vào playlist</button>
          <button type="button" role="menuitem" aria-expanded={shareOpen} onClick={() => setShareOpen((value) => !value)} className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white/[0.09] hover:text-[#00d3e5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00d3e5]"><span className="flex items-center gap-3"><ActionIcon kind="share" />Chia sẻ</span><span aria-hidden="true" className="text-white/45">›</span></button>
          {shareOpen ? <div className="ml-7 border-l border-white/10 pl-2"><button type="button" role="menuitem" onClick={() => void handleShare('facebook')} className="flex w-full rounded-lg px-3 py-2 text-left transition-colors hover:bg-white/[0.09] hover:text-[#00d3e5]">Facebook</button><button type="button" role="menuitem" onClick={() => void handleShare('copy_link')} className="flex w-full rounded-lg px-3 py-2 text-left transition-colors hover:bg-white/[0.09] hover:text-[#00d3e5]">Sao chép đường dẫn</button></div> : null}
          <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); setReportOpen(true); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white/[0.09] hover:text-[#00d3e5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00d3e5]"><ActionIcon kind="report" />Báo cáo</button>
        </div>
      ) : null}

      <AddSongsToPlaylistDialog songs={[song]} open={playlistOpen} onClose={() => setPlaylistOpen(false)} onAdded={notify} />

      {reportOpen ? (
        <div className="fixed inset-0 z-[120] grid place-items-center bg-black/65 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !isReporting) setReportOpen(false); }}>
          <form role="dialog" aria-modal="true" aria-labelledby={`report-song-title-${song.id}`} onSubmit={(event) => void handleReport(event)} className="w-full max-w-[420px] rounded-2xl border border-white/10 bg-[#202a28] p-5 text-white shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4"><div><h2 id={`report-song-title-${song.id}`} className="text-xl font-extrabold">Báo cáo bài hát</h2><p className="mt-1 truncate text-sm text-white/60">{song.title}</p></div><button type="button" aria-label="Đóng" onClick={() => setReportOpen(false)} disabled={isReporting} className="grid size-8 place-items-center rounded-full text-xl text-white/65 hover:bg-white/10 disabled:opacity-50">×</button></div>
            <label htmlFor={`report-reason-${song.id}`} className="mt-5 block text-sm font-semibold">Lý do</label>
            <select id={`report-reason-${song.id}`} value={reason} onChange={(event) => setReason(event.target.value as SongReportReason)} className="mt-2 h-11 w-full rounded-lg border border-white/15 bg-[#303c39] px-3 text-sm text-white outline-none focus:border-[#00cfe3]">{reportReasons.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
            <label htmlFor={`report-details-${song.id}`} className="mt-4 block text-sm font-semibold">Thông tin thêm <span className="font-normal text-white/50">(không bắt buộc)</span></label>
            <textarea id={`report-details-${song.id}`} value={details} onChange={(event) => setDetails(event.target.value)} maxLength={1000} rows={3} className="mt-2 w-full resize-y rounded-lg border border-white/15 bg-[#303c39] p-3 text-sm text-white outline-none placeholder:text-white/45 focus:border-[#00cfe3]" placeholder="Mô tả ngắn vấn đề bạn gặp" />
            {reportError ? <p role="alert" className="mt-3 text-sm text-rose-300">{reportError}</p> : null}
            <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setReportOpen(false)} disabled={isReporting} className="h-10 rounded-full px-4 text-sm font-bold text-white/70 hover:bg-white/10 disabled:opacity-50">Hủy</button><button type="submit" disabled={isReporting} className="h-10 rounded-full bg-[#00cfe3] px-5 text-sm font-extrabold text-[#07363a] hover:bg-[#34dbea] disabled:opacity-50">{isReporting ? 'Đang gửi…' : 'Gửi báo cáo'}</button></div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
