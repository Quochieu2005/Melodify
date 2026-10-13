import { AlbumHotSection, HomeTopicsSection, MorningCarousel, MusicDiscoverySections, RankingSection } from '@/components/home';

export default function HomePage() {
  return (
    <main className="min-h-[calc(100vh-80px)] overflow-x-hidden bg-[#202a28] px-5 py-6 pb-10 text-white sm:px-8 lg:px-7">
      <div className="w-full max-w-[1582px]">
        <MorningCarousel />
        <HomeTopicsSection />
        <AlbumHotSection />
        <RankingSection />
        <MusicDiscoverySections />
      </div>
    </main>
  );
}
