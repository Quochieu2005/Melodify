import type { Lyric } from './api';

export type SyncedLyricWord = { time: number; text: string };
export type SyncedLyricLine = { time: number; text: string; words?: SyncedLyricWord[] };

const lineTimestamp = /\[(\d+):([0-5]?\d(?:[.:]\d+)?)\]/g;
const wordTimestamp = /<(\d+):([0-5]?\d(?:[.:]\d+)?)>/g;
const seconds = (minutes: string, value: string) => Number(minutes) * 60 + Number(value.replace(':', '.'));

/** Use real LRC timestamps; never infer timing from the length of plain lyrics. */
export function parseSyncedLyrics(lyrics: Lyric[]): SyncedLyricLine[] {
  // Each record is a separate language/version, not another verse to interleave.
  // Like the admin preview, render every stored LRC cue, including repeated
  // choruses and title/artist cues. Never match/re-time it against plain lyrics.
  for (const lyric of lyrics) {
    // Imported/new records can contain valid LRC before is_synced is updated.
    // The timestamps in the saved content, not that flag or a song allowlist,
    // determine whether the record can be synchronized.
    const source = lyric.synced_lyrics?.trim() || lyric.content?.trim();
    if (!source) continue;
    const lines = source.split(/\r?\n/).flatMap((line): SyncedLyricLine[] => {
      const matches = Array.from(line.matchAll(lineTimestamp));
      const body = line.replace(lineTimestamp, '').trim();
      const text = body.replace(wordTimestamp, '').trim();
      if (!text) return [];
      const wordMatches = Array.from(body.matchAll(wordTimestamp));
      return matches.map((match) => {
        const time = seconds(match[1], match[2]);
        const shift = time - seconds(matches[0][1], matches[0][2]);
        const words = wordMatches.map((word, index) => ({
          time: seconds(word[1], word[2]) + shift,
          text: body.slice(word.index! + word[0].length, wordMatches[index + 1]?.index ?? body.length),
        })).filter((word) => word.text);
        // Preserve any text before the first enhanced-LRC word marker as well.
        if (wordMatches[0]?.index) words.unshift({ time, text: body.slice(0, wordMatches[0].index) });
        return { time, text, ...(words.length ? { words } : {}) };
      });
    }).sort((left, right) => left.time - right.time);
    if (lines.length) return lines;
  }
  return [];
}

/** Full reading text from the database, without slicing, deduping or rephrasing. */
export function getPlainLyrics(lyrics: Lyric[]): string {
  for (const lyric of lyrics) {
    if (lyric.plain_lyrics?.trim()) return lyric.plain_lyrics;
    if (lyric.content?.trim() && !Array.from(lyric.content.matchAll(lineTimestamp)).length) return lyric.content;
  }
  return parseSyncedLyrics(lyrics).map((line) => line.text).join('\n');
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
