'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { listVideos, type SongVideo } from '@/lib/api';

const fallbackCover = '/images/cover-placeholder.svg';

function durationLabel(seconds?: number | null) {
  if (seconds === null || seconds === undefined || seconds <= 0) return null;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}

function VideoPreviewCard({ video }: { video: SongVideo }) {
  const href = `/video/${encodeURIComponent(video.slug || video.id)}`;
  const artists = video.artists?.map((artist) => artist.name).filter(Boolean).join(', ');
  const duration = durationLabel(video.duration_seconds);

  return (
    <Link href={href} aria-label={`Xem video ${video.title}`} className="group min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
      <div className="relative aspect-video overflow-hidden rounded-xl bg-[#18211f]">
        <Image
          src={video.thumbnail_url || fallbackCover}
          alt=""
          fill
          unoptimized
          sizes="(max-width: 640px) 100vw, (max-width: 1100px) 50vw, 33vw"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.035]"
        />
        <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
        {duration ? <span className="absolute bottom-2 right-2 rounded bg-black/85 px-2 py-1 text-xs font-bold text-white">{duration}</span> : null}
        <span aria-hidden="true" className="absolute inset-0 grid place-items-center bg-black/0 opacity-0 transition-colors group-hover:bg-black/25 group-hover:opacity-100">
          <span className="grid size-12 place-items-center rounded-full bg-[#00cfe3] text-[#07363a] shadow-xl">
            <svg viewBox="0 0 24 24" className="ml-0.5 size-5 fill-current"><path d="M7 4.8c0-.8.9-1.3 1.6-.9l11 6.2a1 1 0 0 1 0 1.8l-11 6.2a1 1 0 0 1-1.6-.9V4.8Z" /></svg>
          </span>
        </span>
      </div>
      <h3 className="mt-3 truncate text-[15px] font-bold text-white transition-colors group-hover:text-cyan-300">{video.title}</h3>
      <p className="mt-1 truncate text-[13px] text-white/65">{artists || 'Video nhạc'}</p>
    </Link>
  );
}

export default function VideoSection() {
  const [videos, setVideos] = useState<SongVideo[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    listVideos({ perPage: 6 })
      .then((response) => {
        if (!cancelled) setVideos(response.data);
      })
      .catch(() => {
        if (!cancelled) setVideos([]);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });

    return () => { cancelled = true; };
  }, []);

  if (!loaded || videos.length === 0) return null;

  return (
    <section aria-labelledby="music-videos-heading" className="mt-14">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 id="music-videos-heading" className="text-[24px] font-bold leading-tight text-white sm:text-[28px]">Video Nhạc</h2>
        <Link href="/videos" className="shrink-0 text-[14px] font-medium text-[#bdbdbd] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00d3e5]">Thêm</Link>
      </div>
      <div className="grid grid-cols-1 gap-x-6 gap-y-7 sm:grid-cols-2 xl:grid-cols-3">
        {videos.slice(0, 3).map((video) => <VideoPreviewCard key={video.id} video={video} />)}
      </div>
    </section>
  );
}
