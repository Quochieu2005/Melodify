import Link from 'next/link';
import type { ReactNode } from 'react';

export type ArtistReference = {
  id?: string | null;
  name: string;
  slug?: string | null;
};

export function artistPath(artist: ArtistReference) {
  const identifier = artist.slug || artist.id;
  return identifier ? `/artist/${encodeURIComponent(identifier)}` : null;
}

export function ArtistLink({ artist, children, className = '' }: { artist: ArtistReference; children: ReactNode; className?: string }) {
  const href = artistPath(artist);
  const linkClassName = `outline-none transition-colors hover:text-[#00d3e5] focus-visible:text-[#00d3e5] focus-visible:ring-2 focus-visible:ring-[#00d3e5] ${className}`.trim();

  if (!href) return <span className={className}>{children}</span>;

  return <Link href={href} aria-label={`Xem nghệ sĩ ${artist.name}`} className={linkClassName}>{children}</Link>;
}

export function ArtistNames({ artists, fallback = 'Nghệ sĩ chưa cập nhật', className = '' }: { artists: ArtistReference[]; fallback?: string; className?: string }) {
  const visibleArtists = artists.filter((artist) => artist.name.trim());

  if (visibleArtists.length === 0) return <span className={className}>{fallback}</span>;

  return (
    <span className={className}>
      {visibleArtists.map((artist, index) => (
        <span key={`${artist.id || artist.slug || artist.name}-${index}`}>
          {index > 0 ? ', ' : null}
          <ArtistLink artist={artist}>{artist.name}</ArtistLink>
        </span>
      ))}
    </span>
  );
}
