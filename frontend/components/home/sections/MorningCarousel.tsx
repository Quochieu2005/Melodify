'use client';

import { useState } from 'react';

type Banner = {
  title: string;
  subtitle: string;
  image: string;
  position?: string;
};

const bannerSets: Banner[][] = [
  [
    {
      title: 'Thót Một Lần Yêu Thương',
      subtitle: 'Giai điệu cho một buổi sáng dịu dàng',
      image: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1400&q=85',
      position: 'center 42%',
    },
    {
      title: 'Nhạc Mới Thịnh Hành',
      subtitle: 'Những bản nhạc đang được yêu thích',
      image: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1400&q=85',
      position: 'center 35%',
    },
  ],
  [
    {
      title: 'Chạm Vào Giai Điệu',
      subtitle: 'Playlist dành riêng cho bạn',
      image: 'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=1400&q=85',
    },
    {
      title: 'V-Pop Hôm Nay',
      subtitle: 'Khám phá những ca khúc mới',
      image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1400&q=85',
    },
  ],
];

function ArrowIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-7 fill-none stroke-current stroke-[1.5]">
      <path d={direction === 'left' ? 'm14.5 5-7 7 7 7' : 'm9.5 5 7 7-7 7'} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function MorningCarousel() {
  const [activeSet, setActiveSet] = useState(0);
  const banners = bannerSets[activeSet];

  function move(direction: 'previous' | 'next') {
    setActiveSet((current) => (direction === 'next' ? (current + 1) % bannerSets.length : (current - 1 + bannerSets.length) % bannerSets.length));
  }

  return (
    <section aria-label="Gợi ý nghe nhạc buổi sáng">
      <h1 className="text-[32px] font-bold leading-tight tracking-[-0.03em] text-white sm:text-[38px]">Chào buổi sáng</h1>

      <div className="relative mt-7 lg:px-8">
        <button type="button" aria-label="Banner trước" onClick={() => move('previous')} className="absolute left-0 top-1/2 z-10 hidden -translate-y-1/2 cursor-pointer text-white/35 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 lg:grid lg:size-8 lg:place-items-center">
          <ArrowIcon direction="left" />
        </button>

        <div className="grid gap-3 md:grid-cols-2 md:gap-4">
          {banners.map((banner) => (
            <article key={banner.title} className="group relative h-[148px] overflow-hidden rounded-[10px] bg-[#25403c] shadow-sm">
              <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-[1.03]" style={{ backgroundImage: `url(${banner.image})`, backgroundPosition: banner.position }} />
              <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-black/5 to-black/10" />
              <div className="relative flex h-full max-w-[72%] flex-col justify-end p-5 text-white">
                <p className="text-lg font-bold leading-tight drop-shadow-sm sm:text-xl">{banner.title}</p>
                <p className="mt-1 text-xs text-white/80">{banner.subtitle}</p>
              </div>
            </article>
          ))}
        </div>

        <button type="button" aria-label="Banner tiếp theo" onClick={() => move('next')} className="absolute right-0 top-1/2 z-10 hidden -translate-y-1/2 cursor-pointer text-white/35 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 lg:grid lg:size-8 lg:place-items-center">
          <ArrowIcon direction="right" />
        </button>
      </div>
    </section>
  );
}
