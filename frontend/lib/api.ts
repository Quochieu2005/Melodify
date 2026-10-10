const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

export type Lyric = {
  id: string;
  song_id: string;
  language: string;
  content: string;
  is_synced: boolean;
};

export type Song = {
  id: string;
  title: string;
  slug: string | null;
  duration_seconds: number | null;
  artist: { id: string | null; name: string } | null;
  artists?: SongArtistCredit[];
  album?: { id: string; title: string } | null;
  genre?: { id: string; name: string } | null;
  topics?: { id: string; name: string; type: string | null }[];
  playlists?: { id: string; name: string }[];
  audio_url?: string | null;
  stream_url?: string | null;
  preview_url: string | null;
  source_url?: string | null;
  itunes_url?: string | null;
  external_source?: string | null;
  cover_url?: string | null;
  external_id?: string | null;
  status?: string;
  views?: number;
  favorites?: number;
  shares?: number;
  favorite_count?: number;
  share_count?: number;
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
};

export type Artist = {
  id: string;
  name: string;
  slug: string | null;
  bio: string | null;
  avatar_url: string | null;
  verified: boolean;
  status: string;
};

export type SongArtistCredit = {
  id: string | null;
  name: string;
  slug?: string | null;
  avatar_url?: string | null;
};

export type AlbumRecord = {
  id: string;
  title: string;
  slug: string | null;
  artist_id: string | null;
  artist: Artist | null;
  release_date: string | null;
  cover_url: string | null;
  status: string;
  song_count: number;
};

export type AlbumDetail = AlbumRecord & {
  songs: Song[];
};

export type Banner = {
  id: string;
  title: string;
  slug: string | null;
  image_url: string | null;
  link_url: string | null;
  sort_order: number;
  status: string;
};

export type TopicRecord = {
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
};

export type GenreRecord = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  status: string;
  song_count: number;
};

type PaginatedResponse<T> = {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
};

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
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
  created_at: string | null;
  google_connected: boolean;
  facebook_connected: boolean;
  last_login_at: string | null;
  last_login_method: string | null;
};

export type AuthResponse = {
  message: string;
  token: string;
  token_type: 'Bearer' | string;
  expires_at: string;
  remembered?: boolean;
  user: AuthUser;
};

export type QrLoginStartResponse = {
  session_id: string;
  qr_payload: string;
  poll_token: string;
  status: 'pending' | 'approved' | 'completed' | 'expired';
  expires_at: string;
  poll_interval_seconds: number;
};

export type QrLoginStatusResponse = {
  message?: string;
  status: 'pending' | 'approved' | 'completed' | 'expired';
  token?: string;
  token_type?: string;
  expires_at?: string;
  remembered?: boolean;
  user?: AuthUser;
};

export type SocialProvider = 'google' | 'facebook';

export const AUTH_TOKEN_STORAGE_KEY = 'melodify_access_token';
export const AUTH_USER_STORAGE_KEY = 'melodify_auth_user';

export function saveAuthSession(auth: AuthResponse): void {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, auth.token);
  window.localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(auth.user));
  window.dispatchEvent(new Event('melodify-auth-changed'));
}

export function clearAuthSession(): void {
  if (typeof window === 'undefined') return;

  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
  window.dispatchEvent(new Event('melodify-auth-changed'));
}

function jsonRequest(body: unknown): RequestInit {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

export function loginWithPassword(identifier: string, password: string, remember: boolean) {
  return apiFetch<AuthResponse>('/v1/auth/login', jsonRequest({
    identifier,
    password,
    remember,
    device_name: 'melodify-web',
  }));
}

export function requestPhoneOtp(phone: string) {
  return apiFetch<{ message: string; data: { phone: string; expires_at: string; resend_after_seconds: number } }>(
    '/v1/auth/phone/request-otp',
    jsonRequest({ phone }),
  );
}

export function loginWithPhone(phone: string, code: string, remember: boolean) {
  return apiFetch<AuthResponse>('/v1/auth/phone/verify', jsonRequest({
    phone,
    code,
    remember,
    device_name: 'melodify-web',
  }));
}

export function loginWithSocial(provider: SocialProvider, accessToken: string, remember: boolean) {
  return apiFetch<AuthResponse>('/v1/auth/social', jsonRequest({
    provider,
    access_token: accessToken,
    remember,
    device_name: 'melodify-web',
  }));
}

export function startQrLogin(remember: boolean) {
  return apiFetch<QrLoginStartResponse>('/v1/auth/qr/start', jsonRequest({
    remember,
    device_name: 'melodify-web',
  }));
}

export function getQrLoginStatus(sessionId: string, pollToken: string) {
  return apiFetch<QrLoginStatusResponse>(
    `/v1/auth/qr/${encodeURIComponent(sessionId)}/status?poll_token=${encodeURIComponent(pollToken)}`,
  );
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const storedToken = typeof window !== 'undefined'
    ? window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
    : null;
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(storedToken ? { Authorization: `Bearer ${storedToken}` } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(response.status, body.message ?? "API request failed");
  }

  return response.json() as Promise<T>;
}

export async function uploadImage(file: File) {
  const form = new FormData();
  form.append('image', file);
  return apiFetch<{ data: { public_id: string; url: string; width: number; height: number; format: string } }>(
    '/media/images', { method: 'POST', body: form },
  );
}

export async function listSongs(options: { query?: string; perPage?: number } = {}) {
  const params = new URLSearchParams();

  if (options.query?.trim()) {
    params.set('q', options.query.trim());
  }

  if (options.perPage) {
    params.set('per_page', String(options.perPage));
  }

  const query = params.toString();
  return apiFetch<PaginatedResponse<Song>>(`/v1/songs${query ? `?${query}` : ''}`);
}

export async function getSong(songId: string) {
  return apiFetch<{ data: Song & { lyrics: Lyric[] } }>(`/v1/songs/${encodeURIComponent(songId)}`);
}

export async function getSongLyrics(songId: string, language?: string) {
  const query = language ? `?language=${encodeURIComponent(language)}` : '';
  return apiFetch<{ data: Lyric[]; meta: { song_id: string; language: string | null } }>(
    `/v1/songs/${encodeURIComponent(songId)}/lyrics${query}`,
  );
}

export async function recordSongView(songId: string, visitorId?: string) {
  return apiFetch<{ recorded: boolean; views: number }>(
    `/v1/songs/${encodeURIComponent(songId)}/view`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(visitorId ? { visitor_id: visitorId } : {}),
    },
  );
}

