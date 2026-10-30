'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';

import { AddSongsToPlaylistDialog } from '@/components/playlists/AddSongsToPlaylistDialog';
import { usePlayer } from '@/components/player/PlayerProvider';
import { copyTextToClipboard } from '@/lib/clipboard';
import {
  AUTH_TOKEN_STORAGE_KEY,
  getSongDownloadUrl,
  getVisitorId,
  recordSongShare,
  reportSong,
  type Song,
  type SongAudioQuality,
  type SongReportReason,
} from '@/lib/api';
import { songPath } from '@/lib/recent-history';

type DownloadTier = 'standard' | 'high' | 'lossless';

const downloadTiers: Array<{ id: DownloadTier; label: string; estimateBitrate: number; premium: boolean }> = [
  { id: 'standard', label: 'Chất lượng tiêu chuẩn', estimateBitrate: 128, premium: false },
  { id: 'high', label: 'Chất lượng cao', estimateBitrate: 320, premium: false },
  { id: 'lossless', label: 'Lossless', estimateBitrate: 1260, premium: true },
];

function bitrateOf(quality: SongAudioQuality) {
  return quality.bitrate ?? (Number.parseInt(quality.label, 10) || 0);
}

function isLosslessQuality(quality: SongAudioQuality) {
  return /lossless|flac|alac/i.test(quality.label) || bitrateOf(quality) >= 900;
}

function isHighQuality(quality: SongAudioQuality) {
  return bitrateOf(quality) >= 256 || /\bhigh\b|\bhq\b/i.test(quality.label);
}

function qualityForSong(song: Song, tier: DownloadTier): SongAudioQuality | null | undefined {
  const qualities = song.audio_qualities ?? [];
  if (qualities.length === 0) {
    if (tier === 'standard') return null;
    return tier === 'lossless' && song.premium_only && hasFallbackDownloadForSong(song) ? null : undefined;
  }

  const available = qualities.filter((quality) => quality.available !== false && Boolean(quality.download_url));
  if (tier === 'lossless') {
    const lossless = available.filter(isLosslessQuality).sort((left, right) => bitrateOf(right) - bitrateOf(left));
    return lossless[0] ?? (song.premium_only && hasFallbackDownloadForSong(song) ? null : undefined);
  }

  const regularQualities = available.filter((quality) => !isLosslessQuality(quality));
  if (tier === 'standard') {
    const standardQualities = regularQualities.filter((quality) => !quality.premium_only);
    return (standardQualities.length ? standardQualities : regularQualities)
      .sort((left, right) => bitrateOf(left) - bitrateOf(right))[0];
  }

  const highQualities = regularQualities.filter(isHighQuality);
  const nonVipHighQualities = highQualities.filter((quality) => !quality.premium_only);
  return (nonVipHighQualities.length ? nonVipHighQualities : highQualities)
    .sort((left, right) => bitrateOf(right) - bitrateOf(left))[0];
}

function estimatedSize(song: Song, tier: (typeof downloadTiers)[number], quality: SongAudioQuality | null | undefined) {
  if (!song.duration_seconds) return null;
  const megabytes = song.duration_seconds * (quality ? bitrateOf(quality) || tier.estimateBitrate : tier.estimateBitrate) / 8 / 1000;
  return megabytes > 0 ? `${megabytes.toFixed(1)}MB` : null;
}

function hasFallbackDownloadForSong(song: Song, downloadUrl?: string | null) {
  return Boolean(downloadUrl || song.download_url) || song.has_full_audio === true;
}

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

