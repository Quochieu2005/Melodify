'use client';

import { useEffect, useState } from 'react';
import { AlbumHotSection, HomeTopicsSection, MorningCarousel, MusicDiscoverySections, RankingSection } from '@/components/home';
import { getHomeBootstrap, type HomeBootstrap } from '@/lib/api';

export default function HomePage() {
  const [home, setHome] = useState<HomeBootstrap | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    getHomeBootstrap().then(({ data }) => { if (active) setHome(data); }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, []);
  if (error) return <main className="p-8 text-white" role="alert">Không tải được dữ liệu trang chủ. Vui lòng tải lại trang.</main>;
  return (
    <main className="min-h-[calc(100vh-80px)] overflow-x-hidden bg-[#202a28] px-5 py-6 pb-10 text-white sm:px-8 lg:px-7">
      <div className="w-full max-w-[1582px]">
        {home ? <>
          <MorningCarousel banners={home.banners} />
          <HomeTopicsSection genres={home.genres} topics={home.topics} />
          <AlbumHotSection albums={home.albums} />
          <RankingSection charts={home.charts} />
          <MusicDiscoverySections playlists={home.playlists} discovery={home.discovery} trendingArtists={home.trending_artists} />
        </> : <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6" aria-label="Đang tải trang chủ">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-28 animate-pulse rounded-xl bg-white/10" />)}</div>}
      </div>
    </main>
  );
}
