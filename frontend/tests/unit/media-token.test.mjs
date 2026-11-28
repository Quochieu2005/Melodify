import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Run the real lib/mediaToken.ts against a fake browser and a fake API.
function fixture({ login = 'login-token', ttl = 3600 } = {}) {
  const values = new Map(login ? [['melodify_access_token', login]] : []);
  const calls = [];
  let now = 1_700_000_000_000;
  let issued = 0;
  const sandbox = {
    exports: {},
    process: { env: { NEXT_PUBLIC_API_URL: 'https://api.example.test/api' } },
    require: (id) => {
      assert.equal(id, '@/lib/api', `Unexpected dependency: ${id}`);
      return { AUTH_TOKEN_STORAGE_KEY: 'melodify_access_token' };
    },
    window: {
      localStorage: { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) },
      location: { origin: 'https://web.example.test' },
    },
    Date: class extends Date { static now() { return now; } },
    URL, Promise,
    fetch: async (url, init) => {
      calls.push({ url, init });
      issued += 1;

      return { ok: true, status: 200, json: async () => ({ token: `ticket-${issued}`, ttl_seconds: ttl }) };
    },
  };
  const file = '../../lib/mediaToken.ts';
  const code = ts.transpileModule(fs.readFileSync(new URL(file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, sandbox, { filename: file });

  return { m: sandbox.exports, calls, values, advance: (ms) => { now += ms; }, sandbox };
}

test('there is no ticket until one is fetched, and fetching sends only the login token in a header', async () => {
  const f = fixture();
  assert.equal(f.m.cachedMediaToken(), null);
  assert.equal(f.m.attachMediaToken('https://api.example.test/api/v1/songs/a/audio'), null);

  assert.equal(await f.m.fetchMediaToken(), 'ticket-1');

  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].url, 'https://api.example.test/api/v1/auth/media-token');
  assert.equal(f.calls[0].init.method, 'POST');
  assert.equal(f.calls[0].init.headers.Authorization, 'Bearer login-token');
  assert.equal(f.m.cachedMediaToken(), 'ticket-1');
});

test('a cached ticket is reused, a forced fetch replaces it, and concurrent fetches share one request', async () => {
  const f = fixture();
  const [a, b] = await Promise.all([f.m.fetchMediaToken(), f.m.fetchMediaToken()]);
  assert.equal(a, b);
  assert.equal(f.calls.length, 1);

  await f.m.fetchMediaToken();
  assert.equal(f.calls.length, 1, 'served from the cache');

  assert.equal(await f.m.fetchMediaToken(true), 'ticket-2');
  assert.equal(f.calls.length, 2);
});

test('the ticket is dropped two minutes before the server would expire it', async () => {
  const f = fixture({ ttl: 600 });
  await f.m.fetchMediaToken();

  f.advance(7 * 60 * 1000);
  assert.equal(f.m.cachedMediaToken(), 'ticket-1');
  f.advance(2 * 60 * 1000);
  assert.equal(f.m.cachedMediaToken(), null);
});

test('a ticket never outlives the login it was issued for', async () => {
  const f = fixture();
  await f.m.fetchMediaToken();

  f.values.set('melodify_access_token', 'another-login');
  assert.equal(f.m.cachedMediaToken(), null);

  f.values.delete('melodify_access_token');
  assert.equal(f.m.cachedMediaToken(), null);
  const callsBefore = f.calls.length;
  assert.equal(await f.m.fetchMediaToken(), null, 'logged out: nothing to ask for');
  assert.equal(f.calls.length, callsBefore);
});

test('attaching puts the ticket in the URL and removes the old login token', async () => {
  const f = fixture();
  await f.m.fetchMediaToken();

  assert.equal(
    f.m.attachMediaToken('https://api.example.test/api/v1/songs/a/audio?quality_id=lossless&access_token=OLD'),
    'https://api.example.test/api/v1/songs/a/audio?quality_id=lossless&media_token=ticket-1',
  );
  assert.equal(f.m.attachMediaToken('/api/v1/songs/a/audio'), '/api/v1/songs/a/audio?media_token=ticket-1', 'relative stays relative');
});

test('refreshing swaps the ticket in URLs that carry a token and leaves other URLs alone', async () => {
  const f = fixture();
  const stale = 'https://api.example.test/api/v1/songs/a/audio?media_token=ticket-old';
  const legacy = 'https://api.example.test/api/v1/songs/a/audio?access_token=OLD-LOGIN';
  const plain = 'https://api.example.test/api/v1/songs/a/audio';

  assert.equal(f.m.refreshMediaToken(stale), stale, 'no ticket yet: unchanged');
  await f.m.fetchMediaToken();

  assert.equal(f.m.refreshMediaToken(stale), 'https://api.example.test/api/v1/songs/a/audio?media_token=ticket-1');
  assert.equal(f.m.refreshMediaToken(legacy), 'https://api.example.test/api/v1/songs/a/audio?media_token=ticket-1', 'drops the login token');
  assert.equal(f.m.refreshMediaToken(plain), plain);
});

test('a failed request resolves to null so the caller can fall back', async () => {
  const f = fixture();
  f.sandbox.fetch = async () => { throw new Error('offline'); };

  assert.equal(await f.m.fetchMediaToken(), null);
  assert.equal(f.m.cachedMediaToken(), null);
});
