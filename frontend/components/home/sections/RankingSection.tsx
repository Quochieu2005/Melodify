'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { ChartCard } from '@/components/charts';
import { getHomeBootstrap, type ChartRecord } from '@/lib/api';

import styles from './RankingSection.module.css';


export default function RankingSection() {
  const [request, setRequest] = useState<{ charts: ChartRecord[]; loading: boolean; error: string }>({ charts: [], loading: true, error: '' });

  useEffect(() => {
    let cancelled = false;
    getHomeBootstrap()
      .then((response) => { if (!cancelled) setRequest({ charts: response.data.charts || [], loading: false, error: '' }); })
      .catch(() => { if (!cancelled) setRequest({ charts: [], loading: false, error: 'Không thể tải bảng xếp hạng.' }); });
    return () => { cancelled = true; };
  }, []);

  return (
    <section aria-labelledby="ranking-heading" className={`mt-12 w-full ${styles.rankingSection}`}>
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 id="ranking-heading" className="text-[24px] font-bold leading-none text-white">Bảng Xếp Hạng</h2>
        <Link href="/charts" className="cursor-pointer text-[14px] font-medium text-[#bdbdbd] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#202a28]">Thêm</Link>
      </div>

      <div aria-label="Bảng xếp hạng" className={`${styles.boardScroller} w-full`}>
        {request.loading ? (
          <div className={styles.boardTrack}>{[1, 2, 3].map((item) => <div key={item} className="min-h-[460px] animate-pulse rounded-[12px] bg-white/10" />)}</div>
        ) : request.error ? (
          <p role="alert" className="rounded-xl bg-white/10 px-4 py-5 text-sm text-white/70">{request.error}</p>
        ) : request.charts.length > 0 ? (
          <div className={styles.boardTrack}>{request.charts.map((chart) => <ChartCard key={chart.slug} chart={chart} />)}</div>
        ) : (
          <p className="rounded-xl bg-white/10 px-4 py-5 text-sm text-white/70">Chưa có bảng xếp hạng.</p>
        )}
      </div>
    </section>
  );
}
