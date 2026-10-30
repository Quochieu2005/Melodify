import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise the real API wrappers without an Expo runtime or live user accounts.
function fixture(platform, env = {}, development = false) {
  const values = new Map();
  const calls = [];
  let now = Date.now();
  let respond = async () => ({ ok: true, status: 200, json: async () => ({ data: calls.length }) });
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  const asyncStorage = {
    getItem: async (key) => storage.getItem(key),
    setItem: async (key, value) => { storage.setItem(key, value); },
    getAllKeys: async () => [...values.keys()],
    multiRemove: async (keys) => keys.forEach((key) => values.delete(key)),
  };
  const modules = {
    'expo-constants': { expoConfig: { hostUri: '192.168.1.20:8081' } },
    '@react-native-async-storage/async-storage': asyncStorage,
    'react-native': { Platform: { OS: 'ios' } },
    './storage': { readAppValue: asyncStorage.getItem, writeAppValue: asyncStorage.setItem, removeAppValue: async (key) => storage.removeItem(key) },
  };
  const sandbox = {
    exports: {}, process: { env }, __DEV__: development,
    require: (id) => { assert.ok(id in modules, `Unexpected dependency: ${id}`); return modules[id]; },
    window: { localStorage: storage, sessionStorage: storage, dispatchEvent() {} },
    Date: class extends Date { static now() { return now; } },
    URLSearchParams, Headers, AbortController, Event,
    setTimeout, clearTimeout,
    fetch: async (url, init) => { calls.push({ url, init }); return respond(url, init); },
  };
  const file = platform === 'mobile' ? '../../../Mobile/src/lib/api.ts' : '../../lib/api.ts';
  const code = ts.transpileModule(fs.readFileSync(new URL(file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, sandbox, { filename: file });
  return { api: sandbox.exports, calls, values, asyncStorage, advance: (ms) => { now += ms; }, respond: (fn) => { respond = fn; } };
}

for (const platform of ['web', 'mobile']) {
  test(`${platform}: public GETs coalesce and expire instead of persisting stale data`, async () => {
    const f = fixture(platform);
    const [first, second] = await Promise.all([f.api.apiFetch('/v1/albums'), f.api.apiFetch('/v1/albums')]);
    assert.equal(f.calls.length, 1);
    assert.deepEqual(first, second);
    await f.api.apiFetch('/v1/albums');
    assert.equal(f.calls.length, 1);
    f.advance(46_000);
    await f.api.apiFetch('/v1/albums');
    assert.equal(f.calls.length, 2);
  });

  test(`${platform}: auth, QR, library, VIP, favorites and audio detail always refresh`, async () => {
    const f = fixture(platform);
    for (const endpoint of ['/v1/auth/qr/session/status?poll_token=example', '/v1/me/library', '/v1/vip/transactions', '/v1/favorites/songs', '/v1/songs/test', '/v1/for-you']) {
      await f.api.apiFetch(endpoint);
      await f.api.apiFetch(endpoint);
    }
    assert.equal(f.calls.length, 12);
  });

  test(`${platform}: custom headers and cancellation are not lost or coalesced`, async () => {
    const f = fixture(platform);
    const controller = new AbortController();
    await f.api.apiFetch('/v1/albums', { signal: controller.signal, headers: { 'X-Test': 'yes' } });
    assert.equal(new Headers(f.calls[0].init.headers).get('X-Test'), 'yes');
    await f.api.apiFetch('/v1/albums', { cache: 'no-store' });
    assert.equal(f.calls.length, 2);
    const cancelled = new AbortController();
    cancelled.abort();
    f.respond(async (_url, init) => {
      assert.equal(init.signal.aborted, true);
      throw new DOMException('Aborted', 'AbortError');
    });
    await assert.rejects(f.api.apiFetch('/v1/albums', { signal: cancelled.signal }), { name: 'AbortError' });
  });

  test(`${platform}: failed GETs are retried and mutations invalidate cached results`, async () => {
    const f = fixture(platform);
    f.respond(async () => ({ ok: false, status: 503, json: async () => ({ message: 'Unavailable' }) }));
    await assert.rejects(f.api.apiFetch('/v1/charts'), /Unavailable/);
    f.respond(async () => ({ ok: true, status: 200, json: async () => ({ data: [] }) }));
    await f.api.apiFetch('/v1/charts');
    await f.api.apiFetch('/v1/playlists', { method: 'POST', body: '{}' });
    await f.api.apiFetch('/v1/charts');
    assert.equal(f.calls.length, 4);
  });

  test(`${platform}: auth changes isolate caches and pending responses cannot repopulate them`, async () => {
    const f = fixture(platform);
    let resolve;
    f.respond(() => new Promise((done) => { resolve = done; }));
    const pending = f.api.apiFetch('/v1/charts');
    await new Promise(setImmediate);
    await f.api.clearAuthSession();
    resolve({ ok: true, status: 200, json: async () => ({ data: 'old' }) });
    await pending;
    f.respond(async () => ({ ok: true, status: 200, json: async () => ({ data: 'new' }) }));
    assert.equal((await f.api.apiFetch('/v1/charts')).data, 'new');
    await f.api.saveAuthSession({ token: 'test-token', user: { id: 'test-user' } });
    await f.api.apiFetch('/v1/charts');
    assert.equal(new Headers(f.calls.at(-1).init.headers).get('Authorization'), 'Bearer test-token');
    assert.equal(f.calls.length, 3);
  });
}

test('mobile: localhost replacement preserves a configured non-default API port', () => {
  const f = fixture('mobile', { EXPO_PUBLIC_API_URL: 'http://localhost:9000/api' });
  assert.equal(f.api.API_URL, 'http://192.168.1.20:9000/api');
});

test('mobile: Expo LAN development uses local API but production and explicit overrides stay separate', () => {
  assert.equal(fixture('mobile', {}, true).api.API_URL, 'http://192.168.1.20:8000/api');
  assert.equal(fixture('mobile').api.API_URL, 'https://melodify-6kc9.onrender.com/api');
  assert.equal(fixture('mobile', { EXPO_PUBLIC_API_URL: 'https://example.test/api' }, true).api.API_URL, 'https://example.test/api');
});

test('mobile: expired home snapshot waits for fresh data rather than silently serving stale content', async () => {
  const f = fixture('mobile');
  const first = await f.api.getHomeBootstrap();
  assert.deepEqual(await f.api.getHomeBootstrap(), first);
  f.advance(61_000);
  const refreshed = await f.api.getHomeBootstrap();
  assert.notDeepEqual(refreshed, first);
  assert.equal(f.calls.length, 2);
});

test('mobile: search avoids unused totals but callers can request them explicitly', async () => {
  const f = fixture('mobile');
  await f.api.searchCatalog('MIN');
  assert.equal(new URL(f.calls[0].url).searchParams.get('suggest'), '1');
  await f.api.searchCatalog('MIN', 'all', 1, true);
  assert.equal(new URL(f.calls[1].url).searchParams.has('suggest'), false);
});

test('mobile: a delayed disk read cannot resurrect data invalidated by a mutation', async () => {
  const f = fixture('mobile');
  const key = 'melodify_api_response_v1:' + encodeURIComponent(f.api.API_URL + '/v1/albums');
  const cached = JSON.stringify({ apiUrl: f.api.API_URL, path: '/v1/albums', savedAt: Date.now(), value: { data: 'old' } });
  f.values.set(key, cached);
  let releaseRead;
  const readItem = f.asyncStorage.getItem;
  f.asyncStorage.getItem = (name) => name === key
    ? new Promise((resolve) => { releaseRead = () => resolve(cached); }) : readItem(name);
  const pending = f.api.apiFetch('/v1/albums');
  await new Promise(setImmediate);
  await f.api.apiFetch('/v1/playlists', { method: 'POST', body: '{}' });
  f.asyncStorage.getItem = readItem;
  f.respond(async () => ({ ok: true, status: 200, json: async () => ({ data: 'fresh' }) }));
  releaseRead();
  assert.equal((await pending).data, 'fresh');
  await new Promise(setImmediate);
  assert.equal((await f.api.apiFetch('/v1/albums')).data, 'fresh');
  assert.equal(JSON.parse(f.values.get(key)).value.data, 'fresh');
});
