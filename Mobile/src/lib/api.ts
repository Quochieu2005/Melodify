import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { readAppValue, removeAppValue, writeAppValue } from './storage';

const expoDevHost = Constants.expoConfig?.hostUri?.split(':')[0];
const isIpv4Address = (value: string | undefined): value is string => {
  if (!value || !/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) return false;
  return value.split('.').every((part) => Number(part) <= 255);
};

// Expo Go on the same LAN should reach the developer's API, not silently
// switch to a remote production server. Explicit environment settings win.
const expoLanApiUrl = typeof __DEV__ !== 'undefined' && __DEV__ && Platform.OS !== 'web'
  && isIpv4Address(expoDevHost) && !expoDevHost.startsWith('127.')
  ? `http://${expoDevHost}:8000/api` : undefined;
const defaultApiUrl = expoLanApiUrl ?? (Platform.OS === 'web' || (typeof __DEV__ !== 'undefined' && __DEV__)
    ? 'http://localhost:8000/api'
    : 'https://melodify-6kc9.onrender.com/api');

const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim()
  || (typeof Constants.expoConfig?.extra?.apiUrl === 'string'
    ? Constants.expoConfig.extra.apiUrl.trim()
    : undefined);
const isLocalEnv = Boolean(configuredApiUrl && /localhost|127\.0\.0\.1/i.test(configuredApiUrl));
const localApiHost = Platform.OS === 'web' && typeof window !== 'undefined'
  ? window.location.hostname
  : isIpv4Address(expoDevHost) ? expoDevHost : undefined;
const deviceConfiguredApiUrl = isLocalEnv && localApiHost
  ? configuredApiUrl?.replace(/^(https?:\/\/)(localhost|127\.0\.0\.1)(?=[:/])/i, `$1${localApiHost}`)
  : configuredApiUrl;

export const API_URL = (
  deviceConfiguredApiUrl ??
  defaultApiUrl
).replace(/\/+$/, '');

const AUTH_TOKEN_STORAGE_KEY = 'melodify_access_token';
const AUTH_USER_STORAGE_KEY = 'melodify_auth_user';
const VISITOR_ID_STORAGE_KEY = 'melodify_visitor_id';
const pendingGets = new Map<string, Promise<unknown>>();
type CachedApiResponse = { apiUrl: string; path: string; savedAt: number; value: unknown };
const apiResponseCache = new Map<string, CachedApiResponse>();
const API_RESPONSE_CACHE_PREFIX = 'melodify_api_response_v1:';
const API_RESPONSE_FRESH_MS = 45_000;
const API_RESPONSE_CATALOG_STALE_MS = 10 * 60_000;
const API_RESPONSE_ACTIVITY_STALE_MS = 90_000;
const API_RESPONSE_CACHE_MAX_ENTRIES = 80;
let apiResponseCacheGeneration = 0;
let apiCacheStorageTask: Promise<unknown> = Promise.resolve();

let tokenValue: string | null | undefined;
let tokenRequest: Promise<string | null> | null = null;
let visitorIdValue: string | null = null;
let visitorIdRequest: Promise<string> | null = null;

export type Page<T> = {
  data: T[];
  meta: { current_page: number; last_page: number; per_page: number; total: number };
};

export type SongArtistCredit = {
  id: string | null;
  name: string;
  slug?: string | null;
  avatar_url?: string | null;
};

export type SongAudioQuality = {
  quality_id: string;
  label: string;
  bitrate: number | null;
  premium_only: boolean;
  available?: boolean;
  audio_url: string | null;
  download_url: string | null;
};

export type Song = {
  id: string;
  title: string;
  slug: string | null;
  duration_seconds: number | null;
  artist: { id: string | null; name: string } | null;
  artists?: SongArtistCredit[];
  publisher?: string | null;
  album?: { id: string; title: string } | null;
  genre?: { id: string; name: string } | null;
  topics?: { id: string; name: string; type: string | null }[];
  premium_only?: boolean;
  audio_quality?: string | null;
  audio_qualities?: SongAudioQuality[];
  download_url?: string | null;
  audio_url?: string | null;
  stream_url?: string | null;
  preview_url: string | null;
  source_url?: string | null;
  cover_url?: string | null;
  lyrics?: Lyric[];
  views?: number;
  favorites?: number;
  is_favorite?: boolean;
};

export type Lyric = {
  id: string;
  song_id: string;
  language: string;
  content: string;
  is_synced: boolean;
  plain_lyrics?: string | null;
  synced_lyrics?: string | null;
};

export type Artist = {
  id: string;
  name: string;
  real_name?: string | null;
  slug: string | null;
  bio: string | null;
  avatar_url: string | null;
  followers_count?: number;
  verified: boolean;
  status: string;
  is_following?: boolean;
};

export type TrendingArtist = Artist & {
  weekly_plays: number;
  weekly_views: number;
  trending_score: number;
  ranking_source: 'weekly' | 'catalog';
  featured_song: (Pick<Song, 'id' | 'slug' | 'title' | 'cover_url' | 'publisher'> &
    Pick<Song, 'artist' | 'artists'> & { weekly_plays: number }) | null;
};

