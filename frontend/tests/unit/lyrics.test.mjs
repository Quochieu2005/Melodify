import assert from 'node:assert/strict';
import test from 'node:test';
import { activeLyricIndex, formatPlaybackTime, parseSyncedLyrics } from '../../lib/lyrics.ts';

const lyric = (fields) => ({ id: 'test', song_id: 'test', language: 'vi', content: '', is_synced: true, ...fields });

test('LRC preserves fractional seconds and sorts repeated timestamps', () => {
  assert.deepEqual(parseSyncedLyrics([lyric({ synced_lyrics: '[ar:Test]\n[00:20.315][00:04.5]Câu hát\r\n[00:03:25]Câu đầu' })]), [
    { time: 3.25, text: 'Câu đầu' }, { time: 4.5, text: 'Câu hát' }, { time: 20.315, text: 'Câu hát' },
  ]);
});

test('plain lyrics are never assigned invented timestamps', () => {
  assert.deepEqual(parseSyncedLyrics([lyric({ is_synced: false, content: 'Lời chưa đồng bộ' })]), []);
});

test('legacy synced content is supported, invalid timestamps and empty lines are ignored', () => {
  assert.deepEqual(parseSyncedLyrics([lyric({ content: '[00:75]Sai\n[00:00.50]\n[01:02.025]Đúng' })]), [{ time: 62.025, text: 'Đúng' }]);
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
