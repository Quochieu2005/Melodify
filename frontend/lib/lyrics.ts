import type { Lyric } from './api';

export type SyncedLyricLine = { time: number; text: string };

/** Use real LRC timestamps; never infer timing from the length of plain lyrics. */
export function parseSyncedLyrics(lyrics: Lyric[]): SyncedLyricLine[] {
  const timestamp = /\[(\d{1,3}):([0-5]\d(?:[.:]\d{1,3})?)\]/g;
  return lyrics.flatMap((lyric) => {
    const source = lyric.synced_lyrics?.trim() || (lyric.is_synced ? lyric.content?.trim() : '');
    if (!source) return [];
    return source.split(/\r?\n/).flatMap((line) => {
      const matches = Array.from(line.matchAll(timestamp));
      const text = line.replace(timestamp, '').trim();
      if (!text) return [];
      return matches.map((match) => ({
        time: Number(match[1]) * 60 + Number(match[2].replace(':', '.')),
        text,
      }));
    });
  }).sort((left, right) => left.time - right.time);
}

export function activeLyricIndex(lines: SyncedLyricLine[], elapsed: number): number {
  let low = 0;
  let high = lines.length - 1;
  let active = -1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (lines[middle].time <= elapsed) {
      active = middle;
      low = middle + 1;
    } else high = middle - 1;
  }
  return active;
}

export function formatPlaybackTime(seconds: number): string {
  const total = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}
