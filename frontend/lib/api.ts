const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";
let inMemoryVisitorId: string | null = null;

export type Lyric = {
  id: string;
  song_id: string;
  language: string;
  content: string;
  is_synced: boolean;
  plain_lyrics?: string | null;
  synced_lyrics?: string | null;
};

export type Song = {
  id: string;
  title: string;
  slug: string | null;
  duration_seconds: number | null;
  artist: { id: string | null; name: string } | null;
  artists?: SongArtistCredit[];
  publisher?: string | null;
  release_date?: string | null;
  premium_only?: boolean;
  has_full_audio?: boolean;
  album?: { id: string; title: string } | null;
  genre?: { id: string; name: string } | null;
  topics?: { id: string; name: string; type: string | null }[];
  playlists?: { id: string; name: string }[];
  audio_url?: string | null;
  stream_url?: string | null;
  video_url?: string | null;
  videos?: SongVideo[];
  preview_url: string | null;
  source_url?: string | null;
  itunes_url?: string | null;
  external_source?: string | null;
  country_code?: string | null;
  country?: string | null;
  cover_url?: string | null;
  external_id?: string | null;
  status?: string;
  is_featured?: number;
  is_hot?: number;
  preview_limit_seconds?: number | null;
  views?: number;
  favorites?: number;
  shares?: number;
  favorite_count?: number;
  share_count?: number;
  is_favorite?: boolean;
};

export type Playlist = {
  id: string;
  name: string;
  slug: string | null;
  type: string | null;
  type_custom: string | null;
  description: string | null;
  cover_url: string | null;
  visibility: "public" | "private" | "unlisted";
  is_system: boolean;
  sort_order: number;
  status: string;
  song_count: number;
  artist_ids?: string[];
  artists?: SongArtistCredit[];
  genre_ids?: string[];
  topic_ids?: string[];
  songs?: Song[];
  favorite_count?: number;
  share_count?: number;
  is_favorite?: boolean;
};

export type HomeDiscovery = {
  single_new_releases: Song[];
  popular_songs: Song[];
};

export type ChartSong = Song & {
  rank: number;
  trend: "up" | "down" | "same";
};

export type ChartRecord = {
  id: string;
  slug: string;
  title: string;
  tone: "rose" | "olive" | "purple";
  description: string | null;
  cover_url: string | null;
  date: string;
  updated_at: string | null;
  song_count: number;
  share_count?: number;
  songs: ChartSong[];
};

export type SubscriptionPlanRecord = {
  id: string;
  name: string;
  slug: string | null;
  price: number;
  billing_cycle: "monthly" | "yearly" | string;
  billing_months: number;
  description: string | null;
  offline_download: boolean;
  ads_enabled: boolean;
  unlimited_skip: boolean;
};

export type VipPaymentMethod =
  "card" | "shopeepay" | "atm" | "momo" | "zalopay" | "vnpay" | "viettelpay";

export type VipCheckoutOrder = {
  payment_id: string;
  payment_code: string;
  amount: number;
  currency: string;
  method: VipPaymentMethod;
  status: "pending";
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
  user: { id: string; name: string; username: string; email: string; phone: string };
  data: VipTransactionRecord[];
  meta: { current_page: number; last_page: number; total: number };
};

export type HomeBootstrap = {
  banners: Banner[];
  topics: TopicRecord[];
  genres: GenreRecord[];
  albums: AlbumRecord[];
  playlists: Playlist[];
  discovery: HomeDiscovery;
};

export type Artist = {
  id: string;
  name: string;
  real_name?: string | null;
  slug: string | null;
  bio: string | null;
  avatar_url: string | null;
  verified: boolean;
  status: string;
};

export type ArtistDetail = Artist & {
  songs?: Song[];
  featured_songs?: Song[];
  song_count?: number;
  featured_song_count?: number;
  followers_count?: number;
  albums?: AlbumRecord[];
  playlists?: Playlist[];
  videos?: SongVideo[];
};

export type SongArtistCredit = {
  id: string | null;
  name: string;
  slug?: string | null;
  avatar_url?: string | null;
  country_code?: string | null;
  country?: string | null;
};

