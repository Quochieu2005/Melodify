import type { GenreRecord, TopicRecord } from '@/lib/api';

export type TopicKind = 'genre' | 'scene' | 'mood' | 'topic';

export type TopicCard = {
  id: string;
  title: string;
  image: string | null;
  slug: string | null;
  kind: TopicKind;
};

export function topicSlug(topic: Pick<TopicCard, 'id' | 'slug' | 'title'>): string {
  if (topic.slug?.trim()) return topic.slug.trim();
  if (topic.id) return topic.id;

  return topic.title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function topicHref(topic: Pick<TopicCard, 'id' | 'slug' | 'title' | 'kind'>): string {
  const filter = topic.kind === 'genre' ? 'genre' : 'topic';
  return `/playlist?${filter}=${encodeURIComponent(topicSlug(topic))}&kind=${filter}`;
}

function normalizeKind(value: string | null | undefined): TopicKind {
  const normalized = (value ?? '').trim().toLowerCase();

  if (normalized.includes('genre') || normalized.includes('the-loai') || normalized.includes('thể loại')) return 'genre';
  if (normalized.includes('scene') || normalized.includes('chu-de') || normalized.includes('chủ đề')) return 'scene';
  if (normalized.includes('mood') || normalized.includes('tam-trang') || normalized.includes('tâm trạng')) return 'mood';

  return 'topic';
}

export function topicRecordToCard(record: TopicRecord): TopicCard {
  return {
    id: record.id,
    title: record.name,
    image: record.image_url || null,
    slug: record.slug,
    kind: normalizeKind(record.type || record.type_custom),
  };
}

export function genreRecordToCard(record: GenreRecord): TopicCard {
  return {
    id: record.id,
    title: record.name,
    image: record.image_url || null,
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
