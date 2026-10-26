import type { SyncedLyricLine } from '@/lib/lyrics';

/** Keep word timestamps and text exactly as supplied by the saved LRC. */
export function LyricText({ line, elapsed, active }: { line: SyncedLyricLine; elapsed: number; active: boolean }) {
  if (!line.words?.length) return <>{line.text}</>;
  return <>{line.words.map((word, index) => <span
    key={index}
    data-word-time={word.time}
    data-spoken={active && elapsed >= word.time ? 'true' : undefined}
    className={active && elapsed < word.time ? 'opacity-50' : undefined}
  >{word.text}</span>)}</>;
}