export type Playlist = {
  id: string;
  name: string;
  slug: string | null;
  type: string | null;
  type_custom: string | null;
  description: string | null;
  cover_url: string | null;
  visibility: 'public' | 'private' | 'unlisted';
  is_system: boolean;
  sort_order: number;
  status: string;
  song_count: number;
  songs?: Song[];
  favorite_count?: number;
  is_favorite?: boolean;
};

export type Album = {
  id: string;
  title: string;
  slug: string | null;
  artist_id: string | null;
  artist: Artist | null;
  release_date: string | null;
  cover_url: string | null;
  status: string;
  song_count: number;
  is_favorite?: boolean;
  songs?: Song[];
};

export type Topic = {
  id: string;
  name: string;
  slug: string | null;
  type: string | null;
  type_custom?: string | null;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  status: string;
  song_count: number;
  songs?: Song[];
};

export type Genre = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  status: string;
  song_count: number;
};

export type ChartSong = Song & { rank: number; trend: 'up' | 'down' | 'same' };
export type Chart = {
  id: string;
  slug: string;
  title: string;
  tone: string;
  description: string | null;
  cover_url: string | null;
  date: string;
  updated_at: string | null;
  song_count: number;
  songs: ChartSong[];
};

export type Banner = {
  id: string;
  title: string;
  slug: string | null;
  image_url: string | null;
  link_url: string | null;
};

export type HomeDiscovery = {
  single_new_releases: Song[];
  popular_songs: Song[];
};

export type HomeBootstrap = {
  banners: { id: string; title: string; slug: string | null; image_url: string | null; link_url: string | null }[];
  charts: Chart[];
  topics: Topic[];
  genres: Genre[];
  albums: Album[];
  playlists: Playlist[];
  discovery: { single_new_releases: Song[]; popular_songs: Song[] };
  trending_artists: TrendingArtist[];
};

type HomeBootstrapResponse = {
  data: HomeBootstrap;
  meta: { date: string; refresh_minutes: number };
};

type CachedHomeBootstrap = {
  apiUrl: string;
  savedAt: number;
  value: HomeBootstrapResponse;
};

const HOME_BOOTSTRAP_CACHE_KEY = 'melodify_home_bootstrap_cache_v1';
const HOME_BOOTSTRAP_FRESH_MS = 60_000;
const HOME_BOOTSTRAP_STALE_MS = 7 * 24 * 60 * 60 * 1_000;
let homeBootstrapCache: CachedHomeBootstrap | null | undefined;
let homeBootstrapCacheRead: Promise<CachedHomeBootstrap | null> | null = null;
let homeBootstrapRequest: Promise<HomeBootstrapResponse> | null = null;
const homeBootstrapListeners = new Set<(value: HomeBootstrapResponse) => void>();

function isCachedHomeBootstrap(value: unknown): value is CachedHomeBootstrap {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<CachedHomeBootstrap>;
  const data = candidate.value?.data;
  return candidate.apiUrl === API_URL
    && typeof candidate.savedAt === 'number'
    && !!data
    && Array.isArray(data.topics)
    && Array.isArray(data.genres)
    && Array.isArray(data.albums)
    && Array.isArray(data.playlists);
}

export type LibraryData = {
  favorite_song_count: number;
  created_playlists: { id: string; name: string; slug: string; cover_url: string | null; song_count: number }[];
  favorite_playlists: { id: string; name: string; slug: string; cover_url: string | null; song_count: number }[];
  favorite_albums: Pick<Album, 'id' | 'title' | 'slug' | 'cover_url'>[];
  following_artists: Pick<Artist, 'id' | 'name' | 'slug' | 'avatar_url'>[];
  following_users: { id: string; name: string; username: string | null; avatar_url: string | null }[];
  followers: { id: string; name: string; username: string | null; avatar_url: string | null }[];
  following_count: number;
  followers_count: number;
};

export type SearchKind = 'all' | 'song' | 'playlist' | 'artist' | 'album' | 'user';
export type SearchResults = {
  data: {
    song?: Song[];
    playlist?: Playlist[];
    artist?: (Artist & { followers_count: number })[];
    album?: Album[];
    user?: { id: string; name: string; username: string | null; avatar_url: string | null }[];
  };
  meta: { query: string; type: SearchKind; page: number; per_page: number; totals: Partial<Record<SearchKind, number>> };
};

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export type AuthUser = {
  id: string;
  name: string;
  username: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_premium: number;
  status: string;
};

export type AuthResponse = {
  message: string;
  token: string;
  token_type: string;
  expires_at: string;
  user: AuthUser;
};

export type SubscriptionPlanRecord = {
  id: string;
  name: string;
  slug: string | null;
  price: number;
  billing_cycle: 'monthly' | 'yearly' | string;
  billing_months: number;
  description: string | null;
  offline_download: boolean;
  ads_enabled: boolean;
  unlimited_skip: boolean;
};

export type VipPaymentMethod = 'momo' | 'vnpay' | 'zalopay';

