import type { AlbumRecord, Playlist, Song, SongArtistCredit, SongVideo } from './api';

export type RecentCategory = 'song' | 'playlist' | 'album' | 'artist' | 'radio' | 'video';

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
const fallbackCover = '/topics/genre/vpop_600.png';

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

export function recordRecentItem(item: Omit<RecentItem, 'updatedAt'>) {
  if (!canUseStorage() || !item.id || !item.title || !item.href) return;

  const nextItem: RecentItem = { ...item, updatedAt: Date.now() };
  const nextItems = [nextItem, ...readRecentItems().filter((entry) => itemKey(entry) !== itemKey(nextItem))].slice(0, MAX_ITEMS);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextItems));
  window.dispatchEvent(new Event(HISTORY_EVENT));
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
    href: video.watch_url || video.video_url || entityPath('video', video.slug, video.id),
    durationSeconds: video.duration_seconds,
  };
}
