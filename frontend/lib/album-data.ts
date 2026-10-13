import type { AlbumRecord } from '@/lib/api';
import { vietnamDateKey } from '@/lib/topic-data';

export type AlbumCard = {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  slug: string | null;
};

const fallbackCovers = [
  '/topics/genre/vpop_600.png',
  '/topics/genre/kpop_600.png',
  '/topics/genre/vrap_600.png',
  '/topics/mood/mood_2_600.png',
  '/topics/scene/scene_11_600.png',
  '/topics/genre/CPop_600.png',
];

function stableHash(value: string): number {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

export function albumRecordToCard(record: AlbumRecord, index: number): AlbumCard {
  return {
    id: record.id,
    title: record.title,
    artist: record.artist?.name || 'Nghệ sĩ chưa cập nhật',
    coverUrl: record.cover_url || fallbackCovers[index % fallbackCovers.length],
    slug: record.slug,
  };
}

export function pickDailyAlbums(items: AlbumCard[], limit = 6, dateKey = vietnamDateKey()): AlbumCard[] {
  const unique = new Map<string, AlbumCard>();

  items.forEach((item) => {
    const uniqueKey = item.coverUrl || item.id;
    if (!unique.has(uniqueKey)) unique.set(uniqueKey, item);
  });

  return Array.from(unique.values())
    .sort((left, right) => stableHash(`${dateKey}:${left.id}`) - stableHash(`${dateKey}:${right.id}`))
    .slice(0, limit);
}