export type VipPaymentGatewayOption = {
  id: VipPaymentMethod;
  label: string;
  enabled: boolean;
};

export type VipCheckoutOrder = {
  payment_id: string;
  payment_code: string;
  amount: number;
  currency: string;
  method: VipPaymentMethod;
  status: 'pending' | string;
  checkout_url: string;
  plan: { id: string; name: string };
};

export type VipPaymentStatus = {
  payment_code: string;
  status: 'pending' | 'processing' | 'success' | 'failed' | 'cancelled' | string;
  amount: number;
  currency: string;
  method: VipPaymentMethod;
  plan_name: string;
  paid_at: string | null;
  vip_expires_at: string | null;
};

export type VipTransactionRecord = {
  id: string;
  payment_code: string;
  created_at: string | null;
  amount: number;
  currency: string;
  method: string;
  status: string;
  plan_name: string;
  transaction_code: string;
  gateway: string;
  paid_at?: string | null;
  vip_expires_at?: string | null;
};

export type VipTransactionHistory = {
  user: { id: string; name: string; username: string | null; email: string | null; phone: string | null };
  data: VipTransactionRecord[];
  meta: { current_page: number; last_page: number; total: number };
};


async function getAuthToken(): Promise<string | null> {
  if (tokenValue !== undefined) {
    return tokenValue;
  }
  if (!tokenRequest) {
    const request = readAppValue(AUTH_TOKEN_STORAGE_KEY)
      .then((value) => {
        if (tokenRequest !== request) return tokenValue ?? null;
        tokenValue = value;
        return value;
      })
      .finally(() => {
        if (tokenRequest === request) tokenRequest = null;
      });
    tokenRequest = request;
  }
  return tokenRequest;
}

export async function getVisitorId(): Promise<string> {
  if (visitorIdValue) {
    return visitorIdValue;
  }
  if (!visitorIdRequest) {
    visitorIdRequest = (async () => {
      const stored = await readAppValue(VISITOR_ID_STORAGE_KEY);
      if (stored) {
        visitorIdValue = stored;
        return stored;
      }
      const created = 'visitor-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
      visitorIdValue = created;
      await writeAppValue(VISITOR_ID_STORAGE_KEY, created);
      return created;
    })().finally(() => {
      visitorIdRequest = null;
    });
  }
  return visitorIdRequest;
}

export async function saveAuthSession(auth: AuthResponse): Promise<void> {
  apiResponseCacheGeneration += 1;
  pendingGets.clear();
  apiResponseCache.clear();
  tokenValue = auth.token;
  tokenRequest = null;
  await writeAppValue(AUTH_TOKEN_STORAGE_KEY, auth.token);
  await writeAppValue(AUTH_USER_STORAGE_KEY, JSON.stringify(auth.user));
}

export async function clearAuthSession(): Promise<void> {
  apiResponseCacheGeneration += 1;
  pendingGets.clear();
  apiResponseCache.clear();
  tokenValue = null;
  tokenRequest = null;
  await Promise.all([
    removeAppValue(AUTH_TOKEN_STORAGE_KEY),
    removeAppValue(AUTH_USER_STORAGE_KEY),
  ]);
}

export async function getSavedAuthUser(): Promise<AuthUser | null> {
  const saved = await readAppValue(AUTH_USER_STORAGE_KEY);
  if (!saved) {
    return null;
  }
  try {
    return JSON.parse(saved) as AuthUser;
  } catch {
    return null;
  }
}

export async function refreshSavedAuthUser(): Promise<AuthUser> {
  const response = await apiFetch<{ user: AuthUser }>('/v1/auth/me', { cache: 'no-store' });
  await writeAppValue(AUTH_USER_STORAGE_KEY, JSON.stringify(response.user));
  return response.user;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase();
  const token = await getAuthToken();
  if (method !== 'GET') {
    const value = await fetchApiResponse<T>(path, init, method, token);
    if (!path.endsWith('/view')) {
      clearApiResponseCache();
    }
    return value;
  }

  if (Object.keys(init).some((key) => key !== 'method')) {
    return fetchApiResponse<T>(path, init, method, token);
  }

  const requestKey = API_URL + ':' + (token ?? '') + ':' + path;
  const memoryTtl = getApiResponseMemoryTtl(path);
  const now = Date.now();
  const memoryCached = memoryTtl > 0 ? apiResponseCache.get(requestKey) : undefined;
  if (memoryCached) {
    const age = now - memoryCached.savedAt;
    if (age < memoryTtl) return memoryCached.value as T;
    apiResponseCache.delete(requestKey);
  }

  // Only explicitly allowlisted public catalog endpoints are persisted. Their
  // response payloads are identical with or without an Authorization header.
  if (canPersistApiResponse(path)) {
    const generation = apiResponseCacheGeneration;
    const diskCached = await readApiResponseCache(path);
    if (diskCached && generation === apiResponseCacheGeneration) {
      const age = Date.now() - diskCached.savedAt;
      apiResponseCache.set(requestKey, diskCached);
      if (apiResponseCache.size > API_RESPONSE_CACHE_MAX_ENTRIES) {
        const oldestKey = apiResponseCache.keys().next().value;
        if (oldestKey) apiResponseCache.delete(oldestKey);
      }
      if (age < API_RESPONSE_FRESH_MS) return diskCached.value as T;
      if (age < getApiResponsePersistedStaleMs(path)) {
        void loadApiGet<T>(path, token, requestKey, memoryTtl).catch(() => undefined);
        return diskCached.value as T;
      }
    }
  }

  return loadApiGet<T>(path, token, requestKey, memoryTtl);
}

