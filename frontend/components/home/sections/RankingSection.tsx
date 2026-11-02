'use client';

import Link from 'next/link';

import { ChartCard } from '@/components/charts';
import type { ChartRecord } from '@/lib/api';

import styles from './RankingSection.module.css';


export default function RankingSection({ charts }: { charts: ChartRecord[] }) {
  const populatedCharts = charts.filter((chart) => chart.song_count > 0 && chart.songs.length > 0);
  if (populatedCharts.length === 0) return null;

  return (
    <section aria-labelledby="ranking-heading" className={`mt-12 w-full ${styles.rankingSection}`}>
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 id="ranking-heading" className="text-[24px] font-bold leading-none text-white">Bảng Xếp Hạng</h2>
        <Link href="/charts" className="cursor-pointer text-[14px] font-medium text-[#bdbdbd] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#202a28]">Thêm</Link>
      </div>

      <div aria-label="Bảng xếp hạng" className={`${styles.boardScroller} w-full`}>
        <div className={styles.boardTrack}>{populatedCharts.map((chart) => <ChartCard key={chart.slug} chart={chart} />)}</div>
      </div>
    </section>
  );
}
