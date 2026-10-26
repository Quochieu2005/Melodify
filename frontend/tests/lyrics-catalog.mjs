// Read-only API regression against the actual admin parser.
// node --experimental-strip-types tests/lyrics-catalog.mjs
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { getPlainLyrics, parseSyncedLyrics, activeLyricIndex } from '../lib/lyrics.ts';

const template = (await readFile(new URL('../../Backend/resources/views/Admin/songs/lyrics.blade.php', import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
const start = template.indexOf('const parseLyrics = ') + 'const parseLyrics = '.length;
const end = template.indexOf('\n\n    const render', start);
assert(start > 20 && end > start);
const parserCode = template.slice(start, end).trim().replace(/;$/, '');
const adminParse = vm.runInNewContext(`(${parserCode})`, { toSeconds: (m, s) => Number(m) * 60 + Number(s) });
const base = process.env.API_URL || 'http://127.0.0.1:8000/api/v1';
const get = async (path) => {
  const response = await fetch(base + path);
  assert(response.ok, `${path}: ${response.status}`);
  return response.json();
};
const chart = await get('/charts/top-50-bai-hat-thinh-hanh');
const songs = chart.data.songs ?? chart.data.entries?.map((entry) => entry.song);
assert(Array.isArray(songs));
const identifiers = [...new Set([...songs.map((song) => song.slug || song.id), 'xin-anh-dung-justatee-lk-emily', 'co-em-cho-min-mra'])];
let timed = 0, plainOnly = 0, empty = 0, cues = 0;
for (let offset = 0; offset < identifiers.length; offset += 4) {
  await Promise.all(identifiers.slice(offset, offset + 4).map(async (id) => {
    const { data } = await get(`/songs/${id}/lyrics`);
    const record = data.find((item) => adminParse(item.synced_lyrics || (item.is_synced ? item.content : '') || '').length);
    const expected = record ? JSON.parse(JSON.stringify(adminParse(record.synced_lyrics || record.content))) : [];
    const actual = parseSyncedLyrics(data);
    assert.deepEqual(actual.map(({ time, text }) => ({ at: time, text })), expected.map(({ at, text }) => ({ at, text })), id);
    const plain = data.find((item) => item.plain_lyrics?.trim());
    if (plain) assert.equal(getPlainLyrics(data), plain.plain_lyrics, `${id}: full plain text`);
    for (const row of actual) {
      const expectedIndex = expected.reduce((current, item, index) => item.at <= row.time ? index : current, -1);
      assert.equal(activeLyricIndex(actual, row.time), expectedIndex, `${id}: ${row.time}`);
    }
    if (actual.length) { timed++; cues += actual.length; }
    else if (getPlainLyrics(data)) plainOnly++;
    else empty++;
  }));
}
console.log(JSON.stringify({ songs: identifiers.length, timed, plainOnly, empty, cues, result: 'All saved text and timestamps match admin' }));
