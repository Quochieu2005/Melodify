export type ParsedLyricLine = {
  id: string;
  time: number; // in seconds
  text: string;
};

/**
 * Parses an LRC format string into an array of chronologically sorted lyric lines.
 * Supports: [mm:ss.xx], [mm:ss.xxx], [mm:ss]
 */
export function parseLrcLyrics(lrcString: string | null | undefined): ParsedLyricLine[] {
  if (!lrcString || typeof lrcString !== 'string') return [];

  const lines = lrcString.split(/\r?\n/);
  const result: ParsedLyricLine[] = [];
  const timeRegex = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].trim();
    if (!raw) continue;

    const timestamps: number[] = [];
    let match: RegExpExecArray | null;
    timeRegex.lastIndex = 0;

    while ((match = timeRegex.exec(raw)) !== null) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      let millis = 0;
      if (match[3]) {
        // Normalize 2-digit to ms (e.g. 56 -> 560ms) or 3-digit
        millis = match[3].length === 2 ? parseInt(match[3], 10) * 10 : parseInt(match[3], 10);
      }
      timestamps.push(minutes * 60 + seconds + millis / 1000);
    }

    const text = raw.replace(timeRegex, '').trim();
    // Only keep lines with non-empty text
    if (text) {
      for (const time of timestamps) {
        result.push({
          id: `line-${i}-${time.toFixed(2)}`,
          time,
          text,
        });
      }
    }
  }

  return result.sort((a, b) => a.time - b.time);
}

/**
 * Finds the index of the currently active lyric line for the given playback time.
 */
export function findActiveLyricIndex(
  lyrics: ParsedLyricLine[],
  currentTime: number
): number {
  if (!lyrics.length) return -1;
  if (currentTime < lyrics[0].time) return -1;

  for (let i = 0; i < lyrics.length; i++) {
    const nextLine = lyrics[i + 1];
    if (!nextLine || currentTime < nextLine.time) {
      return i;
    }
  }

  return lyrics.length - 1;
}

/**
 * Format seconds to mm:ss
 */
export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

