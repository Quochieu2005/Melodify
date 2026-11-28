import { deleteRecentHistory, getRecentHistory, recordRecentVisit, type AlbumRecord, type Playlist, type RecentHistoryCard, type Song, type SongArtistCredit, type SongVideo } from './api';

export type RecentCategory = 'song' | 'playlist' | 'album' | 'artist' | 'video';

export type RecentItem = {
  id: string;
  category: RecentCategory;
  title: string;
  subtitle: string;
  imageUrl: string;
  href: string;
  publisher?: string;
  durationSeconds?: number | null;
  artists?: SongArtistCredit[];
  updatedAt: number;
};

const STORAGE_KEY = 'melodify_recent_history';
const MAX_ITEMS = 100;
const HISTORY_EVENT = 'melodify-recent-history-changed';
const fallbackCover = '/images/cover-placeholder.svg';

function canUseStorage() {
  return typeof window !== 'undefined';
}

function itemKey(item: Pick<RecentItem, 'id' | 'category'>) {
  return `${item.category}:${item.id}`;
}

export function readRecentItems(): RecentItem[] {
  if (!canUseStorage()) return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]') as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is RecentItem => Boolean(
      item && typeof item === 'object'
      && typeof (item as RecentItem).id === 'string'
      && typeof (item as RecentItem).category === 'string'
      && typeof (item as RecentItem).title === 'string'
      && typeof (item as RecentItem).href === 'string',
    ));
  } catch {
    return [];
  }
}

// The server keeps the history of an account or visitor; this device keeps a copy so the page opens at once and
// items the server cannot hold (songs from outside the catalog) are not lost. Server ids are MongoDB ids.
const SERVER_ID = /^[a-f0-9]{24}$/i;
const lastReported = new Map<string, number>();
const REPORT_EVERY_MS = 30_000;

function reportToServer(category: RecentCategory, id: string) {
  if (!SERVER_ID.test(id)) return;
  const key = `${category}:${id}`;
  const now = Date.now();
  if (now - (lastReported.get(key) ?? 0) < REPORT_EVERY_MS) return;
  lastReported.set(key, now);
  void recordRecentVisit(category, id).catch(() => lastReported.delete(key));
}