export async function toggleSongFavorite(songId: string, visitorId?: string) {
  return apiFetch<{ favorited: boolean; favorites: number }>(
    `/v1/songs/${encodeURIComponent(songId)}/favorite`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(visitorId ? { visitor_id: visitorId } : {}),
    },
  );
}

export async function recordSongShare(songId: string, source = 'web', visitorId?: string) {
  return apiFetch<{ recorded: boolean; shares: number }>(
    `/v1/songs/${encodeURIComponent(songId)}/share`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source, ...(visitorId ? { visitor_id: visitorId } : {}) }),
    },
  );
}

export async function listPopularSongs(options: { query?: string; period?: 'all' | '7' | '30'; sort?: 'views' | 'favorites' | 'shares'; limit?: number } = {}) {
  const params = new URLSearchParams();
  if (options.query?.trim()) params.set('q', options.query.trim());
  if (options.period) params.set('period', options.period);
  if (options.sort) params.set('sort', options.sort);
  if (options.limit) params.set('limit', String(options.limit));

  const query = params.toString();
  return apiFetch<{ data: Song[]; meta: { total: number; period: string; source: string } }>(
    `/v1/songs/popular${query ? `?${query}` : ''}`,
  );
}

export async function listBanners(options: { query?: string; perPage?: number; daily?: boolean; limit?: number } = {}) {
  const params = new URLSearchParams();

  if (options.query?.trim()) params.set('q', options.query.trim());
  if (options.perPage) params.set('per_page', String(options.perPage));
  if (options.daily) params.set('daily', '1');
  if (options.limit) params.set('limit', String(options.limit));

  const query = params.toString();
  return apiFetch<PaginatedResponse<Banner>>(`/v1/banners${query ? `?${query}` : ''}`);
}

export async function listTopics(options: { query?: string; perPage?: number } = {}) {
  const params = new URLSearchParams();

  if (options.query?.trim()) params.set('q', options.query.trim());
  params.set('per_page', String(options.perPage ?? 50));

  const query = params.toString();
  return apiFetch<PaginatedResponse<TopicRecord>>(`/v1/topics${query ? `?${query}` : ''}`);
}

export async function listGenres(options: { query?: string; perPage?: number } = {}) {
  const params = new URLSearchParams();

  if (options.query?.trim()) params.set('q', options.query.trim());
  params.set('per_page', String(options.perPage ?? 50));

  const query = params.toString();
  return apiFetch<PaginatedResponse<GenreRecord>>(`/v1/genres${query ? `?${query}` : ''}`);
}

export async function listPlaylists(options: { query?: string; type?: string; perPage?: number } = {}) {
  const params = new URLSearchParams();

  if (options.query?.trim()) params.set('q', options.query.trim());
  if (options.type?.trim()) params.set('type', options.type.trim());
  if (options.perPage) params.set('per_page', String(options.perPage));

  const query = params.toString();
  return apiFetch<PaginatedResponse<Playlist>>(`/v1/playlists${query ? `?${query}` : ''}`);
}

export async function listAlbums(options: { query?: string; page?: number; perPage?: number } = {}) {
  const params = new URLSearchParams();

  if (options.query?.trim()) params.set('q', options.query.trim());
  if (options.page) params.set('page', String(options.page));
  if (options.perPage) params.set('per_page', String(options.perPage));

  const query = params.toString();
  return apiFetch<PaginatedResponse<AlbumRecord>>(`/v1/albums${query ? `?${query}` : ''}`);
}

export async function getAlbum(slug: string) {
  return apiFetch<{ data: AlbumDetail }>(`/v1/albums/${encodeURIComponent(slug)}`);
}

export async function getPlaylist(playlistId: string) {
  return apiFetch<{ data: Playlist }>(`/v1/playlists/${encodeURIComponent(playlistId)}`);
}

export async function listArtists(options: { query?: string; perPage?: number } = {}) {
  const params = new URLSearchParams();
  if (options.query?.trim()) params.set('q', options.query.trim());
  if (options.perPage) params.set('per_page', String(options.perPage));

  const query = params.toString();
  return apiFetch<PaginatedResponse<Artist>>(`/v1/artists${query ? `?${query}` : ''}`);
}

export async function getArtist(artistId: string) {
  return apiFetch<{ data: Artist }>(`/v1/artists/${encodeURIComponent(artistId)}`);
}