function ActionIcon({ kind }: { kind: 'download' | 'playlist' | 'share' | 'remove' | 'report' }) {
  const paths = {
    download: <path d="M12 3v11m0 0 4-4m-4 4-4-4M4 20h16" />,
    playlist: <path d="M4 6h16M4 12h10M4 18h10m5-4v8m-4-4h8" />,
    share: <path d="M14 4 22 11l-8 7v-5c-5 0-8 1.5-11 6 1-8 4-12 11-12V4Z" />,
    remove: <path d="M4 7h16m-10 4v7m4-7v7M6 7l1 14h10l1-14M9 7V4h6v3" />,
    report: <path d="M5 21V4m0 1h13l-2.5 4L18 13H5" />,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[18px] shrink-0 fill-none stroke-current stroke-[1.8]" strokeLinecap="round" strokeLinejoin="round">{paths[kind]}</svg>;
}

function ChevronIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 shrink-0 fill-none stroke-current stroke-[1.8]"><path d="m9 5 7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export function SongRowActionMenu({
  song,
  buttonClassName = '',
  menuClassName = 'w-[218px]',
  onStatus,
  placement = 'down',
  downloadUrl,
  iconClassName,
  onShareRecorded,
  onRemoveFromQueue,
  onMenuOpenChange,
}: {
  song: Song;
  buttonClassName?: string;
  menuClassName?: string;
  onStatus?: (message: string) => void;
  placement?: 'up' | 'down';
  downloadUrl?: string | null;
  iconClassName?: string;
  onShareRecorded?: (shares: number) => void;
  onRemoveFromQueue?: () => void;
  onMenuOpenChange?: (open: boolean) => void;
}) {
  const { isPremium, requestVipAccess } = usePlayer();
  const rootRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [downloadSubmenuSide, setDownloadSubmenuSide] = useState<'left' | 'right'>('right');
  const [shareOpen, setShareOpen] = useState(false);
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState<SongReportReason>('incorrect_audio');
  const [details, setDetails] = useState('');
  const [isReporting, setIsReporting] = useState(false);
  const [reportError, setReportError] = useState('');
  const updateMenuOpen = (open: boolean) => {
    setMenuOpen(open);
    onMenuOpenChange?.(open);
  };

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        setMenuOpen(false);
        onMenuOpenChange?.(false);
        setShareOpen(false);
        setDownloadOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        onMenuOpenChange?.(false);
        setShareOpen(false);
        setDownloadOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen, onMenuOpenChange]);

  const notify = (message: string) => onStatus?.(message);

  const handleDownload = (tierId: DownloadTier) => {
    const tier = downloadTiers.find((item) => item.id === tierId);
    if (!tier) return;

    const quality = qualityForSong(song, tierId);
    const hasFallbackDownload = hasFallbackDownloadForSong(song, downloadUrl);
    const requiresVip = tier.premium || Boolean(song.premium_only) || Boolean(quality?.premium_only) || Boolean(quality && isLosslessQuality(quality));
    if (requiresVip && !isPremium) {
      updateMenuOpen(false);
      setDownloadOpen(false);
      requestVipAccess();
      return;
    }

    if (quality === undefined || (!quality && !hasFallbackDownload)) {
      notify(`Bài hát chưa có file tải ở ${tier.label.toLowerCase()}.`);
      return;
    }

    const anchor = document.createElement('a');
    let url = quality
      ? getSongDownloadUrl(song, quality.quality_id)
      : downloadUrl || getSongDownloadUrl(song);
    if (requiresVip) {
      const accessToken = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
      if (accessToken) {
        const download = new URL(url, window.location.origin);
        download.searchParams.set('access_token', accessToken);
        url = download.toString();
      }
    }
    anchor.href = url;
    anchor.rel = 'noopener noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    updateMenuOpen(false);
    setDownloadOpen(false);
    notify(`Đang tải ${song.title} (${tier.label.toLowerCase()}).`);
  };

  const toggleDownloadMenu = () => {
    const opening = !downloadOpen;
    const bounds = rootRef.current?.getBoundingClientRect();
    const menuWidth = Number(menuClassName.match(/w-\[(\d+(?:\.\d+)?)px\]/)?.[1]) || 218;
    const menuLeft = bounds ? bounds.right - menuWidth : 0;
    const rightSpace = bounds ? window.innerWidth - bounds.right : window.innerWidth;
    setDownloadSubmenuSide(rightSpace < 310 && menuLeft >= 310 ? 'left' : 'right');
    setDownloadOpen(opening);
    setShareOpen(false);
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
      updateMenuOpen(false);
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
      updateMenuOpen(false);
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
        onClick={() => { updateMenuOpen(!menuOpen); setShareOpen(false); setDownloadOpen(false); }}
        className={`grid size-8 place-items-center rounded-full text-white/75 outline-none transition-[opacity,background-color,color] hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-[#00d3e5] ${buttonClassName}`}
      >
        <MoreIcon className={iconClassName} />
      </button>
      {menuOpen ? (
        <div className={`absolute right-0 z-40 ${placement === 'up' ? 'bottom-full mb-2' : 'top-full mt-1'}`}>
          <div role="menu" aria-label={`Thao tác bài ${song.title}`} className={`${menuClassName} overflow-hidden rounded-xl border border-white/[0.06] bg-[#292c2b] p-1.5 text-[13px] font-bold text-white shadow-2xl`}>
            <button type="button" role="menuitem" aria-controls={`song-download-menu-${song.id}`} aria-expanded={downloadOpen} onClick={toggleDownloadMenu} className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white/[0.09] hover:text-[#00d3e5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00d3e5] ${downloadOpen ? 'bg-white/[0.09] text-[#00d3e5]' : ''}`}><span className="flex items-center gap-3"><ActionIcon kind="download" />Tải về</span><ChevronIcon /></button>
            <button type="button" role="menuitem" onClick={() => { updateMenuOpen(false); setDownloadOpen(false); setPlaylistOpen(true); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white/[0.09] hover:text-[#00d3e5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00d3e5]"><ActionIcon kind="playlist" />Thêm vào playlist</button>
            <button type="button" role="menuitem" aria-controls={`song-share-menu-${song.id}`} aria-expanded={shareOpen} onClick={() => { setDownloadOpen(false); setShareOpen((value) => !value); }} className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white/[0.09] hover:text-[#00d3e5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00d3e5]"><span className="flex items-center gap-3"><ActionIcon kind="share" />Chia sẻ</span><span aria-hidden="true" className="text-white/45">›</span></button>
            {onRemoveFromQueue ? <button type="button" role="menuitem" onClick={() => { updateMenuOpen(false); setDownloadOpen(false); onRemoveFromQueue(); notify('Đã xóa khỏi danh sách phát.'); }} className="flex w-full items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white/[0.09] hover:text-[#00d3e5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00d3e5]"><ActionIcon kind="remove" />Xóa khỏi danh sách phát</button> : null}
            <button type="button" role="menuitem" onClick={() => { updateMenuOpen(false); setShareOpen(false); setDownloadOpen(false); setReportOpen(true); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white/[0.09] hover:text-[#00d3e5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00d3e5]"><ActionIcon kind="report" />Báo cáo</button>
          </div>
          {downloadOpen ? (
            <div id={`song-download-menu-${song.id}`} role="menu" aria-label={`Chất lượng tải ${song.title}`} className={`absolute top-0 z-50 w-[260px] max-w-[calc(100vw-24px)] overflow-hidden rounded-xl border border-white/[0.06] bg-[#292c2b] p-1.5 text-[13px] font-bold text-white shadow-2xl ${downloadSubmenuSide === 'right' ? 'left-full ml-1' : 'right-full mr-1'}`}>
              {downloadTiers.map((tier) => {
                const quality = qualityForSong(song, tier.id);
                const available = quality !== undefined
                  && (Boolean(quality) || hasFallbackDownloadForSong(song, downloadUrl));
                const requiresVip = tier.premium || Boolean(song.premium_only) || Boolean(quality?.premium_only) || Boolean(quality && isLosslessQuality(quality));
                const disabled = !available;
                const size = estimatedSize(song, tier, quality);

                return <button key={tier.id} type="button" role="menuitem" disabled={disabled} title={disabled ? 'Bài hát chưa có file tải ở chất lượng này' : undefined} onClick={() => handleDownload(tier.id)} className="flex min-h-10 w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-white/[0.09] hover:text-[#00d3e5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00d3e5] disabled:cursor-not-allowed disabled:opacity-50">
                  <span>{tier.label}{size ? ` (~${size})` : ''}</span>
                  {requiresVip ? <span className="shrink-0 rounded bg-[#f4b84a] px-1.5 py-0.5 text-[10px] font-extrabold text-[#38240b]">VIP</span> : null}
                </button>;
              })}
            </div>
          ) : null}
          {shareOpen ? (
            <div id={`song-share-menu-${song.id}`} role="menu" aria-label={`Chia sẻ bài ${song.title}`} className="absolute right-full top-1/2 mr-2 w-[190px] -translate-y-1/2 overflow-hidden rounded-xl border border-white/[0.06] bg-[#292c2b] p-1.5 text-[13px] font-bold text-white shadow-2xl">
              <button type="button" role="menuitem" onClick={() => void handleShare('facebook')} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white/[0.09] hover:text-[#00d3e5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00d3e5]"><span aria-hidden="true" className="grid size-5 place-items-center rounded-full bg-[#1877f2] text-[14px] font-extrabold text-white">f</span>Facebook</button>
              <button type="button" role="menuitem" onClick={() => void handleShare('copy_link')} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white/[0.09] hover:text-[#00d3e5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00d3e5]"><svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 shrink-0 fill-none stroke-current stroke-[1.8]"><path d="m9.6 14.4 4.8-4.8m-7.2 7.2-1.2 1.2a3.4 3.4 0 0 1-4.8-4.8l4-4a3.4 3.4 0 0 1 4.8 0m2.4-2.4 1.2-1.2a3.4 3.4 0 0 1 4.8 4.8l-4 4a3.4 3.4 0 0 1-4.8 0" strokeLinecap="round" strokeLinejoin="round" /></svg>Sao chép đường dẫn</button>
            </div>
          ) : null}
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