function writeItems(items: RecentItem[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
  window.dispatchEvent(new Event(HISTORY_EVENT));
}

export function recordRecentItem(item: Omit<RecentItem, 'updatedAt'>) {
  if (!canUseStorage() || !item.id || !item.title || !item.href) return;

  const nextItem: RecentItem = { ...item, updatedAt: Date.now() };
  writeItems([nextItem, ...readRecentItems().filter((entry) => itemKey(entry) !== itemKey(nextItem))]);
  reportToServer(item.category, item.id);
}

function hrefFor(card: RecentHistoryCard) {
  const target = card.slug?.trim() || card.id;
  if (card.category === 'song') return songPath({ id: card.id, slug: card.slug, title: card.title });
  return `/${card.category}/${encodeURIComponent(target)}`;
}

function itemFromServer(card: RecentHistoryCard): RecentItem {
  return {
    id: card.id,
    category: card.category,
    title: card.title,
    subtitle: card.subtitle,
    imageUrl: card.image_url || fallbackCover,
    href: hrefFor(card),
    publisher: card.publisher,
    durationSeconds: card.duration_seconds ?? null,
    updatedAt: card.played_at ? Date.parse(card.played_at) || 0 : 0,
  };
}

/**
 * Replaces the local copy with the server's history (the account's, or this visitor's), keeping the items the server
 * cannot hold. Called when the history page opens and after signing in or out.
 */
export async function syncRecentFromServer() {
  if (!canUseStorage()) return;

  const { data } = await getRecentHistory();
  const fromServer = data.map(itemFromServer);
  const localOnly = readRecentItems().filter((item) => !SERVER_ID.test(item.id));
  const merged = [...fromServer, ...localOnly].sort((left, right) => right.updatedAt - left.updatedAt);
  writeItems(merged);
}

export function removeRecentSongs(songIds: string[]) {
  return removeRecentItems('song', songIds);
}

/** Removes the given items of one category (songs, playlists, albums, artists or videos) from the history. */
export function removeRecentItems(category: RecentCategory, ids: string[]) {
  if (!canUseStorage() || ids.length === 0) return 0;

  const idsToRemove = new Set(ids);
  const currentItems = readRecentItems();
  const nextItems = currentItems.filter((item) => item.category !== category || !idsToRemove.has(item.id));
  const removedCount = currentItems.length - nextItems.length;
  const serverIds = ids.filter((id) => SERVER_ID.test(id));
  if (serverIds.length > 0) void deleteRecentHistory(category, serverIds).catch(() => undefined);
  if (removedCount === 0) return 0;

  writeItems(nextItems);
  return removedCount;
}

export function subscribeRecentHistory(listener: () => void) {
  if (!canUseStorage()) return () => undefined;
  window.addEventListener(HISTORY_EVENT, listener);
  window.addEventListener('storage', listener);
  return () => {
    window.removeEventListener(HISTORY_EVENT, listener);
    window.removeEventListener('storage', listener);
  };
}

export function recentItemsByCategory(category: RecentCategory) {
  return readRecentItems().filter((item) => item.category === category);
}

function entityPath(prefix: string, slug: string | null | undefined, id: string) {
  return `/${prefix}/${encodeURIComponent(slug || id)}`;
}

export function slugifySongTitle(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function songPath(song: Pick<Song, 'id' | 'slug' | 'title'>) {
  const target = song.slug?.trim() || slugifySongTitle(song.title) || song.id;
  return `/song/${encodeURIComponent(target)}`;
}

function songArtists(song: Song): SongArtistCredit[] {
  return song.artists?.length ? song.artists : song.artist ? [song.artist] : [];
}

export function recentSongItem(song: Song): Omit<RecentItem, 'updatedAt'> {
  const artists = songArtists(song);
  return {
    id: song.id,
    category: 'song',
    title: song.title,
    subtitle: artists.map((artist) => artist.name).join(', ') || 'Nghệ sĩ chưa cập nhật',
    imageUrl: song.cover_url || fallbackCover,
    href: songPath(song),
    publisher: song.publisher || 'Melodify',
    durationSeconds: song.duration_seconds,
    artists,
  };
}

export function recentPlaylistItem(playlist: Playlist): Omit<RecentItem, 'updatedAt'> {
  return {
    id: playlist.id,
    category: 'playlist',
    title: playlist.name,
    subtitle: `${playlist.song_count} bài hát`,
    imageUrl: playlist.cover_url || fallbackCover,
    href: entityPath('playlist', playlist.slug, playlist.id),
  };
}

export function recentAlbumItem(album: AlbumRecord): Omit<RecentItem, 'updatedAt'> {
  return {
    id: album.id,
    category: 'album',
    title: album.title,
    subtitle: album.artist?.name || 'Album',
    imageUrl: album.cover_url || fallbackCover,
    href: entityPath('album', album.slug, album.id),
  };
}

export function recentArtistItem(artist: { id?: string | null; name: string; slug?: string | null; avatar_url?: string | null }): Omit<RecentItem, 'updatedAt'> {
  return {
    id: artist.id || artist.slug || artist.name,
    category: 'artist',
    title: artist.name,
    subtitle: 'Nghệ sĩ',
    imageUrl: artist.avatar_url || fallbackCover,
    href: entityPath('artist', artist.slug, artist.id || artist.name),
  };
}

export function recentVideoItem(video: SongVideo): Omit<RecentItem, 'updatedAt'> {
  return {
    id: video.id,
    category: 'video',
    title: video.title,
    subtitle: video.artists?.map((artist) => artist.name).join(', ') || 'Video',
    imageUrl: video.thumbnail_url || fallbackCover,
    // The history opens the video page on Melodify, not the external player address.
    href: entityPath('video', video.slug, video.id),
    durationSeconds: video.duration_seconds,
  };
}