export type SongVideo = {
  id: string;
  title: string;
  slug?: string | null;
  video_url: string | null;
  thumbnail_url?: string | null;
  duration_seconds?: number | null;
  source?: string | null;
  external_id?: string | null;
  external_source?: string | null;
  source_url?: string | null;
  embed_url?: string | null;
  watch_url?: string | null;
  player_type?: "native" | "youtube" | string | null;
  youtube_video_id?: string | null;
  artist_ids?: string[];
  artists?: SongArtistCredit[];
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
  favorite_count?: number;
  share_count?: number;
  is_favorite?: boolean;
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
  constructor(
    public status: number,
    message: string,
  ) {
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
  token_type: "Bearer" | string;
  expires_at: string;
  remembered?: boolean;
  user: AuthUser;
};

export type QrLoginStartResponse = {
  session_id: string;
  qr_payload: string;
  poll_token: string;
  status: "pending" | "approved" | "completed" | "expired";
  expires_at: string;
  poll_interval_seconds: number;
};

export type QrLoginStatusResponse = {
  message?: string;
  status: "pending" | "approved" | "completed" | "expired";
  token?: string;
  token_type?: string;
  expires_at?: string;
  remembered?: boolean;
  user?: AuthUser;
};

export type SocialProvider = "google" | "facebook";

export const AUTH_TOKEN_STORAGE_KEY = "melodify_access_token";
export const AUTH_USER_STORAGE_KEY = "melodify_auth_user";
const inFlightGetRequests = new Map<string, Promise<unknown>>();
const songFavoriteStates = new Map<string, boolean>();

function rememberSongFavorite(songId: string, favorited: boolean) {
  songFavoriteStates.set(songId, favorited);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("melodify:song-favorite", { detail: { songId, favorited } }));
  }
}

export function getCachedSongFavorite(songId: string) {
  return songFavoriteStates.get(songId);
}

export function saveAuthSession(auth: AuthResponse): void {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, auth.token);
  window.localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(auth.user));
  window.dispatchEvent(new Event("melodify-auth-changed"));
}

export function clearAuthSession(): void {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
  window.dispatchEvent(new Event("melodify-auth-changed"));
}

