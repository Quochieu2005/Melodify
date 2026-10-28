'use client';

import { useEffect, useState } from 'react';

import { listVideos, type SongVideo } from '@/lib/api';
import VideoCard from './VideoCard';

type VideoPageState = {
  videos: SongVideo[];
  page: number;
  lastPage: number;
};

export default function VideoLibraryPage() {
  const [state, setState] = useState<VideoPageState>({ videos: [], page: 1, lastPage: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    listVideos({ page: state.page, perPage: 18 })
      .then((response) => {
        if (cancelled) return;
        setState({
          videos: response.data,
          page: response.meta.current_page,
          lastPage: response.meta.last_page,
        });
      })
      .catch(() => {
        if (!cancelled) setError('Không thể tải danh sách video. Hãy thử tải lại trang.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [state.page]);

  return (
    <main className="min-h-[calc(100vh-80px)] overflow-x-hidden bg-[#202a28] px-5 pb-24 pt-8 text-white sm:px-8 lg:px-10">
      <div className="mx-auto w-full max-w-[1582px]">
        <h1 className="text-[34px] font-bold tracking-tight sm:text-[42px]">Videos</h1>

        {error ? <p role="alert" className="mt-6 rounded-xl border border-red-300/15 bg-red-400/[0.08] px-5 py-4 text-sm text-red-200">{error}</p> : null}
        {loading ? <div role="status" aria-label="Đang tải danh sách video" className="mt-6 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <div key={index} className="aspect-video animate-pulse rounded-xl bg-white/[0.06]" />)}</div> : null}

        {!loading && !error && state.videos.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-white/[0.08] bg-[#242d2b] px-6 py-16 text-center">
            <p className="text-lg font-bold">Chưa tìm thấy video</p>
            <p className="mt-2 text-sm text-white/55">Video mới sẽ xuất hiện tại đây khi được thêm vào thư viện.</p>
          </div>
        ) : null}

        {!loading && state.videos.length > 0 ? <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{state.videos.map((video) => <VideoCard key={video.id} video={video} />)}</div> : null}

        {state.lastPage > 1 && !loading ? (
          <nav aria-label="Phân trang video" className="mt-10 flex items-center justify-center gap-4">
            <button type="button" disabled={state.page <= 1} onClick={() => { setLoading(true); setError(''); setState((current) => ({ ...current, page: current.page - 1 })); }} className="rounded-full bg-white/[0.08] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/[0.14] disabled:cursor-not-allowed disabled:opacity-40">Trước</button>
            <span className="text-sm text-white/60">{state.page} / {state.lastPage}</span>
            <button type="button" disabled={state.page >= state.lastPage} onClick={() => { setLoading(true); setError(''); setState((current) => ({ ...current, page: current.page + 1 })); }} className="rounded-full bg-white/[0.08] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/[0.14] disabled:cursor-not-allowed disabled:opacity-40">Tiếp</button>
          </nav>
        ) : null}
      </div>
    </main>
  );
}