async function fetchApiResponse<T>(path: string, init: RequestInit, method: string, token: string | null, baseUrl = API_URL): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');
  if (token && !headers.has('Authorization')) headers.set('Authorization', 'Bearer ' + token);
  if (typeof init.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const controller = new AbortController();
  let timedOut = false;
  const abortFromCaller = () => controller.abort();
  if (init.signal?.aborted) abortFromCaller();
  else init.signal?.addEventListener('abort', abortFromCaller, { once: true });
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, 15_000);
  try {
    const response = await fetch(baseUrl.replace(/\/+$/, '') + path, {
      ...init,
      headers,
      ...(controller ? { signal: controller.signal } : {}),
    });
    if (!response.ok) {
      let message = 'Không thể kết nối máy chủ. Vui lòng thử lại.';
      try {
        const body = await response.json() as { message?: string };
        message = body.message || message;
      } catch {
        // Keep the actionable fallback when the response is not JSON.
      }
      throw new ApiError(response.status, message);
    }
    if (response.status === 204) return undefined as T;
    return await response.json() as T;
  } catch (reason) {
    if (timedOut && !init.signal?.aborted) {
      throw new Error(`API phản hồi quá lâu tại ${baseUrl} (15 giây). Kiểm tra máy chủ và thử lại.`);
    }
    if (reason instanceof TypeError) {
      let hostname = baseUrl;
      try {
        hostname = new URL(baseUrl).hostname;
      } catch {
        // Keep the configured API address if it is not a valid absolute URL.
      }
      const isPrivateHost = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(hostname);
      throw new Error(isPrivateHost
        ? `Không kết nối được API ${baseUrl}. Trên điện thoại, chạy Backend bằng "composer run dev:mobile", dùng cùng Wi‑Fi và cho phép cổng 8000 qua tường lửa.`
        : `Không kết nối được máy chủ API (${hostname}). Kiểm tra Internet hoặc trạng thái máy chủ rồi thử lại.`);
    }
    throw reason;
  } finally {
    clearTimeout(timeoutId);
    init.signal?.removeEventListener('abort', abortFromCaller);
  }
}

function getApiResponseMemoryTtl(path: string): number {
  const pathname = path.split('?')[0];
  if (pathname === '/v1/search') return 8_000;
  return /^\/v1\/(banners|home\/discovery|topics|genres|albums|playlists|artists|artists\/trending|charts(?:\/[^/]+)?|subscription-plans)$/.test(pathname)
    ? API_RESPONSE_FRESH_MS : 0;
}

function canPersistApiResponse(path: string): boolean {
  const [pathname, query = ''] = path.split('?');
  if (pathname === '/v1/home/discovery' || pathname === '/v1/charts' || pathname === '/v1/artists/trending') {
    return query === '';
  }
  if (pathname === '/v1/banners') {
    if (!query) return true;
    const params = new URLSearchParams(query);
    for (const [key, value] of params.entries()) {
      if (!['daily', 'limit', 'per_page'].includes(key) || !/^\d+$/.test(value)) return false;
    }
    return true;
  }
  if (!/^\/v1\/(topics|genres|albums|playlists|artists)$/.test(pathname)
    && pathname !== '/v1/subscription-plans') {
    return false;
  }

  if (!query) return true;
  const params = new URLSearchParams(query);
  for (const [key, value] of params.entries()) {
    if (key !== 'page' && key !== 'per_page') return false;
    const number = Number(value);
    if (!Number.isInteger(number) || number < 1) return false;
    if (key === 'page' && number > 3) return false;
    if (key === 'per_page' && number > 100) return false;
  }
  return true;
}

function getApiResponsePersistedStaleMs(path: string): number {
  return /^\/v1\/(home\/discovery|charts|artists\/trending)(?:\?|$)/.test(path)
    ? API_RESPONSE_ACTIVITY_STALE_MS
    : API_RESPONSE_CATALOG_STALE_MS;
}

function isCachedApiResponse(value: unknown, path: string): value is CachedApiResponse {
  if (!value || typeof value !== 'object') return false;
  const cached = value as Partial<CachedApiResponse>;
  return cached.apiUrl === API_URL
    && cached.path === path
    && typeof cached.savedAt === 'number'
    && 'value' in cached;
}

