import assert from 'node:assert/strict';
import test from 'node:test';
import { activeLyricIndex, formatPlaybackTime, getPlainLyrics, parseSyncedLyrics } from '../../lib/lyrics.ts';

const lyric = (fields) => ({ id: 'test', song_id: 'test', language: 'vi', content: '', is_synced: true, ...fields });

test('LRC preserves fractional seconds and sorts repeated timestamps', () => {
  assert.deepEqual(parseSyncedLyrics([lyric({ synced_lyrics: '[ar:Test]\n[00:20.315][00:04.5]Câu hát\r\n[00:03:25]Câu đầu' })]), [
    { time: 3.25, text: 'Câu đầu' }, { time: 4.5, text: 'Câu hát' }, { time: 20.315, text: 'Câu hát' },
  ]);
});

test('plain lyrics are never assigned invented timestamps', () => {
  assert.deepEqual(parseSyncedLyrics([lyric({ is_synced: false, content: 'Lời chưa đồng bộ' })]), []);
  assert.equal(getPlainLyrics([lyric({ is_synced: false, content: 'Lời chưa đồng bộ' })]), 'Lời chưa đồng bộ');
});

test('full plain text preserves paragraphs, metadata and repeated lines verbatim', () => {
  const plain = 'Bài hát: Tên bài\n\nCâu đầu\r\nCa sĩ: Nghệ sĩ\nCâu cuối\nCâu cuối\n';
  assert.equal(getPlainLyrics([lyric({ plain_lyrics: plain, content: 'Truncated' })]), plain);
});

test('plain text cannot truncate, replace or retime the saved LRC', () => {
  const records = [lyric({ plain_lyrics: 'Bản dịch khác', synced_lyrics: '[00:10.50]Verse\n[00:20.25]Chorus\n[00:40.75]Chorus\n[01:00]Outro' })];
  assert.deepEqual(parseSyncedLyrics(records), [
    { time: 10.5, text: 'Verse' }, { time: 20.25, text: 'Chorus' },
    { time: 40.75, text: 'Chorus' }, { time: 60, text: 'Outro' },
  ]);
});

test('long songs retain every cue, including the final chorus', () => {
  const cues = Array.from({ length: 250 }, (_, i) => `[${Math.floor(i / 60)}:${String(i % 60).padStart(2, '0')}.25]Điệp khúc ${i % 4}`);
  const lines = parseSyncedLyrics([lyric({ plain_lyrics: 'Điệp khúc', synced_lyrics: cues.join('\n') })]);
  assert.equal(lines.length, 250);
  assert.equal(lines.at(-1).time, 249.25);
});

test('different language records are not interleaved into one timeline', () => {
  const records = [lyric({ synced_lyrics: '[00:10]Bản gốc' }), lyric({ language: 'en', synced_lyrics: '[00:09]Translation' })];
  assert.deepEqual(parseSyncedLyrics(records), [{ time: 10, text: 'Bản gốc' }]);
});

test('legacy synced content is supported, invalid timestamps and empty lines are ignored', () => {
  assert.deepEqual(parseSyncedLyrics([lyric({ content: '[00:75]Sai\n[00:00.50]\n[01:02.025]Đúng' })]), [{ time: 62.025, text: 'Đúng' }]);
});

test('title and artist cues remain identical to the admin preview', () => {
  const lines = parseSyncedLyrics([lyric({
    synced_lyrics: '[00:00.06]Bài hát: Tên bài\n[00:02.66]Ca sĩ: Nghệ sĩ\n[00:28.76]Câu hát đầu tiên',
  })]);
  assert.deepEqual(lines.map((line) => line.time), [0.06, 2.66, 28.76]);
  assert.equal(activeLyricIndex(lines, 0), -1);
  assert.equal(activeLyricIndex(lines, 28.75), 1);
  assert.equal(activeLyricIndex(lines, 28.76), 2);
});

