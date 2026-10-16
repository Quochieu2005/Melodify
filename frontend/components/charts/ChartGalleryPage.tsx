'use client';

import { Lexend } from 'next/font/google';
import { useEffect, useState } from 'react';

import ChartCard from './ChartCard';
import { listCharts, type ChartRecord } from '@/lib/api';

const lexend = Lexend({ subsets: ['latin', 'vietnamese'], weight: '700' });

export default function ChartGalleryPage() {
  const [request, setRequest] = useState<{ charts: ChartRecord[]; loading: boolean; error: string }>({ charts: [], loading: true, error: '' });

  useEffect(() => {
    let cancelled = false;
    listCharts()
      .then((response) => {
        if (!cancelled) setRequest({ charts: response.data, loading: false, error: '' });
      })
      .catch(() => {
        if (!cancelled) setRequest({ charts: [], loading: false, error: 'Không thể tải bảng xếp hạng lúc này.' });
      });

    return () => { cancelled = true; };
  }, []);

  return (
    <main className="min-h-[calc(100vh-80px)] overflow-x-hidden bg-[#202a28] px-5 py-8 pb-24 text-white sm:px-8 lg:px-10">
      <div className="mx-auto w-full max-w-[1582px]">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300/75">Melodify charts</p>
            <h1 className={`${lexend.className} mt-2 text-3xl font-bold tracking-tight sm:text-4xl`}>Bảng Xếp Hạng</h1>
          </div>
          <span className="hidden text-sm text-white/45 sm:block">Cập nhật theo lượt nghe hôm nay</span>
        </div>

        {request.loading ? (
          <div className="mt-9 grid gap-6 lg:grid-cols-2" aria-label="Đang tải bảng xếp hạng">
            {[1, 2, 3, 4].map((item) => <div key={item} className="h-[410px] animate-pulse rounded-[12px] bg-white/10" />)}
          </div>
        ) : request.error ? (
          <p role="alert" className="mt-9 rounded-xl bg-white/10 px-4 py-5 text-sm text-white/70">{request.error}</p>
        ) : request.charts.length === 0 ? (
          <p className="mt-9 rounded-xl bg-white/10 px-4 py-5 text-sm text-white/70">Chưa có bảng xếp hạng.</p>
        ) : (
          <div className="mt-9 grid gap-6 lg:grid-cols-2">
            {request.charts.map((chart) => <ChartCard key={chart.slug} chart={chart} />)}
          </div>
        )}
      </div>
    </main>
  );
}