async function readApiResponseCache(path: string): Promise<CachedApiResponse | null> {
  try {
    // Reads stay independent so simultaneous screen requests do not queue behind
    // one another. Writes and invalidation remain serialized, and the generation
    // check in apiFetch discards a read that raced with a mutation.
    const raw = await AsyncStorage.getItem(API_RESPONSE_CACHE_PREFIX + encodeURIComponent(API_URL + path));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isCachedApiResponse(parsed, path) ? parsed : null;
  } catch {
    return null;
  }
}

// Keep reads, writes and invalidation ordered so a delayed storage operation
// cannot restore an old snapshot after a successful mutation.
function queueApiCacheStorage<T>(operation: () => Promise<T>): Promise<T> {
  const task = apiCacheStorageTask.then(operation);
  apiCacheStorageTask = task.catch(() => undefined);
  return task;
}

function loadApiGet<T>(path: string, token: string | null, requestKey: string, memoryTtl: number): Promise<T> {
  const pending = pendingGets.get(requestKey);
  if (pending) return pending as Promise<T>;

  const generation = apiResponseCacheGeneration;
  const request = fetchApiResponse<T>(path, {}, 'GET', token).then((value) => {
    if (memoryTtl > 0 && generation === apiResponseCacheGeneration) {
      const cached: CachedApiResponse = { apiUrl: API_URL, path, savedAt: Date.now(), value };
      apiResponseCache.set(requestKey, cached);
      if (apiResponseCache.size > API_RESPONSE_CACHE_MAX_ENTRIES) {
        const oldestKey = apiResponseCache.keys().next().value;
        if (oldestKey) apiResponseCache.delete(oldestKey);
      }
      if (canPersistApiResponse(path)) {
        void queueApiCacheStorage(() => AsyncStorage.setItem(
          API_RESPONSE_CACHE_PREFIX + encodeURIComponent(API_URL + path),
          JSON.stringify(cached),
        )).catch(() => undefined);
      }
    }
    return value;
  });
  const tracked = request.finally(() => {
    if (pendingGets.get(requestKey) === tracked) pendingGets.delete(requestKey);
  });
  pendingGets.set(requestKey, tracked);
  return tracked;
}

function clearApiResponseCache(): void {
  apiResponseCacheGeneration += 1;
  apiResponseCache.clear();
  pendingGets.clear();
  void queueApiCacheStorage(() => AsyncStorage.getAllKeys()
    .then((keys) => keys.filter((key) => key.startsWith(API_RESPONSE_CACHE_PREFIX)))
    .then((keys) => keys.length > 0 ? AsyncStorage.multiRemove(keys) : undefined))
    .catch(() => undefined);
}

function jsonRequest(body: unknown): RequestInit {
  return { method: 'POST', body: JSON.stringify(body) };
}

export function getHomeBootstrap() {
  return (async (): Promise<HomeBootstrapResponse> => {
    if (homeBootstrapCache === undefined && !homeBootstrapCacheRead) {
      homeBootstrapCacheRead = (async () => {
        try {
          const raw = await AsyncStorage.getItem(HOME_BOOTSTRAP_CACHE_KEY);
          if (raw) {
            const parsed: unknown = JSON.parse(raw);
            homeBootstrapCache = isCachedHomeBootstrap(parsed) ? parsed : null;
          } else {
            homeBootstrapCache = null;
          }
        } catch {
          homeBootstrapCache = null;
        }
        return homeBootstrapCache ?? null;
      })().finally(() => {
        homeBootstrapCacheRead = null;
      });
    }

    const cached = homeBootstrapCache !== undefined
      ? homeBootstrapCache
      : await homeBootstrapCacheRead;

    const refresh = () => {
      if (!homeBootstrapRequest) {
        homeBootstrapRequest = apiFetch<HomeBootstrapResponse>('/v1/home/bootstrap')
          .then((value) => {
            const next: CachedHomeBootstrap = { apiUrl: API_URL, savedAt: Date.now(), value };
            homeBootstrapCache = next;
            void AsyncStorage.setItem(HOME_BOOTSTRAP_CACHE_KEY, JSON.stringify(next)).catch(() => undefined);
            homeBootstrapListeners.forEach((listener) => listener(value));
            return value;
          })
          .finally(() => {
            homeBootstrapRequest = null;
          });
      }
      return homeBootstrapRequest;
    };

    const cacheAge = cached ? Date.now() - cached.savedAt : Number.POSITIVE_INFINITY;
    if (cached && cacheAge <= HOME_BOOTSTRAP_STALE_MS) {
      if (cacheAge >= HOME_BOOTSTRAP_FRESH_MS) {
        void refresh().catch(() => undefined);
      }
      return cached.value;
    }

    return refresh();
  })();
}

export function subscribeHomeBootstrap(listener: (value: HomeBootstrapResponse) => void): () => void {
  homeBootstrapListeners.add(listener);
  return () => homeBootstrapListeners.delete(listener);
}

export function listSongs(options: { query?: string; perPage?: number } = {}) {
  const params = new URLSearchParams();
  if (options.query?.trim()) params.set('q', options.query.trim());
  if (options.perPage) params.set('per_page', String(options.perPage));
  const query = params.toString();
  return apiFetch<Page<Song>>('/v1/songs' + (query ? '?' + query : ''));
}

