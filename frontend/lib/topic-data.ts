import type { GenreRecord, TopicRecord } from '@/lib/api';

export type TopicKind = 'genre' | 'scene' | 'mood' | 'topic';

export type TopicCard = {
  id: string;
  title: string;
  image: string | null;
  slug: string | null;
  kind: TopicKind;
};

const fallbackImages = [
  '/topics/genre/vpop_600.png',
  '/topics/genre/vrap_600.png',
  '/topics/genre/kpop_600.png',
  '/topics/genre/genre_25_600.png',
  '/topics/mood/mood_1_600.png',
  '/topics/scene/scene_11_600.png',
  '/topics/scene/scene_30_600.png',
  '/topics/genre/genre_23_600.png',
];

export const fallbackHomeTopics: TopicCard[] = [
  ['Nhạc Hàn', 'genre', '/topics/genre/kpop_600.png'],
  ['Remix', 'genre', '/topics/genre/genre_39_600.png'],
  ['Thư Giãn', 'mood', '/topics/mood/mood_2_600.png'],
  ['Nhạc Trẻ', 'genre', '/topics/genre/vpop_600.png'],
  ['Pop', 'genre', '/topics/genre/genre_101_600.png'],
  ['Nhạc Hoa', 'genre', '/topics/genre/CPop_600.png'],
  ['Rap Việt', 'genre', '/topics/genre/vrap_600.png'],
  ['Bolero', 'genre', '/topics/genre/genre_23_600.png'],
  ['Chill Out', 'mood', '/topics/mood/mood_108_600.png'],
  ['Buồn', 'mood', '/topics/mood/mood_3_600.png'],
].map(([title, kind, image], index) => ({
  id: `fallback-${index}`,
  title,
  image,
  slug: null,
  kind: kind as TopicKind,
}));

function normalizeKind(value: string | null | undefined): TopicKind {
  const normalized = (value ?? '').trim().toLowerCase();

  if (normalized.includes('genre') || normalized.includes('the-loai') || normalized.includes('thể loại')) return 'genre';
  if (normalized.includes('scene') || normalized.includes('chu-de') || normalized.includes('chủ đề')) return 'scene';
  if (normalized.includes('mood') || normalized.includes('tam-trang') || normalized.includes('tâm trạng')) return 'mood';

  return 'topic';
}

export function topicRecordToCard(record: TopicRecord, index: number): TopicCard {
  return {
    id: record.id,
    title: record.name,
    image: record.image_url || fallbackImages[index % fallbackImages.length],
    slug: record.slug,
    kind: normalizeKind(record.type || record.type_custom),
  };
}

export function genreRecordToCard(record: GenreRecord, index: number): TopicCard {
  return {
    id: record.id,
    title: record.name,
    image: record.image_url || fallbackImages[index % fallbackImages.length],
    slug: record.slug,
    kind: 'genre',
  };
}

export function vietnamDateKey(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function stableHash(value: string): number {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

export function pickDailyTopics(items: TopicCard[], limit = 6, dateKey = vietnamDateKey()): TopicCard[] {
  const unique = new Map<string, TopicCard>();

  items.forEach((item) => {
    const key = `${item.kind}:${item.id}`;
    if (!unique.has(key)) unique.set(key, item);
  });

  return Array.from(unique.values())
    .sort((left, right) => stableHash(`${dateKey}:${left.kind}:${left.id}`) - stableHash(`${dateKey}:${right.kind}:${right.id}`))
    .slice(0, limit);
}
