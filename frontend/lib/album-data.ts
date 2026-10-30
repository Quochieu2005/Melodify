import type { AlbumRecord } from '@/lib/api';
import { vietnamDateKey } from '@/lib/topic-data';

export type AlbumCard = {
  id: string;
  title: string;
  artist: string;
  artistId: string | null;
  artistSlug: string | null;
  coverUrl: string;
  slug: string | null;
};

function stableHash(value: string): number {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

export function albumRecordToCard(record: AlbumRecord): AlbumCard {
  return {
    id: record.id,
    title: record.title,
    artist: record.artist?.name || 'Nghệ sĩ chưa cập nhật',
    artistId: record.artist?.id ?? record.artist_id,
    artistSlug: record.artist?.slug ?? null,
    coverUrl: record.cover_url || '/images/cover-placeholder.svg',
    slug: record.slug,
  };
}

export function pickDailyAlbums(items: AlbumCard[], limit = 6, dateKey = vietnamDateKey()): AlbumCard[] {
  const unique = new Map<string, AlbumCard>();

  items.forEach((item) => {
    const uniqueKey = item.id;
    if (!unique.has(uniqueKey)) unique.set(uniqueKey, item);
  });

  return Array.from(unique.values())
    .sort((left, right) => stableHash(`${dateKey}:${left.id}`) - stableHash(`${dateKey}:${right.id}`))
    .slice(0, limit);
}