export function listFavoriteSongs(visitorId: string) {
  return apiFetch<{ data: Song[]; meta: { total: number } }>('/v1/favorites/songs?visitor_id=' + encodeURIComponent(visitorId));
}

export function getSong(identifier: string, visitorId?: string) {
  const query = visitorId ? '?visitor_id=' + encodeURIComponent(visitorId) : '';
  return apiFetch<{ data: Song & { lyrics?: Lyric[] } }>('/v1/songs/' + encodeURIComponent(identifier) + query);
}

export function toggleSongFavorite(identifier: string, visitorId: string) {
  return apiFetch<{ favorited: boolean; favorites: number }>(
    '/v1/songs/' + encodeURIComponent(identifier) + '/favorite',
    jsonRequest({ visitor_id: visitorId }),
  );
}

export function recordSongView(identifier: string, visitorId: string) {
  return apiFetch<{ recorded: boolean; views: number }>(
    '/v1/songs/' + encodeURIComponent(identifier) + '/view',
    jsonRequest({ visitor_id: visitorId, source: 'mobile_player' }),
  );
}

export function listCharts() {
  return apiFetch<{ data: Chart[]; meta: { date: string; refresh_minutes: number } }>('/v1/charts');
}

export function listBanners(options: { perPage?: number; daily?: boolean; limit?: number } = {}) {
  const params = new URLSearchParams();
  if (options.perPage) params.set('per_page', String(options.perPage));
  if (options.daily) params.set('daily', '1');
  if (options.limit) params.set('limit', String(options.limit));
  const query = params.toString();
  return apiFetch<Page<Banner>>('/v1/banners' + (query ? '?' + query : ''));
}

export function getHomeDiscovery() {
  return apiFetch<{ data: HomeDiscovery; meta: { date: string; refresh_minutes: number } }>('/v1/home/discovery');
}

export function getChart(slug: string) {
  return apiFetch<{ data: Chart }>('/v1/charts/' + encodeURIComponent(slug));
}

export function getTrendingArtists() {
  return apiFetch<{ data: TrendingArtist[]; meta: { date: string; limit: number; period_days: number; source: string; total: number } }>('/v1/artists/trending');
}

export function listTopics(options: { perPage?: number } = {}) {
  const params = new URLSearchParams({ per_page: String(options.perPage ?? 50) });
  return apiFetch<Page<Topic>>('/v1/topics?' + params);
}

export function getTopic(slug: string) {
  return apiFetch<{ data: Topic }>('/v1/topics/' + encodeURIComponent(slug));
}

export function listGenres(options: { perPage?: number; page?: number } = {}) {
  const params = new URLSearchParams({ per_page: String(options.perPage ?? 50) });
  if (options.page) params.set('page', String(options.page));
  return apiFetch<Page<Genre>>('/v1/genres?' + params);
}

export function getGenre(slug: string) {
  return apiFetch<{ data: Genre & { songs?: Song[] } }>('/v1/genres/' + encodeURIComponent(slug));
}

export function listPlaylists(options: { query?: string; topic?: string; genre?: string; page?: number; perPage?: number } = {}) {
  const params = new URLSearchParams();
  if (options.query?.trim()) params.set('q', options.query.trim());
  if (options.topic) params.set('topic', options.topic);
  if (options.genre) params.set('genre', options.genre);
  if (options.page) params.set('page', String(options.page));
  if (options.perPage) params.set('per_page', String(options.perPage));
  const query = params.toString();
  return apiFetch<Page<Playlist>>('/v1/playlists' + (query ? '?' + query : ''));
}

export function getPlaylist(identifier: string, visitorId?: string) {
  const query = visitorId ? '?visitor_id=' + encodeURIComponent(visitorId) : '';
  return apiFetch<{ data: Playlist }>('/v1/playlists/' + encodeURIComponent(identifier) + query);
}

export function togglePlaylistFavorite(identifier: string, visitorId: string) {
  return apiFetch<{ favorited: boolean; favorites: number }>(
    '/v1/playlists/' + encodeURIComponent(identifier) + '/favorite',
    jsonRequest({ visitor_id: visitorId }),
  );
}

export function listAlbums(options: { query?: string; page?: number; perPage?: number } = {}) {
  const params = new URLSearchParams();
  if (options.query?.trim()) params.set('q', options.query.trim());
  if (options.page) params.set('page', String(options.page));
  if (options.perPage) params.set('per_page', String(options.perPage));
  const query = params.toString();
  return apiFetch<Page<Album>>('/v1/albums' + (query ? '?' + query : ''));
}

export function getAlbum(identifier: string, visitorId?: string) {
  const query = visitorId ? '?visitor_id=' + encodeURIComponent(visitorId) : '';
  return apiFetch<{ data: Album & { songs: Song[] } }>('/v1/albums/' + encodeURIComponent(identifier) + query);
}

export function toggleAlbumFavorite(identifier: string, visitorId: string) {
  return apiFetch<{ favorited: boolean; favorites: number }>(
    '/v1/albums/' + encodeURIComponent(identifier) + '/favorite',
    jsonRequest({ visitor_id: visitorId }),
  );
}

