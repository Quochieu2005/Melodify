import Image from 'next/image';
import Link from 'next/link';

import type { SongVideo } from '@/lib/api';

const fallbackCover = '/images/cover-placeholder.svg';

export function videoDuration(seconds?: number | null) {
  if (seconds === null || seconds === undefined || seconds <= 0) return null;
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export default function VideoCard({ video }: { video: SongVideo }) {
  const href = `/video/${encodeURIComponent(video.slug || video.id)}`;
  const artistNames = video.artists?.map((artist) => artist.name).filter(Boolean).join(', ');
  const duration = videoDuration(video.duration_seconds);

  return (
    <article className="min-w-0">
      <Link href={href} aria-label={`Xem video ${video.title}`} className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
        <div className="relative aspect-video overflow-hidden rounded-xl bg-[#18211f]">
          <Image src={video.thumbnail_url || fallbackCover} alt="" fill unoptimized sizes="(max-width: 640px) 100vw, (max-width: 1100px) 50vw, (max-width: 1535px) 33vw, 25vw" className="object-cover transition-transform duration-300 group-hover:scale-[1.035]" />
          <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
          {duration ? <span className="absolute bottom-2 right-2 rounded bg-black/85 px-2 py-1 text-xs font-bold text-white">{duration}</span> : null}
          <span aria-hidden="true" className="absolute inset-0 grid place-items-center bg-black/0 opacity-0 transition-colors group-hover:bg-black/25 group-hover:opacity-100">
            <span className="grid size-12 place-items-center rounded-full bg-[#00cfe3] text-[#07363a] shadow-xl"><svg viewBox="0 0 24 24" className="ml-0.5 size-5 fill-current"><path d="M7 4.8c0-.8.9-1.3 1.6-.9l11 6.2a1 1 0 0 1 0 1.8l-11 6.2a1 1 0 0 1-1.6-.9V4.8Z" /></svg></span>
          </span>
        </div>
        <h2 className="mt-3 truncate text-[16px] font-bold text-white transition-colors group-hover:text-cyan-300">{video.title}</h2>
      </Link>
      <p className="mt-1 truncate text-[14px] text-white/65">{artistNames || 'Video nhạc'}</p>
      <p className="mt-1 text-xs text-white/45">{new Intl.NumberFormat('vi-VN').format(video.view_count ?? 0)} lượt xem</p>
    </article>
  );
}
