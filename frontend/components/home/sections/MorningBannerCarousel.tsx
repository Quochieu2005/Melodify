'use client';

import { Lexend } from 'next/font/google';
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type TransitionEvent as ReactTransitionEvent } from 'react';

const lexend = Lexend({ subsets: ['latin', 'vietnamese'], weight: '700' });
const dragThreshold = 48;

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

const mobileBannerSets: Banner[][] = bannerSets.flat().map((banner) => [banner]);

function getVietnamGreeting() {
  const hour = Number(
    new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hour12: false,
      timeZone: 'Asia/Ho_Chi_Minh',
    }).format(new Date()),
  );

  if (hour >= 5 && hour < 12) {
    return 'Chào buổi sáng';
  }

  if (hour >= 12 && hour < 18) {
    return 'Chào buổi chiều';
  }

  return 'Chào buổi tối';
}

function ArrowIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" aria-hidden="true" style={{ width: 40, height: 40 }} className="svg-icon">
      <use href={`#icon-banner_${direction}_arrow`} />
    </svg>
  );
}

function BannerArrowSymbols() {
  return (
    <svg aria-hidden="true" className="absolute h-0 w-0 overflow-hidden">
      <symbol id="icon-banner_left_arrow" viewBox="0 0 40 40">
        <path d="M25.5 6.5 14 20l11.5 13.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
      </symbol>
      <symbol id="icon-banner_right_arrow" viewBox="0 0 40 40">
        <path d="M14.5 6.5 26 20 14.5 33.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
      </symbol>
    </svg>
  );
}

function BannerCarouselView({ slides, className, twoColumns }: { slides: Banner[][]; className: string; twoColumns: boolean }) {
  const [slidePosition, setSlidePosition] = useState(1);
  const [dragOffset, setDragOffset] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [transitionEnabled, setTransitionEnabled] = useState(true);
  const dragStartX = useRef<number | null>(null);
  const loopedSlides = [slides[slides.length - 1], ...slides, slides[0]];

  const activeSet = (slidePosition - 1 + slides.length) % slides.length;
  const canGoPrevious = activeSet > 0 && !isAnimating;
  const canGoNext = activeSet < slides.length - 1 && !isAnimating;

  function goToSlide(position: number) {
    setDragOffset(0);
    setTransitionEnabled(true);
    setIsAnimating(true);
    setSlidePosition(position);
  }

  function moveByButton(direction: 'previous' | 'next') {
    if (direction === 'previous' && !canGoPrevious) {
      return;
    }

    if (direction === 'next' && !canGoNext) {
      return;
    }

    goToSlide(slidePosition + (direction === 'next' ? 1 : -1));
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (isAnimating || (event.pointerType === 'mouse' && event.button !== 0)) {
      return;
    }

    dragStartX.current = event.clientX;
    setDragOffset(0);
    setTransitionEnabled(false);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragStartX.current === null) {
      return;
    }

    setDragOffset(event.clientX - dragStartX.current);
  }

  function releasePointer(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragStartX.current === null) {
      return;
    }

    const distance = event.clientX - dragStartX.current;
    dragStartX.current = null;
    releasePointer(event);

    if (Math.abs(distance) >= dragThreshold) {
      goToSlide(slidePosition + (distance < 0 ? 1 : -1));
      return;
    }

    setTransitionEnabled(true);
    setDragOffset(0);
  }

  function handlePointerCancel(event: ReactPointerEvent<HTMLDivElement>) {
    dragStartX.current = null;
    setTransitionEnabled(true);
    setDragOffset(0);
    releasePointer(event);
  }

  function handleTransitionEnd(event: ReactTransitionEvent<HTMLDivElement>) {
    if (event.propertyName !== 'transform') {
      return;
    }

    if (slidePosition === 0) {
      setTransitionEnabled(false);
      setSlidePosition(slides.length);
      requestAnimationFrame(() => setTransitionEnabled(true));
    }

    if (slidePosition === slides.length + 1) {
      setTransitionEnabled(false);
      setSlidePosition(1);
      requestAnimationFrame(() => setTransitionEnabled(true));
    }

    setIsAnimating(false);
  }

  return (
    <div className={className}>
      <div className="relative mt-7 w-full px-8 sm:px-10 lg:px-0">
        <button
          type="button"
          aria-label="Banner trước"
          disabled={!canGoPrevious}
          onClick={() => moveByButton('previous')}
          className="absolute left-0 top-1/2 z-10 grid size-10 -translate-y-1/2 place-items-center text-[#9ba5a2] transition-colors hover:text-white disabled:cursor-not-allowed disabled:text-[#64706c] disabled:hover:text-[#64706c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 lg:-left-8"
        >
          <ArrowIcon direction="left" />
        </button>

        <div
          className="w-full cursor-pointer overflow-hidden"
          style={{ touchAction: 'pan-y' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
        >
          <div
            className={`flex w-full select-none ${transitionEnabled ? 'transition-transform duration-300 ease-out' : ''}`}
            style={{
              transform: `translate3d(calc(-${slidePosition * 100}% + ${dragOffset}px), 0, 0)`,
              willChange: 'transform',
            }}
            onTransitionEnd={handleTransitionEnd}
          >
            {loopedSlides.map((banners, setIndex) => (
              <div key={`banner-set-${setIndex}`} className="w-full shrink-0">
                <div className={twoColumns ? 'grid w-full grid-cols-2 gap-4' : 'grid w-full'}>
                  {banners.map((banner) => (
                    <article key={banner.title} className={'group relative h-[157px] w-full overflow-hidden rounded-[10px] bg-[#25403c] shadow-sm' + (twoColumns ? ' max-w-[785px]' : '')}>
                      <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-[1.03]" style={{ backgroundImage: `url(${banner.image})`, backgroundPosition: banner.position }} />
                      <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-black/5 to-black/10" />
                      <div className="relative flex h-full max-w-[85%] flex-col justify-center px-4 text-white sm:max-w-[78%] sm:px-6">
                        <p className="text-lg font-bold leading-tight drop-shadow-sm sm:text-xl">{banner.title}</p>
                        <p className="mt-1 text-xs text-white/85">{banner.subtitle}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          aria-label="Banner tiếp theo"
          disabled={!canGoNext}
          onClick={() => moveByButton('next')}
          className="absolute right-0 top-1/2 z-10 grid size-10 -translate-y-1/2 place-items-center text-[#9ba5a2] transition-colors hover:text-white disabled:cursor-not-allowed disabled:text-[#64706c] disabled:hover:text-[#64706c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 lg:-right-8"
        >
          <ArrowIcon direction="right" />
        </button>
      </div>
    </div>
  );
}

export default function MorningBannerCarousel() {
  const [greeting, setGreeting] = useState(getVietnamGreeting);

  useEffect(() => {
    const greetingTimer = window.setInterval(() => {
      setGreeting(getVietnamGreeting());
    }, 60_000);

    return () => window.clearInterval(greetingTimer);
  }, []);

  return (
    <section aria-label="Gợi ý nghe nhạc">
      <h1 className={lexend.className + ' text-[34px] font-bold leading-tight text-white'} style={{ color: '#ffffff', fontFamily: 'Lexend, sans-serif', fontSize: '34px', fontWeight: 700 }}>
        {greeting}
      </h1>

      <BannerArrowSymbols />
      <BannerCarouselView slides={mobileBannerSets} className="xl:hidden" twoColumns={false} />
      <BannerCarouselView slides={bannerSets} className="hidden xl:block" twoColumns />
    </section>
  );
}