export function listArtists(options: { query?: string; perPage?: number } = {}) {
  const params = new URLSearchParams();
  if (options.query?.trim()) params.set('q', options.query.trim());
  if (options.perPage) params.set('per_page', String(options.perPage));
  const query = params.toString();
  return apiFetch<Page<Artist>>('/v1/artists' + (query ? '?' + query : ''));
}

export function getArtist(identifier: string) {
  return apiFetch<{ data: Artist & { songs?: Song[]; featured_songs?: Song[]; albums?: Album[]; playlists?: Playlist[] } }>(
    '/v1/artists/' + encodeURIComponent(identifier),
  );
}

export function getForYouArtists(genreIds: string[]) {
  const params = new URLSearchParams();
  genreIds.forEach((id) => params.append('genre_ids[]', id));
  return apiFetch<{ data: Artist[] }>('/v1/for-you/artists?' + params.toString());
}

export function getForYouSong(genreIds: string[], artistIds: string[], excludedIds: string[] = []) {
  const params = new URLSearchParams();
  genreIds.forEach((id) => params.append('genre_ids[]', id));
  artistIds.forEach((id) => params.append('artist_ids[]', id));
  excludedIds.forEach((id) => params.append('exclude_song_ids[]', id));
  return apiFetch<{ data: Song | null }>('/v1/for-you/song?' + params.toString());
}

export function searchCatalog(query: string, type: SearchKind = 'all', page = 1, includeTotals = false) {
  const params = new URLSearchParams({ q: query.trim(), type, page: String(page) });
  if (!includeTotals) params.set('suggest', '1');
  return apiFetch<SearchResults>('/v1/search?' + params);
}

export function getLibrary(visitorId: string) {
  return apiFetch<{ data: LibraryData }>('/v1/me/library?visitor_id=' + encodeURIComponent(visitorId));
}

export function setFollowing(kind: 'artist' | 'user', identifier: string, following: boolean) {
  return apiFetch<{ following: boolean; followers_count: number }>(
    '/v1/' + kind + 's/' + encodeURIComponent(identifier) + '/follow',
    jsonRequest({ following }),
  );
}

export function getPublicUser(identifier: string) {
  return apiFetch<{ data: { id: string; name: string; username: string | null; avatar_url: string | null; following_count: number; followers_count: number; is_following: boolean } }>(
    '/v1/users/' + encodeURIComponent(identifier),
  );
}

export function listUserPlaylists() {
  return apiFetch<{ data: { id: string; name: string; slug: string; cover_url: string | null; song_count: number }[] }>('/v1/me/playlists');
}

export function createUserPlaylist(name: string, visibility: 'public' | 'private' = 'public') {
  return apiFetch<{ data: { id: string; name: string; slug: string; cover_url: string | null; song_count: number } }>(
    '/v1/me/playlists',
    jsonRequest({ name, visibility }),
  );
}

export function addSongsToPlaylist(playlistId: string, songIds: string[]) {
  return apiFetch<{ message: string; added_count: number }>(
    '/v1/me/playlists/' + encodeURIComponent(playlistId) + '/songs',
    jsonRequest({ song_ids: songIds }),
  );
}

export function loginWithPassword(identifier: string, password: string) {
  return apiFetch<AuthResponse>('/v1/auth/login', jsonRequest({ identifier, password, remember: true, device_name: 'melodify-mobile' }));
}

export function registerWithPassword(name: string, email: string, password: string, confirmation: string) {
  return fetchApiResponse<AuthResponse>('/v1/auth/register', jsonRequest({
    name: name.trim(), email: email.trim().toLowerCase(), password,
    password_confirmation: confirmation, device_name: `melodify-${Platform.OS}`,
  }), 'POST', null);
}

export function loginWithSocialAccessToken(provider: 'google' | 'facebook', accessToken: string) {
  return fetchApiResponse<AuthResponse>('/v1/auth/social', jsonRequest({
    provider,
    access_token: accessToken,
    remember: true,
    device_name: `melodify-${Platform.OS}`,
  }), 'POST', null);
}

export function exchangeSocialLoginTicket(ticket: string, apiBaseUrl = API_URL) {
  return fetchApiResponse<AuthResponse>('/v1/auth/social/exchange-ticket', jsonRequest({
    ticket,
    remember: true,
    device_name: 'melodify-mobile',
  }), 'POST', null, apiBaseUrl);
}

export function exchangeSocialLoginCode(
  provider: 'google' | 'facebook',
  code: string,
  clientId: string,
  redirectUri: string,
  codeVerifier?: string,
) {
  return apiFetch<AuthResponse>('/v1/auth/social/exchange', jsonRequest({
    provider,
    code,
    client_id: clientId,
    redirect_uri: redirectUri,
    ...(codeVerifier ? { code_verifier: codeVerifier } : {}),
    remember: true,
    device_name: 'melodify-mobile',
  }));
}