function jsonRequest(body: unknown): RequestInit {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export function loginWithPassword(
  identifier: string,
  password: string,
  remember: boolean,
) {
  return apiFetch<AuthResponse>(
    "/v1/auth/login",
    jsonRequest({
      identifier,
      password,
      remember,
      device_name: "melodify-web",
    }),
  );
}

export function requestPhoneOtp(phone: string) {
  return apiFetch<{
    message: string;
    data: { phone: string; expires_at: string; resend_after_seconds: number };
  }>("/v1/auth/phone/request-otp", jsonRequest({ phone }));
}

export function loginWithPhone(phone: string, code: string, remember: boolean) {
  return apiFetch<AuthResponse>(
    "/v1/auth/phone/verify",
    jsonRequest({
      phone,
      code,
      remember,
      device_name: "melodify-web",
    }),
  );
}

export function loginWithSocial(
  provider: SocialProvider,
  accessToken: string,
  remember: boolean,
) {
  return apiFetch<AuthResponse>(
    "/v1/auth/social",
    jsonRequest({
      provider,
      access_token: accessToken,
      remember,
      device_name: "melodify-web",
    }),
  );
}

export function startQrLogin(remember: boolean) {
  return apiFetch<QrLoginStartResponse>(
    "/v1/auth/qr/start",
    jsonRequest({
      remember,
      device_name: "melodify-web",
    }),
  );
}

export function getQrLoginStatus(sessionId: string, pollToken: string) {
  return apiFetch<QrLoginStatusResponse>(
    `/v1/auth/qr/${encodeURIComponent(sessionId)}/status?poll_token=${encodeURIComponent(pollToken)}`,
  );
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const storedToken =
    typeof window !== "undefined"
      ? window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
      : null;
  const method = (init?.method ?? "GET").toUpperCase();
  const requestKey = `${storedToken ?? ""}:${path}`;

  if (method === "GET") {
    const pending = inFlightGetRequests.get(requestKey);
    if (pending) return pending as Promise<T>;
  }

  const request = (async () => {
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
  })();

  if (method !== "GET") return request;

  inFlightGetRequests.set(requestKey, request);
  try {
    return await request;
  } finally {
    if (inFlightGetRequests.get(requestKey) === request) {
      inFlightGetRequests.delete(requestKey);
    }
  }
}

export function getSubscriptionPlans() {
  return apiFetch<{ data: SubscriptionPlanRecord[] }>("/v1/subscription-plans");
}

export function createVipCheckout(planId: string, method: VipPaymentMethod) {
  return apiFetch<{ message: string; data: VipCheckoutOrder }>(
    "/v1/vip/checkout",
    jsonRequest({ plan_id: planId, method }),
  );
}

export function getVipTransactionHistory(page = 1) {
  return apiFetch<VipTransactionHistory>(`/v1/vip/transactions?page=${page}`);
}

let homeBootstrapPromise: Promise<{
  data: HomeBootstrap;
  meta: { date: string; refresh_minutes: number };
}> | null = null;

export function getHomeBootstrap(options: { force?: boolean } = {}) {
  if (options.force || !homeBootstrapPromise) {
    homeBootstrapPromise = apiFetch<{
      data: HomeBootstrap;
      meta: { date: string; refresh_minutes: number };
    }>("/v1/home/bootstrap").catch((error) => {
      homeBootstrapPromise = null;
      throw error;
    });
  }

  return homeBootstrapPromise;
}

export async function uploadImage(file: File) {
  const form = new FormData();
  form.append("image", file);
  return apiFetch<{
    data: {
      public_id: string;
      url: string;
      width: number;
      height: number;
      format: string;
    };
  }>("/media/images", { method: "POST", body: form });
}

export async function listSongs(
  options: { query?: string; perPage?: number } = {},
) {
  const params = new URLSearchParams();

  if (options.query?.trim()) {
    params.set("q", options.query.trim());
  }

  if (options.perPage) {
    params.set("per_page", String(options.perPage));
  }

  const query = params.toString();
  return apiFetch<PaginatedResponse<Song>>(
    `/v1/songs${query ? `?${query}` : ""}`,
  );
}

export function listFavoriteSongs(visitorId?: string) {
  const query = visitorId ? `?visitor_id=${encodeURIComponent(visitorId)}` : "";
  return apiFetch<{ data: Song[]; meta: { total: number } }>(
    `/v1/favorites/songs${query}`,
  );
}

export async function getSong(songId: string, visitorId?: string) {
  const query = visitorId ? `?visitor_id=${encodeURIComponent(visitorId)}` : "";
  const response = await apiFetch<{ data: Song & { lyrics: Lyric[] } }>(
    `/v1/songs/${encodeURIComponent(songId)}${query}`,
  );
  if (typeof response.data.is_favorite === "boolean") {
    rememberSongFavorite(response.data.id, response.data.is_favorite);
  }
  return response;
}

export async function listVideos(
  options: { query?: string; page?: number; perPage?: number } = {},
) {
  const params = new URLSearchParams();
  if (options.query?.trim()) params.set("q", options.query.trim());
  if (options.page) params.set("page", String(options.page));
  if (options.perPage) params.set("per_page", String(options.perPage));

  const query = params.toString();
  return apiFetch<PaginatedResponse<SongVideo>>(
    `/v1/videos${query ? `?${query}` : ""}`,
  );
}

export async function getVideo(slug: string) {
  return apiFetch<{ data: SongVideo }>(
    `/v1/videos/${encodeURIComponent(slug)}`,
  );
}

export async function getSongLyrics(songId: string, language?: string) {
  const query = language ? `?language=${encodeURIComponent(language)}` : "";
  return apiFetch<{
    data: Lyric[];
    meta: { song_id: string; language: string | null };
  }>(`/v1/songs/${encodeURIComponent(songId)}/lyrics${query}`);
}

export async function recordSongView(
  songId: string,
  visitorId?: string,
  source = "player",
) {
  return apiFetch<{ recorded: boolean; views: number }>(
    `/v1/songs/${encodeURIComponent(songId)}/view`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(visitorId ? { visitor_id: visitorId } : {}),
        source,
      }),
    },
  );
}

export async function toggleSongFavorite(songId: string, visitorId?: string) {
  const response = await apiFetch<{ favorited: boolean; favorites: number }>(
    `/v1/songs/${encodeURIComponent(songId)}/favorite`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(visitorId ? { visitor_id: visitorId } : {}),
    },
  );
  rememberSongFavorite(songId, response.favorited);
  return response;
}

