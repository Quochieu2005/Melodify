'use client';

import { Lexend } from 'next/font/google';
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type TransitionEvent as ReactTransitionEvent } from 'react';
import { listBanners, type Banner as ApiBanner } from '@/lib/api';

const lexend = Lexend({ subsets: ['latin', 'vietnamese'], weight: '700' });
const dragThreshold = 48;

type Banner = {
  id: string;
  title: string;
  image: string;
  subtitle?: string;
  linkUrl?: string | null;
};

function mapApiBanner(banner: ApiBanner): Banner {
  return {
    id: banner.id,
    title: banner.title,
    image: banner.image_url ?? '',
    linkUrl: banner.link_url,
  };
}

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

function BannerCarouselView({ banners, className, twoColumns }: { banners: Banner[]; className: string; twoColumns: boolean }) {
  const [slidePosition, setSlidePosition] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [transitionEnabled, setTransitionEnabled] = useState(true);
  const dragStartX = useRef<number | null>(null);

  const activeSet = slidePosition;
  const visibleCount = twoColumns ? 2 : 1;
  const lastPosition = Math.max(banners.length - visibleCount, 0);
  const canGoPrevious = activeSet > 0 && !isAnimating;
  const canGoNext = activeSet < lastPosition && !isAnimating;

  function goToSlide(position: number) {
    const nextPosition = Math.min(Math.max(position, 0), lastPosition);
    setDragOffset(0);
    setTransitionEnabled(true);

    if (nextPosition === slidePosition) {
      setIsAnimating(false);
      return;
    }

    setIsAnimating(true);
    setSlidePosition(nextPosition);
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

    const distance = event.clientX - dragStartX.current;
    const draggingBeyondStart = slidePosition === 0 && distance > 0;
    const draggingBeyondEnd = slidePosition === lastPosition && distance < 0;

    setDragOffset(draggingBeyondStart || draggingBeyondEnd ? 0 : distance);
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

    if (Math.abs(distance) >= dragThreshold && ((distance < 0 && canGoNext) || (distance > 0 && canGoPrevious))) {
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
            className={`flex w-full select-none ${twoColumns ? 'gap-4' : 'gap-0'} ${transitionEnabled ? 'transition-transform duration-300 ease-out' : ''}`}
            style={{
              '--banner-step': twoColumns ? 'calc(50% + 0.5rem)' : '100%',
              transform: `translate3d(calc(-${slidePosition} * var(--banner-step) + ${dragOffset}px), 0, 0)`,
              willChange: 'transform',
            } as CSSProperties}
            onTransitionEnd={handleTransitionEnd}
          >
            {banners.map((banner) => (
              <article
                key={banner.id}
                style={{
                  flex: twoColumns ? '0 0 calc((100% - 1rem) / 2)' : '0 0 100%',
                  aspectRatio: '5 / 1',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  clipPath: 'inset(0 round 16px)',
                }}
                className="banner-clip group relative min-h-0 shrink-0 bg-transparent"
              >
                {banner.image ? (
                  <div
                  className="banner-clip absolute inset-0 isolate"
                    style={{
                      borderRadius: '16px',
                      overflow: 'hidden',
                      clipPath: 'inset(0 round 16px)',
                      WebkitMaskImage: '-webkit-radial-gradient(white, black)',
                    }}
                  >
                    <img
                      src={banner.image}
                      alt=""
                      draggable={false}
                      className="banner-clip-image pointer-events-none h-full w-full select-none object-contain"
                    />
                  </div>
                ) : null}
              </article>
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
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const greetingTimer = window.setInterval(() => {
      setGreeting(getVietnamGreeting());
    }, 60_000);

    return () => window.clearInterval(greetingTimer);
  }, []);

  useEffect(() => {
    let isCurrent = true;

    listBanners({ daily: true, limit: 5 })
      .then((response) => {
        const uniqueBanners = Array.from(
          new Map(
            response.data
              .filter((banner) => banner.image_url)
              .map((banner) => [banner.image_url, banner]),
          ).values(),
        ).slice(0, 5);

        if (isCurrent) setBanners(uniqueBanners.map(mapApiBanner));
      })
      .catch(() => {
        if (isCurrent) setBanners([]);
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  return (
    <section aria-label="Gợi ý nghe nhạc">
      <h1 className={lexend.className + ' text-[34px] font-bold leading-tight text-white'} style={{ color: '#ffffff', fontFamily: 'Lexend, sans-serif', fontSize: '34px', fontWeight: 700 }}>
        {greeting}
      </h1>

      <BannerArrowSymbols />
      {!isLoading && banners.length > 0 ? (
        <>
          <BannerCarouselView banners={banners} className="xl:hidden" twoColumns={false} />
          <BannerCarouselView banners={banners} className="hidden xl:block" twoColumns />
        </>
      ) : null}
    </section>
  );
}