export function requestPhoneLoginOtp(phone: string) {
  return apiFetch<{
    message: string;
    data: { phone: string; expires_at: string; resend_after_seconds: number };
  }>('/v1/auth/phone/request-otp', jsonRequest({ phone }));
}

export function verifyPhoneLoginOtp(phone: string, code: string) {
  return apiFetch<AuthResponse>(
    '/v1/auth/phone/verify',
    jsonRequest({ phone, code, remember: true, device_name: 'melodify-mobile' }),
  );
}

export async function getAudioSource(
  song: Song,
  qualityId?: string | null,
  purpose: 'stream' | 'download' = 'stream',
) {
  const identifier = song.slug || song.id;
  const qualities = song.audio_qualities ?? [];
  const authUser = await getSavedAuthUser();
  const isPremium = Number(authUser?.is_premium ?? 0) === 1;
  const selectedQuality = qualityId
    ? qualities.find((quality) => quality.quality_id === qualityId)
    : qualities.find((quality) => quality.available !== false && !quality.premium_only
      && (purpose === 'download' ? Boolean(quality.download_url || quality.audio_url) : Boolean(quality.audio_url)))
      ?? (isPremium ? qualities.find((quality) => quality.available !== false) : undefined);
  const selectedQualityUrl = purpose === 'download'
    ? selectedQuality?.download_url || selectedQuality?.audio_url
    : selectedQuality?.audio_url;
  if (qualityId && !selectedQuality) {
    throw new Error('Không tìm thấy chất lượng âm thanh đã chọn.');
  }
  if (selectedQuality?.available === false || (qualityId && selectedQuality && !selectedQualityUrl)) {
    throw new Error('NCT có thông tin chất lượng VIP nhưng chưa trả luồng phát/tải cho yêu cầu này.');
  }
  if (selectedQuality?.premium_only && !isPremium) {
    throw new Error('Chất lượng này yêu cầu tài khoản VIP.');
  }
  if (song.premium_only && !isPremium && !song.preview_url) {
    throw new Error('Bài hát này yêu cầu tài khoản VIP để nghe đầy đủ.');
  }
  if (purpose === 'download' && song.premium_only && !isPremium) {
    throw new Error('Tải bài hát này cần tài khoản VIP.');
  }
  if (qualities.some((quality) => quality.available !== false)
    && !qualities.some((quality) => quality.available !== false && !quality.premium_only)
    && !isPremium && !song.preview_url) {
    throw new Error('Bài hát này chỉ có chất lượng VIP.');
  }
  let uri = purpose === 'download'
    ? selectedQualityUrl || song.download_url || song.audio_url || song.stream_url || song.source_url
    : song.premium_only && !isPremium
      ? song.preview_url
      : selectedQualityUrl || song.audio_url || song.stream_url || song.source_url || song.preview_url;
  if (!uri) {
    uri = API_URL + '/v1/songs/' + encodeURIComponent(identifier) + '/audio';
  } else if (uri.startsWith('/v1/')) {
    uri = API_URL + uri;
  } else if (uri.startsWith('/')) {
    uri = API_URL.replace(/\/api$/, '') + uri;
  }
  let isInternalApiUrl = false;
  try {
    const apiBase = new URL(API_URL);
    const candidate = new URL(uri, API_URL);
    const apiPath = apiBase.pathname.replace(/\/$/, '');
    if (candidate.pathname.startsWith(apiPath + '/')) {
      uri = apiBase.origin + candidate.pathname + candidate.search;
      isInternalApiUrl = true;
    }
  } catch {
    isInternalApiUrl = uri.startsWith(API_URL);
  }
  const token = await getAuthToken();
  const headers = token && isInternalApiUrl ? { Authorization: 'Bearer ' + token } : undefined;
  return { uri, headers };
}

export async function uploadImage(uri: string, fileName = 'image.jpg', mimeType = 'image/jpeg') {
  const form = new FormData();
  form.append('image', { uri, name: fileName, type: mimeType } as unknown as Blob);
  return apiFetch<{ data: { url: string; public_id: string } }>('/media/images', {
    method: 'POST',
    body: form,
  });
}

export function getSubscriptionPlans() {
  return apiFetch<{ data: SubscriptionPlanRecord[] }>('/v1/subscription-plans');
}

export function getVipPaymentMethods() {
  return apiFetch<{ data: VipPaymentGatewayOption[] }>('/v1/vip/payment-methods', { cache: 'no-store' });
}

export function createVipCheckout(planId: string, method: VipPaymentMethod) {
  return apiFetch<{ message: string; data: VipCheckoutOrder }>(
    '/v1/vip/checkout',
    jsonRequest({ plan_id: planId, method }),
  );
}

export function getVipTransactions(page = 1) {
  return apiFetch<VipTransactionHistory>('/v1/vip/transactions?page=' + page, { cache: 'no-store' });
}

export function getVipPaymentStatus(paymentCode: string) {
  return apiFetch<{ data: VipPaymentStatus }>(
    '/v1/vip/transactions/' + encodeURIComponent(paymentCode),
    { cache: 'no-store' },
  );
}
