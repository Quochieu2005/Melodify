'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';

import { copyTextToClipboard } from '@/lib/clipboard';
import { getVideo, getVideoDownloadUrl, getVisitorId, listVideos, recordVideoShare, recordVideoView, reportVideo, toggleVideoFavorite, type SongVideo, type VideoReportReason } from '@/lib/api';
import VideoCard from './VideoCard';

const reportReasons: Array<{ value: VideoReportReason; label: string }> = [
  { value: 'incorrect_video', label: 'Video không phát được' },
  { value: 'incorrect_information', label: 'Thông tin không chính xác' },
  { value: 'duplicate', label: 'Video bị trùng' },
  { value: 'inappropriate', label: 'Nội dung không phù hợp' },
  { value: 'copyright', label: 'Vấn đề bản quyền' },
  { value: 'other', label: 'Lý do khác' },
];

function youtubeEmbedUrl(url: string) {
  const embedUrl = new URL(url);
  embedUrl.searchParams.set('controls', '1');
  embedUrl.searchParams.set('rel', '0');
  embedUrl.searchParams.set('iv_load_policy', '3');
  embedUrl.searchParams.set('playsinline', '1');
  return embedUrl.toString();
}

function HeartIcon({ active = false }: { active?: boolean }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className={`size-5 ${active ? 'fill-current' : 'fill-none stroke-current stroke-[1.8]'}`}><path d="M20.8 8.7c0 4.3-8.8 10.2-8.8 10.2S3.2 13 3.2 8.7a4.7 4.7 0 0 1 8.1-3.2l.7.8.7-.8a4.7 4.7 0 0 1 8.1 3.2Z" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function DownloadIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-none stroke-current stroke-[1.8]"><path d="M12 3v12m0 0 4-4m-4 4-4-4M4 20h16" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function ShareIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-none stroke-current stroke-[1.8]"><path d="M14 5 21 12l-7 7v-5c-5.5 0-8.5 1.4-11 5 1-8 4-12 11-13V5Z" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function ReportIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-none stroke-current stroke-[1.8]"><path d="M5 21V4m0 1h14l-3 4 3 4H5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function ArtistCredits({ artists }: { artists: SongVideo['artists'] }) {
  const names = artists?.map((artist) => artist.name).filter(Boolean) ?? [];
  return <p className="text-[16px] font-semibold text-white/70">{names.join(', ') || 'Nghệ sĩ chưa cập nhật'}</p>;
}

export default function VideoDetailPage({ slug }: { slug: string }) {
  const [video, setVideo] = useState<SongVideo | null>(null);
  const [relatedVideos, setRelatedVideos] = useState<SongVideo[]>([]);
  const [fetchState, setFetchState] = useState<{ slug: string; error: string } | null>(null);
  const [pendingAction, setPendingAction] = useState<'favorite' | 'share' | 'report' | null>(null);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<VideoReportReason>('incorrect_video');
  const [reportDetails, setReportDetails] = useState('');
  const [reportError, setReportError] = useState('');
  const [status, setStatus] = useState('');
  const loading = !fetchState || fetchState.slug !== slug;
  const error = fetchState?.slug === slug ? fetchState.error : '';

  useEffect(() => {
    let cancelled = false;

    getVideo(slug, getVisitorId())
      .then((response) => {
        if (cancelled) return;
        setVideo(response.data);
        setFetchState({ slug, error: '' });
        void recordVideoView(response.data.slug || response.data.id, getVisitorId())
          .then((result) => {
            if (!cancelled && result.recorded) {
              setVideo((current) => current ? { ...current, view_count: result.views } : current);
            }
          })
          .catch(() => undefined);
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setVideo(null);
          setFetchState({
            slug,
            error: requestError instanceof Error && requestError.message ? requestError.message : 'Không tìm thấy video này.',
          });
        }
      });

    listVideos({ perPage: 7 }).then((response) => {
      if (!cancelled) setRelatedVideos(response.data.filter((item) => (item.slug || item.id) !== slug).slice(0, 6));
    }).catch(() => undefined);

    return () => { cancelled = true; };
  }, [slug]);

  const handleFavorite = async () => {
    if (!video || pendingAction) return;
    const wasFavorite = Boolean(video.is_favorite);
    setPendingAction('favorite');
    setStatus('');
    setVideo((current) => current ? {
      ...current,
      is_favorite: !wasFavorite,
      favorite_count: Math.max(0, (current.favorite_count ?? 0) + (wasFavorite ? -1 : 1)),
    } : current);

    try {
      const result = await toggleVideoFavorite(video.slug || video.id, getVisitorId());
      setVideo((current) => current ? { ...current, is_favorite: result.favorited, favorite_count: result.favorites } : current);
    } catch {
      setVideo((current) => current ? {
        ...current,
        is_favorite: wasFavorite,
        favorite_count: Math.max(0, (current.favorite_count ?? 0) + (wasFavorite ? 1 : -1)),
      } : current);
      setStatus('Chưa thể cập nhật video yêu thích. Hãy thử lại.');
    } finally {
      setPendingAction(null);
    }
  };

  const handleShare = async (target: 'copy_link' | 'facebook') => {
    if (!video || pendingAction) return;
    const url = new URL(window.location.pathname, window.location.origin).toString();
    if (target === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'noopener,noreferrer');
    } else {
      try {
        await copyTextToClipboard(url);
      } catch {
        setStatus('Không thể sao chép liên kết trên trình duyệt này.');
        return;
      }
    }

    setShareMenuOpen(false);
    setPendingAction('share');
    try {
      const result = await recordVideoShare(video.slug || video.id, target, getVisitorId());
      setVideo((current) => current ? { ...current, share_count: result.shares } : current);
      setStatus(target === 'copy_link' ? 'Đã sao chép liên kết video.' : 'Đã mở chia sẻ Facebook.');
    } catch {
      setStatus('Đã chia sẻ nhưng máy chủ chưa ghi nhận được lượt chia sẻ.');
    } finally {
      setPendingAction(null);
    }
  };

  const handleReport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!video || pendingAction) return;
    setPendingAction('report');
    setReportError('');
    try {
      const result = await reportVideo(video, reportReason, reportDetails.trim(), getVisitorId());
      setReportOpen(false);
      setReportDetails('');
      setStatus(result.message);
    } catch (requestError: unknown) {
      setReportError(requestError instanceof Error ? requestError.message : 'Không thể gửi báo cáo. Hãy thử lại.');
    } finally {
      setPendingAction(null);
    }
  };

  if (loading) {
    return <main className="min-h-[calc(100vh-80px)] bg-[#202a28] px-5 pb-24 pt-8 sm:px-8 lg:px-10"><div role="status" aria-label="Đang tải video" className="mx-auto aspect-video max-w-[1250px] animate-pulse rounded-2xl bg-white/[0.06]" /></main>;
  }

  if (error || !video) {
    return <main className="min-h-[calc(100vh-80px)] bg-[#202a28] px-5 pb-24 pt-8 text-white sm:px-8 lg:px-10"><div className="mx-auto max-w-[1000px]"><p role="alert" className="rounded-xl border border-white/[0.08] bg-[#252e2c] px-5 py-6 text-white/75">{error || 'Không tìm thấy video này.'}</p></div></main>;
  }

  return (
    <main className="min-h-[calc(100vh-80px)] overflow-x-hidden bg-[#202a28] px-5 pb-28 pt-7 text-white sm:px-8 lg:px-10">
      <div className="mx-auto w-full max-w-[1582px]">
        <div className="overflow-hidden rounded-2xl bg-[#111615] shadow-[0_28px_90px_rgba(0,0,0,0.22)]">
          {video.player_type === 'youtube' && video.embed_url ? (
            <iframe title={video.title} src={youtubeEmbedUrl(video.embed_url)} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen className="aspect-video w-full border-0" />
          ) : video.video_url ? (
            <video controls playsInline preload="metadata" poster={video.thumbnail_url || undefined} className="aspect-video w-full bg-black object-contain">
              <source src={video.video_url} />
              Trình duyệt không hỗ trợ phát video này.
            </video>
          ) : (
            <div role="img" aria-label={`Video ${video.title} chưa có nguồn phát`} className="grid aspect-video place-items-center bg-black text-sm text-white/55">Video chưa có nguồn phát.</div>
          )}
        </div>

        <section className="mt-6 flex flex-col gap-5 border-b border-white/[0.09] pb-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-[28px] font-bold leading-tight sm:text-[36px]">{video.title}</h1>
            <div className="mt-2"><ArtistCredits artists={video.artists} /></div>
            {video.source ? <p className="mt-3 text-xs text-white/45">Nguồn video: {video.source === 'nhaccuatui' ? 'NhacCuaTui' : video.source === 'youtube' ? 'YouTube' : 'Melodify'}</p> : null}
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <button type="button" aria-pressed={Boolean(video.is_favorite)} disabled={pendingAction !== null} onClick={() => void handleFavorite()} className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:opacity-60 ${video.is_favorite ? 'bg-[#ff4777] text-white hover:bg-[#ff6089]' : 'bg-white/[0.09] text-white hover:bg-white/[0.15]'}`}>
              <HeartIcon active={Boolean(video.is_favorite)} /> Yêu thích <span className="text-white/70">{new Intl.NumberFormat('vi-VN').format(video.favorite_count ?? 0)}</span>
            </button>
            {video.can_download ? (
              <a href={getVideoDownloadUrl(video)} className="inline-flex items-center gap-2 rounded-full bg-white/[0.09] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/[0.15] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"><DownloadIcon /> Tải video</a>
            ) : (
              <button type="button" disabled title="Nguồn này không cho tải video trực tiếp" className="inline-flex cursor-not-allowed items-center gap-2 rounded-full bg-white/[0.05] px-4 py-2.5 text-sm font-bold text-white/40"><DownloadIcon /> Không hỗ trợ tải</button>
            )}
            <div className="relative">
              <button type="button" aria-expanded={shareMenuOpen} onClick={() => setShareMenuOpen((open) => !open)} className="inline-flex items-center gap-2 rounded-full bg-white/[0.09] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/[0.15] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"><ShareIcon /> Chia sẻ <span className="text-white/60">{new Intl.NumberFormat('vi-VN').format(video.share_count ?? 0)}</span></button>
              {shareMenuOpen ? <div role="menu" aria-label="Chia sẻ video" className="absolute right-0 top-full z-20 mt-2 w-56 overflow-hidden rounded-xl border border-white/[0.08] bg-[#292c2b] p-1.5 text-sm font-semibold shadow-2xl"><button type="button" role="menuitem" onClick={() => void handleShare('copy_link')} className="w-full rounded-lg px-3 py-2.5 text-left hover:bg-white/[0.09]">Sao chép liên kết</button><button type="button" role="menuitem" onClick={() => void handleShare('facebook')} className="w-full rounded-lg px-3 py-2.5 text-left hover:bg-white/[0.09]">Facebook</button></div> : null}
            </div>
            <button type="button" onClick={() => { setReportError(''); setReportOpen(true); }} className="inline-flex items-center gap-2 rounded-full bg-white/[0.09] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/[0.15] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"><ReportIcon /> Báo cáo</button>
          </div>
        </section>

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/50">
          <span>{new Intl.NumberFormat('vi-VN').format(video.view_count ?? 0)} lượt xem</span>
          {video.duration_seconds ? <span>{Math.floor(video.duration_seconds / 60)}:{String(video.duration_seconds % 60).padStart(2, '0')}</span> : null}
          {video.source_url ? <a href={video.source_url} target="_blank" rel="noreferrer" className="transition-colors hover:text-white">Xem tại nguồn</a> : null}
        </div>
        {status ? <p role="status" className="mt-4 text-sm text-cyan-200">{status}</p> : null}

        {relatedVideos.length > 0 ? <section className="mt-12" aria-labelledby="related-videos-heading"><div className="mb-5 flex items-end justify-between gap-4"><h2 id="related-videos-heading" className="text-[23px] font-bold sm:text-[27px]">Video khác</h2><Link href="/videos" className="text-sm text-white/60 hover:text-white">Tất cả</Link></div><div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">{relatedVideos.map((item) => <VideoCard key={item.id} video={item} />)}</div></section> : null}
      </div>

      {reportOpen ? <div role="presentation" className="fixed inset-0 z-[100] grid place-items-center bg-black/75 px-4 py-6 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setReportOpen(false); }}>
        <form role="dialog" aria-modal="true" aria-labelledby="video-report-title" onSubmit={(event) => void handleReport(event)} className="relative w-full max-w-[520px] rounded-2xl border border-white/[0.08] bg-[#222625] p-6 text-white shadow-2xl sm:p-7">
          <button type="button" aria-label="Đóng báo cáo" onClick={() => setReportOpen(false)} className="absolute right-5 top-4 text-2xl text-white/60 hover:text-white">×</button>
          <h2 id="video-report-title" className="pr-8 text-[23px] font-bold">Báo cáo video</h2>
          <p className="mt-2 truncate text-sm text-white/55">{video.title}</p>
          <label htmlFor="video-report-reason" className="mt-6 block text-sm font-semibold">Lý do báo cáo</label>
          <select id="video-report-reason" value={reportReason} onChange={(event) => setReportReason(event.target.value as VideoReportReason)} className="mt-2 w-full rounded-lg border border-white/10 bg-[#343a38] px-3 py-3 text-sm text-white outline-none focus:border-cyan-300">{reportReasons.map((reason) => <option key={reason.value} value={reason.value}>{reason.label}</option>)}</select>
          <label htmlFor="video-report-details" className="mt-4 block text-sm font-semibold">Thông tin bổ sung</label>
          <textarea id="video-report-details" value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} maxLength={1000} rows={4} placeholder="Mô tả vấn đề nếu cần" className="mt-2 w-full resize-y rounded-lg border border-white/10 bg-[#343a38] px-3 py-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-cyan-300" />
          {reportError ? <p role="alert" className="mt-3 text-sm text-red-300">{reportError}</p> : null}
          <div className="mt-5 flex justify-end gap-3"><button type="button" onClick={() => setReportOpen(false)} className="rounded-full bg-white/[0.1] px-5 py-2.5 text-sm font-bold hover:bg-white/[0.16]">Hủy</button><button type="submit" disabled={pendingAction === 'report'} className="rounded-full bg-[#00cfe3] px-5 py-2.5 text-sm font-bold text-[#082c30] hover:bg-cyan-300 disabled:opacity-50">{pendingAction === 'report' ? 'Đang gửi…' : 'Gửi báo cáo'}</button></div>
        </form>
      </div> : null}
    </main>
  );
}