export async function setSongFavorite(songId: string, favorited: boolean, visitorId?: string) {
  const response = await apiFetch<{ favorited: boolean; favorites: number }>(
    `/v1/songs/${encodeURIComponent(songId)}/favorite`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ favorited, ...(visitorId ? { visitor_id: visitorId } : {}) }),
    },
  );
  rememberSongFavorite(songId, response.favorited);
  return response;
}

export async function recordSongShare(
  songId: string,
  source = "web",
  visitorId?: string,
) {
  return apiFetch<{ recorded: boolean; shares: number }>(
    `/v1/songs/${encodeURIComponent(songId)}/share`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source,
        ...(visitorId ? { visitor_id: visitorId } : {}),
      }),
    },
  );
}

export async function listPopularSongs(
  options: {
    query?: string;
    period?: "all" | "7" | "30";
    sort?: "views" | "favorites" | "shares";
    limit?: number;
  } = {},
) {
  const params = new URLSearchParams();
  if (options.query?.trim()) params.set("q", options.query.trim());
  if (options.period) params.set("period", options.period);
  if (options.sort) params.set("sort", options.sort);
  if (options.limit) params.set("limit", String(options.limit));

  const query = params.toString();
  return apiFetch<{
    data: Song[];
    meta: { total: number; period: string; source: string };
  }>(`/v1/songs/popular${query ? `?${query}` : ""}`);
}

export async function listBanners(
  options: {
    query?: string;
    perPage?: number;
    daily?: boolean;
    limit?: number;
  } = {},
) {
  const params = new URLSearchParams();

  if (options.query?.trim()) params.set("q", options.query.trim());
  if (options.perPage) params.set("per_page", String(options.perPage));
  if (options.daily) params.set("daily", "1");
  if (options.limit) params.set("limit", String(options.limit));

  const query = params.toString();
  return apiFetch<PaginatedResponse<Banner>>(
    `/v1/banners${query ? `?${query}` : ""}`,
  );
}

export async function listTopics(
  options: { query?: string; perPage?: number } = {},
) {
  const params = new URLSearchParams();

  if (options.query?.trim()) params.set("q", options.query.trim());
  params.set("per_page", String(options.perPage ?? 50));

  const query = params.toString();
  return apiFetch<PaginatedResponse<TopicRecord>>(
    `/v1/topics${query ? `?${query}` : ""}`,
  );
}

export async function listGenres(
  options: { query?: string; perPage?: number } = {},
) {
  const params = new URLSearchParams();

  if (options.query?.trim()) params.set("q", options.query.trim());
  params.set("per_page", String(options.perPage ?? 50));

  const query = params.toString();
  return apiFetch<PaginatedResponse<GenreRecord>>(
    `/v1/genres${query ? `?${query}` : ""}`,
  );
}

export async function listPlaylists(
  options: {
    query?: string;
    type?: string;
    topic?: string;
    genre?: string;
    page?: number;
    perPage?: number;
  } = {},
) {
  const params = new URLSearchParams();

  if (options.query?.trim()) params.set("q", options.query.trim());
  if (options.type?.trim()) params.set("type", options.type.trim());
  if (options.topic?.trim()) params.set("topic", options.topic.trim());
  if (options.genre?.trim()) params.set("genre", options.genre.trim());
  if (options.page) params.set("page", String(options.page));
  if (options.perPage) params.set("per_page", String(options.perPage));

  const query = params.toString();
  return apiFetch<PaginatedResponse<Playlist>>(
    `/v1/playlists${query ? `?${query}` : ""}`,
  );
}

export async function getHomeDiscovery() {
  return apiFetch<{
    data: HomeDiscovery;
    meta: { date: string; refresh_minutes: number };
  }>("/v1/home/discovery");
}

export async function listCharts() {
  return apiFetch<{
    data: ChartRecord[];
    meta: { date: string; refresh_minutes: number; source: string };
  }>("/v1/charts");
}

export async function getChart(slug: string) {
  return apiFetch<{
    data: ChartRecord;
    meta: { date: string; refresh_minutes: number; source: string };
  }>(`/v1/charts/${encodeURIComponent(slug)}`);
}

export function recordChartShare(chartSlug: string, source: "facebook" | "copy_link" | "web", visitorId?: string) {
  return apiFetch<{ recorded: boolean; shares: number }>(
    `/v1/charts/${encodeURIComponent(chartSlug)}/share`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, ...(visitorId ? { visitor_id: visitorId } : {}) }),
    },
  );
}

