import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { readAppValue, removeAppValue, writeAppValue } from './storage';

const expoDevHost = Constants.expoConfig?.hostUri?.split(':')[0];
const isIpv4Address = (value: string | undefined): value is string => {
  if (!value || !/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) return false;
  return value.split('.').every((part) => Number(part) <= 255);
};

// On a physical device, localhost points to the phone. During Expo LAN
// development, use the same computer address as Metro and the LAN API port.
const expoLanApiUrl = Platform.OS !== 'web' && isIpv4Address(expoDevHost)
  && !expoDevHost.startsWith('127.')
  ? `http://${expoDevHost}:8000/api`
  : undefined;

const defaultApiUrl = Platform.OS === 'android'
  ? 'http://10.0.2.2:8000/api'
  : 'http://192.168.1.211:8000/api';

const envUrl = process.env.EXPO_PUBLIC_API_URL;
const isLocalEnv = !envUrl || envUrl.includes('localhost') || envUrl.includes('127.0.0.1');

export const API_URL = (
  (Platform.OS !== 'web' && isLocalEnv && expoLanApiUrl ? expoLanApiUrl : envUrl) ??
  expoLanApiUrl ??
  (Platform.OS !== 'web' ? 'http://192.168.1.211:8000/api' : undefined) ??
  defaultApiUrl
).replace(/\/+$/, '');

const AUTH_TOKEN_STORAGE_KEY = 'melodify_access_token';
const AUTH_USER_STORAGE_KEY = 'melodify_auth_user';
const VISITOR_ID_STORAGE_KEY = 'melodify_visitor_id';
const pendingGets = new Map<string, Promise<unknown>>();

let tokenValue: string | null | undefined;
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

export type VipPaymentMethod =
  | 'card'
  | 'shopeepay'
  | 'atm'
  | 'momo'
  | 'zalopay'
  | 'vnpay'
  | 'viettelpay';

export type VipCheckoutOrder = {
  payment_id: string;
  payment_code: string;
  amount: number;
  currency: string;
  method: VipPaymentMethod;
  status: 'pending' | string;
  plan: { id: string; name: string };
  requires_gateway_confirmation: boolean;
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
  tokenValue = await readAppValue(AUTH_TOKEN_STORAGE_KEY);
  return tokenValue;
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
  tokenValue = auth.token;
  await writeAppValue(AUTH_TOKEN_STORAGE_KEY, auth.token);
  await writeAppValue(AUTH_USER_STORAGE_KEY, JSON.stringify(auth.user));
}

export async function clearAuthSession(): Promise<void> {
  tokenValue = null;
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

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase();
  const token = await getAuthToken();
  const requestKey = (token ?? '') + ':' + path;
  if (method === 'GET') {
    const pending = pendingGets.get(requestKey);
    if (pending) {
      return pending as Promise<T>;
    }
  }

  const request = (async () => {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(init.headers as Record<string, string> | undefined),
    };
    if (typeof init.body === 'string' && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(API_URL + path, { ...init, headers });
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
    if (response.status === 204) {
      return undefined as T;
    }
    return response.json() as Promise<T>;
  })();

  if (method !== 'GET') {
    return request;
  }
  pendingGets.set(requestKey, request);
  try {
    return await request;
  } finally {
    if (pendingGets.get(requestKey) === request) {
      pendingGets.delete(requestKey);
    }
  }
}

function jsonRequest(body: unknown): RequestInit {
  return { method: 'POST', body: JSON.stringify(body) };
}

export function getHomeBootstrap() {
  return apiFetch<{ data: HomeBootstrap; meta: { date: string; refresh_minutes: number } }>('/v1/home/bootstrap');
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

export function searchCatalog(query: string, type: SearchKind = 'all', page = 1) {
  const params = new URLSearchParams({ q: query.trim(), type, page: String(page) });
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

export function createUserPlaylist(name: string) {
  return apiFetch<{ data: { id: string; name: string; slug: string; cover_url: string | null; song_count: number } }>(
    '/v1/me/playlists',
    jsonRequest({ name }),
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

export async function getAudioSource(song: Song) {
  const identifier = song.slug || song.id;
  let uri = song.audio_url || song.stream_url || song.source_url || song.preview_url;
  if (!uri) {
    uri = API_URL + '/v1/songs/' + encodeURIComponent(identifier) + '/audio';
  } else if (uri.startsWith('/v1/')) {
    uri = API_URL + uri;
  } else if (uri.startsWith('/')) {
    uri = API_URL.replace(/\/api$/, '') + uri;
  }
  const token = await getAuthToken();
  const headers = token && uri.startsWith(API_URL) ? { Authorization: 'Bearer ' + token } : undefined;
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

export function createVipCheckout(planId: string, method: VipPaymentMethod) {
  return apiFetch<{ message: string; data: VipCheckoutOrder }>(
    '/v1/vip/checkout',
    jsonRequest({ plan_id: planId, method }),
  );
}

export function getVipTransactions(page = 1) {
  return apiFetch<VipTransactionHistory>('/v1/vip/transactions?page=' + page);
}