test('enhanced LRC keeps all words and their real timestamps', () => {
  const [line] = parseSyncedLyrics([lyric({ synced_lyrics: '[00:12.50]<00:12.50>Xin <00:13.25>chào <00:14.00>em<00:15.00>' })]);
  assert.equal(line.text, 'Xin chào em');
  assert.deepEqual(line.words, [{ time: 12.5, text: 'Xin ' }, { time: 13.25, text: 'chào ' }, { time: 14, text: 'em' }]);
});

test('enhanced LRC repeated cues retain both occurrences and untagged text', () => {
  const lines = parseSyncedLyrics([lyric({ synced_lyrics: '[00:10][00:30]Oh <00:11>hello <00:12>again' })]);
  assert.equal(lines[1].text, 'Oh hello again');
  assert.deepEqual(lines[1].words.map((word) => word.time), [30, 31, 32]);
});

test('active line follows exact timestamps, including backwards seek and intro', () => {
  const lines = [{ time: 2.31, text: 'A' }, { time: 3.89, text: 'B' }];
  assert.equal(activeLyricIndex(lines, 0), -1);
  assert.equal(activeLyricIndex(lines, 2.31), 0);
  assert.equal(activeLyricIndex(lines, 3.88), 0);
  assert.equal(activeLyricIndex(lines, 3.89), 1);
  assert.equal(activeLyricIndex(lines, 2.5), 0);
  assert.equal(activeLyricIndex([], 50), -1);
});

test('time labels stay mm:ss when seeking fractional timestamps', () => {
  assert.equal(formatPlaybackTime(63.89), '01:03');
  assert.equal(formatPlaybackTime(-1), '00:00');
  assert.equal(formatPlaybackTime(NaN), '00:00');
});

test('newly imported LRC works even before its synced flag is updated', () => {
  const record = lyric({ id: 'new-upload', song_id: 'new-song', is_synced: false, content: '[00:00.20]Bài hát: Mới\n[00:02.75]Ca sĩ: Mới\n[00:16.125]Câu mới' });
  assert.deepEqual(parseSyncedLyrics([record]), [
    { time: .2, text: 'Bài hát: Mới' }, { time: 2.75, text: 'Ca sĩ: Mới' }, { time: 16.125, text: 'Câu mới' },
  ]);
});

test('adding and switching hundreds of unrelated songs never reuses or truncates lyrics', () => {
  const catalog = Array.from({ length: 500 }, (_, song) => {
    const count = 5 + song % 90;
    const rows = Array.from({ length: count }, (_, line) => ({
      time: line * 3 + .125,
      text: line === 0 ? `Bài hát: Bài mới ${song}` : line === 1 ? `Ca sĩ: Nghệ sĩ ${song}` : `Bài ${song}, câu ${line % 7}`,
    }));
    const source = rows.map(({ time, text }) => `[${Math.floor(time / 60)}:${(time % 60).toFixed(3).padStart(6, '0')}]${text}`).join('\n');
    const plain = rows.map(({ text }) => text).join('\n\n');
    return { rows, plain, record: lyric({ id: `lyric-${song}`, song_id: `upload-${song}`, is_synced: song % 2 === 0, plain_lyrics: plain, ...(song % 3 ? { synced_lyrics: source } : { content: source }) }) };
  });
  // Forward, backward, and back to the first song exercise independent results.
  for (const entry of [...catalog, ...catalog.toReversed(), catalog[0]]) {
    const lines = parseSyncedLyrics([entry.record]);
    assert.deepEqual(lines, entry.rows);
    assert.equal(getPlainLyrics([entry.record]), entry.plain);
    assert.equal(activeLyricIndex(lines, 0), -1);
    for (let index = 0; index < lines.length; index++) {
      assert.equal(activeLyricIndex(lines, lines[index].time), index);
    }
  }
  assert.deepEqual(parseSyncedLyrics([]), []);
});