export async function listAlbums(
  options: { query?: string; page?: number; perPage?: number } = {},
) {
  const params = new URLSearchParams();

  if (options.query?.trim()) params.set("q", options.query.trim());
  if (options.page) params.set("page", String(options.page));
  if (options.perPage) params.set("per_page", String(options.perPage));

  const query = params.toString();
  return apiFetch<PaginatedResponse<AlbumRecord>>(
    `/v1/albums${query ? `?${query}` : ""}`,
  );
}

export async function getAlbum(slug: string, visitorId?: string) {
  const query = visitorId ? `?visitor_id=${encodeURIComponent(visitorId)}` : "";
  return apiFetch<{ data: AlbumDetail }>(
    `/v1/albums/${encodeURIComponent(slug)}${query}`,
  );
}

export function toggleAlbumFavorite(albumId: string, visitorId?: string) {
  return apiFetch<{ favorited: boolean; favorites: number }>(
    `/v1/albums/${encodeURIComponent(albumId)}/favorite`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(visitorId ? { visitor_id: visitorId } : {}),
    },
  );
}

export function recordAlbumShare(albumId: string, source: "facebook" | "copy_link" | "web", visitorId?: string) {
  return apiFetch<{ recorded: boolean; shares: number }>(
    `/v1/albums/${encodeURIComponent(albumId)}/share`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, ...(visitorId ? { visitor_id: visitorId } : {}) }),
    },
  );
}

export async function getTopic(slug: string) {
  return apiFetch<{ data: TopicRecord & { songs?: Song[] } }>(
    `/v1/topics/${encodeURIComponent(slug)}`,
  );
}

export async function getGenre(slug: string) {
  return apiFetch<{ data: GenreRecord & { songs?: Song[] } }>(
    `/v1/genres/${encodeURIComponent(slug)}`,
  );
}

export async function getPlaylist(playlistId: string, visitorId?: string) {
  const query = visitorId ? `?visitor_id=${encodeURIComponent(visitorId)}` : "";
  return apiFetch<{ data: Playlist }>(
    `/v1/playlists/${encodeURIComponent(playlistId)}${query}`,
  );
}

export function getVisitorId() {
  if (typeof window === "undefined") return "";
  if (inMemoryVisitorId) return inMemoryVisitorId;

  const storageKey = "melodify_visitor_id";
  try {
    const storedVisitorId = window.localStorage.getItem(storageKey);
    if (storedVisitorId) {
      inMemoryVisitorId = storedVisitorId;
      return storedVisitorId;
    }
  } catch {
    // Continue with a temporary ID when browser storage is unavailable.
  }

  const visitorId = window.crypto?.randomUUID?.()
    ?? `visitor-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  inMemoryVisitorId = visitorId;

  try {
    window.localStorage.setItem(storageKey, visitorId);
  } catch {
    // The current page can still use this ID even when storage is blocked.
  }

  return visitorId;
}

export async function togglePlaylistFavorite(playlistId: string, visitorId?: string) {
  return apiFetch<{ favorited: boolean; favorites: number }>(
    `/v1/playlists/${encodeURIComponent(playlistId)}/favorite`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(visitorId ? { visitor_id: visitorId } : {}),
    },
  );
}

export async function recordPlaylistShare(
  playlistId: string,
  source: "facebook" | "copy_link",
  visitorId?: string,
) {
  return apiFetch<{ recorded: boolean; shares: number }>(
    `/v1/playlists/${encodeURIComponent(playlistId)}/share`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source,
        ...(visitorId ? { visitor_id: visitorId } : {}),
      }),
    },
  );
}

export async function listArtists(
  options: { query?: string; perPage?: number } = {},
) {
  const params = new URLSearchParams();
  if (options.query?.trim()) params.set("q", options.query.trim());
  if (options.perPage) params.set("per_page", String(options.perPage));

  const query = params.toString();
  return apiFetch<PaginatedResponse<Artist>>(
    `/v1/artists${query ? `?${query}` : ""}`,
  );
}

export async function getArtist(
  artistId: string,
  options: { summary?: boolean } = {},
) {
  const query = options.summary ? "?summary=1" : "";
  return apiFetch<{ data: ArtistDetail }>(
    `/v1/artists/${encodeURIComponent(artistId)}${query}`,
  );
}
