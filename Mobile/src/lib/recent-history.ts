import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Song } from './api';

const RECENT_SONGS_KEY = 'melodify_mobile_recent_songs';
const MAX_RECENT_SONGS = 40;

export type RecentSong = Pick<
  Song,
  | 'id'
  | 'title'
  | 'slug'
  | 'duration_seconds'
  | 'artist'
  | 'artists'
  | 'publisher'
  | 'preview_url'
  | 'cover_url'
  | 'audio_url'
  | 'stream_url'
  | 'source_url'
  | 'is_favorite'
>;

export async function getRecentSongs(): Promise<RecentSong[]> {
  const stored = await AsyncStorage.getItem(RECENT_SONGS_KEY);
  if (!stored) {
    return [];
  }
  try {
    const parsed = JSON.parse(stored) as RecentSong[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT_SONGS) : [];
  } catch {
    return [];
  }
}

export async function recordRecentSong(song: Song): Promise<void> {
  const current = await getRecentSongs();
  const compactSong: RecentSong = {
    id: song.id,
    title: song.title,
    slug: song.slug,
    duration_seconds: song.duration_seconds,
    artist: song.artist,
    artists: song.artists,
    publisher: song.publisher,
    preview_url: song.preview_url,
    cover_url: song.cover_url,
    audio_url: song.audio_url,
    stream_url: song.stream_url,
    source_url: song.source_url,
    is_favorite: song.is_favorite,
  };
  const next = [compactSong, ...current.filter((item) => item.id !== song.id)].slice(0, MAX_RECENT_SONGS);
  await AsyncStorage.setItem(RECENT_SONGS_KEY, JSON.stringify(next));
}

export async function clearRecentSongs(): Promise<void> {
  await AsyncStorage.removeItem(RECENT_SONGS_KEY);
}
