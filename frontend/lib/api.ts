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
  release_date?: string | null;
  premium_only?: boolean;
  has_full_audio?: boolean;
  audio_quality?: string | null;
  audio_qualities?: SongAudioQuality[];
  download_url?: string | null;
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
  can_edit?: boolean;
};

export type UserPlaylistSummary = {
  id: string;
  name: string;
  slug: string;
  cover_url: string | null;
  song_count: number;
  visibility: "public" | "private" | "unlisted";
};

export type UserUploadSummary = {
  id: string;
  title: string;
  slug: string;
  status: string;
  artist_name: string | null;
  cover_url: string | null;
  audio_url: string | null;
  duration_seconds: number | null;
  created_at: string | null;
  moderation_note?: string | null;
};

export type StagedUserAudio = {
  upload_token: string;
  file_name: string;
  file_size: number;
  duration_seconds: number | null;
};

export type SongReportReason =
  | "incorrect_audio"
  | "incorrect_information"
  | "duplicate"
  | "inappropriate"
  | "copyright"
  | "other";

export type VideoReportReason =
  | "incorrect_video"
  | "incorrect_information"
  | "duplicate"
  | "inappropriate"
  | "copyright"
  | "other";

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

export type VipPaymentMethod = "momo" | "vnpay" | "zalopay";

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
  status: "pending";
  checkout_url: string;
  plan: { id: string; name: string };
};

export type VipPaymentStatus = {
  payment_code: string;
  status: "pending" | "processing" | "success" | "failed" | "cancelled" | string;
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
};

export type VipTransactionHistory = {
  user: { id: string; name: string; username: string; email: string; phone: string };
  data: VipTransactionRecord[];
  meta: { current_page: number; last_page: number; total: number };
};

export type HomeBootstrap = {
  banners: Banner[];
  charts: ChartRecord[];
  topics: TopicRecord[];
  genres: GenreRecord[];
  albums: AlbumRecord[];
  playlists: Playlist[];
  discovery: HomeDiscovery;
  trending_artists: HomeTrendingArtist[];
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
};

export type HomeTrendingArtist = Artist & {
  weekly_plays: number;
  weekly_views: number;
  trending_score: number;
  ranking_source: 'weekly' | 'catalog';
  featured_song: (Pick<Song, "id" | "slug" | "title" | "cover_url" | "publisher"> & Pick<Song, "artist" | "artists"> & { weekly_plays: number }) | null;
};

export type TrendingArtistsResponse = {
  data: HomeTrendingArtist[];
  meta: { date: string; limit: number; period_days: number; source: 'weekly' | 'catalog'; total: number };
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
  view_count?: number;
  favorite_count?: number;
  share_count?: number;
  is_favorite?: boolean;
  can_download?: boolean;
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
export const AUTH_REQUIRED_EVENT = "melodify-auth-required";
const LIBRARY_IMPORT_SESSION_KEY = "melodify_library_imported";
const HOME_BOOTSTRAP_PERSISTED_CACHE_KEY = `melodify:public-cache:v1:${API_URL}:home-bootstrap`;
const HOME_BOOTSTRAP_PERSISTED_MAX_AGE = 24 * 60 * 60 * 1_000;
const CATALOG_PERSISTED_CACHE_PREFIX = `melodify:public-cache:v1:${API_URL}:endpoint:`;
const CATALOG_PERSISTED_MAX_AGE = 24 * 60 * 60 * 1_000;
const CATALOG_PERSISTED_MAX_ENTRIES = 12;
const CATALOG_PERSISTED_MAX_CHARS = 1_500_000;
const CATALOG_RESPONSE_EVENT = "melodify-catalog-response";
const PERSISTED_CATALOG_PATHS = new Set([
  "/v1/banners?daily=1&limit=5",
  "/v1/topics?per_page=20",
  "/v1/genres?per_page=20",
  "/v1/albums?per_page=12",
  "/v1/playlists?per_page=20",
  "/v1/home/discovery",
  "/v1/charts",
  "/v1/artists/trending",
]);
const inFlightGetRequests = new Map<string, Promise<unknown>>();
const catalogResponseCache = new Map<string, { expiresAt: number; staleUntil: number; value: unknown }>();
let catalogCacheGeneration = 0;

function clearCatalogResponseCache() {
  catalogCacheGeneration += 1;
  catalogResponseCache.clear();
  inFlightGetRequests.clear();
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(HOME_BOOTSTRAP_PERSISTED_CACHE_KEY);
    } catch {
      // Browser storage may be disabled or full; the in-memory cache still works.
    }
  }
}

function readPersistedHomeBootstrapCache(): { savedAt: number; value: unknown } | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(HOME_BOOTSTRAP_PERSISTED_CACHE_KEY);
    if (!raw) return null;

    const cached = JSON.parse(raw) as { savedAt?: unknown; value?: unknown };
    if (typeof cached.savedAt !== "number" || !("value" in cached)) {
      window.localStorage.removeItem(HOME_BOOTSTRAP_PERSISTED_CACHE_KEY);
      return null;
    }

    if (Date.now() - cached.savedAt > HOME_BOOTSTRAP_PERSISTED_MAX_AGE) {
      window.localStorage.removeItem(HOME_BOOTSTRAP_PERSISTED_CACHE_KEY);
      return null;
    }

    return { savedAt: cached.savedAt, value: cached.value };
  } catch {
    return null;
  }
}

function persistHomeBootstrapCache(value: unknown) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(HOME_BOOTSTRAP_PERSISTED_CACHE_KEY, JSON.stringify({
      savedAt: Date.now(),
      value,
    }));
  } catch {
    // Browser storage may be disabled or full; the in-memory cache still works.
  }
}

function canPersistCatalogPath(path: string): boolean {
  return PERSISTED_CATALOG_PATHS.has(path);
}

function persistedCatalogCacheKey(path: string): string {
  return CATALOG_PERSISTED_CACHE_PREFIX + encodeURIComponent(path);
}

function readPersistedCatalogCache(path: string): { savedAt: number; value: unknown } | null {
  if (typeof window === "undefined" || !canPersistCatalogPath(path)) return null;
  const key = persistedCatalogCacheKey(path);
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const cached = JSON.parse(raw) as { savedAt?: unknown; value?: unknown };
    if (typeof cached.savedAt !== "number" || !("value" in cached)) {
      window.localStorage.removeItem(key);
      return null;
    }
    if (Date.now() - cached.savedAt > CATALOG_PERSISTED_MAX_AGE) {
      window.localStorage.removeItem(key);
      return null;
    }
    return { savedAt: cached.savedAt, value: cached.value };
  } catch {
    return null;
  }
}

function persistCatalogCache(path: string, value: unknown) {
  if (typeof window === "undefined" || !canPersistCatalogPath(path)) return;
  try {
    const serialized = JSON.stringify({ savedAt: Date.now(), value });
    if (serialized.length > CATALOG_PERSISTED_MAX_CHARS) return;
    window.localStorage.setItem(persistedCatalogCacheKey(path), serialized);

    const keys: string[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key?.startsWith(CATALOG_PERSISTED_CACHE_PREFIX)) keys.push(key);
    }
    if (keys.length > CATALOG_PERSISTED_MAX_ENTRIES) {
      const entries = keys.map((key) => {
        try {
          const item = JSON.parse(window.localStorage.getItem(key) || "null") as { savedAt?: number } | null;
          return { key, savedAt: typeof item?.savedAt === "number" ? item.savedAt : 0 };
        } catch {
          return { key, savedAt: 0 };
        }
      }).sort((left, right) => left.savedAt - right.savedAt);
      for (const entry of entries.slice(0, keys.length - CATALOG_PERSISTED_MAX_ENTRIES)) {
        window.localStorage.removeItem(entry.key);
      }
    }
  } catch {
    // Browser storage can be disabled or full; in-memory and network paths remain available.
  }
}

export function subscribeCatalogResponse<T>(path: string, listener: (value: T) => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const handleResponse = (event: Event) => {
    const detail = (event as CustomEvent<{ path: string; value: unknown }>).detail;
    if (detail?.path === path) listener(detail.value as T);
  };
  window.addEventListener(CATALOG_RESPONSE_EVENT, handleResponse);
  return () => window.removeEventListener(CATALOG_RESPONSE_EVENT, handleResponse);
}

function catalogCacheTtl(path: string): number {
  const pathname = path.split('?')[0];
  if (pathname === '/v1/search') return 8_000;
  return /^\/v1\/(banners|home\/bootstrap|topics|genres|albums|playlists|artists|artists\/trending|charts(?:\/[^/]+)?|subscription-plans)$/.test(pathname) ? 30_000 : 0;
}

function catalogCacheStaleWindow(path: string): number {
  if (path.split('?')[0] === '/v1/home/bootstrap') return HOME_BOOTSTRAP_PERSISTED_MAX_AGE;
  if (/^\/v1\/(topics|genres)(\?|$)/.test(path)) return 24 * 60 * 60 * 1_000;
  if (path.startsWith('/v1/banners?daily=1')) return 6 * 60 * 60 * 1_000;
  if (/^\/v1\/(albums|playlists)(\?|$)/.test(path)) return 30 * 60 * 1_000;
  if (path === '/v1/charts' || path === '/v1/home/discovery') return 5 * 60 * 1_000;
  if (path === '/v1/artists/trending') return 15 * 60 * 1_000;
  return 30_000;
}
const songFavoriteStates = new Map<string, boolean>();
const importedLibraries = new Map<string, Promise<void>>();

function requireAuthenticatedFavorite(): void {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)) return;

  window.dispatchEvent(new Event(AUTH_REQUIRED_EVENT));
  throw new ApiError(401, "Vui lòng đăng nhập để yêu thích.");
}

function isFavoriteMutation(path: string, method: string): boolean {
  return method !== "GET" && (
    /\/(?:favorite)(?:\?|$)/.test(path)
    || path.split("?")[0] === "/v1/favorites/songs/reorder"
  );
}

export function notifyLibraryChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("melodify-library-changed"));
}

async function importLegacyLibrary(token: string) {
  if (typeof window !== "undefined" && window.sessionStorage.getItem(LIBRARY_IMPORT_SESSION_KEY) === "1") {
    return;
  }
  let pending = importedLibraries.get(token);
  if (!pending) {
    pending = fetch(`${API_URL}/v1/me/library/import`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ visitor_id: getVisitorId() }),
    }).then(async (response) => {
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new ApiError(response.status, body.message || "Không thể đồng bộ thư viện.");
      }
      if (typeof window !== "undefined") window.sessionStorage.setItem(LIBRARY_IMPORT_SESSION_KEY, "1");
    }).catch((error) => {
      importedLibraries.delete(token);
      if (
        error instanceof ApiError && error.status === 401 &&
        typeof window !== "undefined" &&
        window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) === token
      ) {
        clearAuthSession();
        window.dispatchEvent(new Event(AUTH_REQUIRED_EVENT));
      }
      throw error;
    });
    importedLibraries.set(token, pending);
  }
  return pending;
}

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

  clearCatalogResponseCache();
  songFavoriteStates.clear();
  importedLibraries.clear();
  window.sessionStorage.removeItem(LIBRARY_IMPORT_SESSION_KEY);
  window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, auth.token);
  window.localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(auth.user));
  window.dispatchEvent(new Event("melodify-auth-changed"));
}

export function clearAuthSession(): void {
  if (typeof window === "undefined") return;

  clearCatalogResponseCache();
  songFavoriteStates.clear();
  importedLibraries.clear();
  window.sessionStorage.removeItem(LIBRARY_IMPORT_SESSION_KEY);
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
  const requestKey = `${API_URL}:${storedToken ?? ""}:${path}`;
  // Custom headers/signals have their own cancellation and authorization semantics.
  const shareRequest = method === "GET" && !Object.keys(init ?? {}).some((key) => key !== 'method');
  const ttl = shareRequest && typeof window !== "undefined" ? catalogCacheTtl(path) : 0;
  const generation = catalogCacheGeneration;
  let hasStaleValue = false;
  let staleValue: unknown;

  if (ttl > 0) {
    let cached = catalogResponseCache.get(requestKey);
    if (!cached && method === "GET" && path === "/v1/home/bootstrap") {
      const persisted = readPersistedHomeBootstrapCache();
      if (persisted) {
        cached = {
          expiresAt: persisted.savedAt + ttl,
          staleUntil: persisted.savedAt + HOME_BOOTSTRAP_PERSISTED_MAX_AGE,
          value: persisted.value,
        };
        catalogResponseCache.set(requestKey, cached);
      }
    }
    if (!cached && method === "GET" && canPersistCatalogPath(path)) {
      const persisted = readPersistedCatalogCache(path);
      if (persisted) {
        cached = {
          expiresAt: persisted.savedAt + ttl,
          staleUntil: persisted.savedAt + ttl + catalogCacheStaleWindow(path),
          value: persisted.value,
        };
        catalogResponseCache.set(requestKey, cached);
      }
    }
    if (cached && cached.expiresAt > Date.now()) return cached.value as T;
    if (cached && cached.staleUntil > Date.now()) {
      hasStaleValue = true;
      staleValue = cached.value;
    } else {
      catalogResponseCache.delete(requestKey);
    }
  }
  if (shareRequest) {
    const pending = inFlightGetRequests.get(requestKey);
    if (pending) return hasStaleValue ? staleValue as T : pending as Promise<T>;
  }

  const request = (async () => {
    if (storedToken && (/^\/v1\/(me\/library|favorites\/songs)/.test(path) || /\/(favorite)(\?|$)/.test(path) || /^\/v1\/(songs|albums|playlists)\/[^/]+(?:\?|$)/.test(path))) {
      await importLegacyLibrary(storedToken);
    }
    const requestInit: RequestInit = {
      ...init,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(storedToken ? { Authorization: `Bearer ${storedToken}` } : {}),
        ...init?.headers,
      },
    };
    const response = method === "GET"
      ? await fetchWithApiTimeout(`${API_URL}${path}`, requestInit, init?.signal)
      : await fetch(`${API_URL}${path}`, requestInit);

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const requiresUserSession = /^\/v1\/me(?:\/|$)/.test(path)
        || /^\/v1\/auth\/me(?:\?|$)/.test(path)
        || /^\/v1\/favorites\/songs(?:\/|$)/.test(path)
        || /\/(?:favorite)(?:\?|$)/.test(path);
      if (response.status === 401 && requiresUserSession && typeof window !== "undefined") {
        const currentToken = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
        const hasStaleUser = window.localStorage.getItem(AUTH_USER_STORAGE_KEY) !== null;
        if ((storedToken && currentToken === storedToken) || hasStaleUser) clearAuthSession();
        if (isFavoriteMutation(path, method)) {
          window.dispatchEvent(new Event(AUTH_REQUIRED_EVENT));
        }
      }
      const validationMessage = response.status === 422 && body.errors && typeof body.errors === "object"
        ? Object.values(body.errors as Record<string, unknown>)
          .flatMap((messages) => Array.isArray(messages) ? messages : [messages])
          .find((message): message is string => typeof message === "string")
        : undefined;
      throw new ApiError(response.status, validationMessage ?? body.message ?? "API request failed");
    }

    const payload = await response.json() as T;
    if (method !== "GET" && !/\/view(?:\?|$)/.test(path)) clearCatalogResponseCache();
    if (ttl > 0 && generation === catalogCacheGeneration) {
      const expiresAt = Date.now() + ttl;
      catalogResponseCache.set(requestKey, {
        expiresAt,
        staleUntil: expiresAt + catalogCacheStaleWindow(path),
        value: payload,
      });
      if (method === "GET" && path === "/v1/home/bootstrap") {
        persistHomeBootstrapCache(payload);
      }
      if (method === "GET" && canPersistCatalogPath(path)) {
        persistCatalogCache(path, payload);
      }
      if (method === "GET" && ttl > 0 && typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(CATALOG_RESPONSE_EVENT, { detail: { path, value: payload } }));
      }
      if (catalogResponseCache.size > 80) catalogResponseCache.delete(catalogResponseCache.keys().next().value!);
    }
    if (method !== "GET" && (/\/(favorite|follow)(\?|$)/.test(path) || path.startsWith("/v1/me/playlists"))) notifyLibraryChanged();
    return payload;
  })();

  if (!shareRequest) return request;

  inFlightGetRequests.set(requestKey, request);
  if (hasStaleValue) {
    void request.finally(() => {
      if (inFlightGetRequests.get(requestKey) === request) {
        inFlightGetRequests.delete(requestKey);
      }
    }).catch(() => undefined);
    return staleValue as T;
  }
  try {
    return await request;
  } finally {
    if (inFlightGetRequests.get(requestKey) === request) {
      inFlightGetRequests.delete(requestKey);
    }
  }
}

async function fetchWithApiTimeout(url: string, init: RequestInit, callerSignal?: AbortSignal | null) {
  const controller = new AbortController();
  let timedOut = false;
  const abortFromCaller = () => controller.abort();
  if (callerSignal?.aborted) abortFromCaller();
  else callerSignal?.addEventListener("abort", abortFromCaller, { once: true });
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, 15_000);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (reason) {
    if (timedOut && !callerSignal?.aborted) {
      throw new Error(`API phản hồi quá lâu (15 giây): ${url}. Kiểm tra Backend rồi thử lại.`);
    }
    if (reason instanceof TypeError) {
      throw new Error(`Không kết nối được API (${API_URL}). Kiểm tra mạng và trạng thái Backend rồi thử lại.`);
    }
    throw reason;
  } finally {
    clearTimeout(timeoutId);
    callerSignal?.removeEventListener("abort", abortFromCaller);
  }
}

export function getSubscriptionPlans() {
  return apiFetch<{ data: SubscriptionPlanRecord[] }>("/v1/subscription-plans");
}

export function getVipPaymentMethods() {
  return apiFetch<{ data: VipPaymentGatewayOption[] }>("/v1/vip/payment-methods");
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

export function getCurrentUser() {
  return apiFetch<{ user: AuthUser }>("/v1/auth/me", { cache: "no-store" });
}

export function getVipPaymentStatus(paymentCode: string) {
  return apiFetch<{ data: VipPaymentStatus }>(
    `/v1/vip/transactions/${encodeURIComponent(paymentCode)}`,
  );
}

export function getHomeBootstrap() {
  // Reuse the public catalog briefly when navigating between home sections.
  return apiFetch<{
    data: HomeBootstrap;
    meta: { date: string; refresh_minutes: number };
  }>("/v1/home/bootstrap");
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

export function listFavoriteSongs(_visitorId?: string) {
  void _visitorId;
  return apiFetch<{ data: Song[]; meta: { total: number } }>(
    "/v1/favorites/songs",
  );
}

export function reorderFavoriteSongs(songIds: string[], _visitorId?: string) {
  void _visitorId;
  return apiFetch<{ ordered: boolean }>("/v1/favorites/songs/reorder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ song_ids: songIds }),
  });
}

export function listUserPlaylists() {
  return apiFetch<{ data: UserPlaylistSummary[] }>("/v1/me/playlists");
}

export function getMyUploads() {
  return apiFetch<{ data: UserUploadSummary[]; meta: { total: number; limit: number } }>("/v1/me/uploads");
}

export function stageMySongAudio(
  file: File,
  onProgress: (percent: number) => void,
  signal?: AbortSignal,
): Promise<{ message: string; data: StagedUserAudio }> {
  const form = new FormData();
  form.append("audio_file", file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const storedToken = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    const cleanupSignal = () => {
      if (signal && abortHandler) signal.removeEventListener("abort", abortHandler);
    };
    let abortHandler: (() => void) | null = null;
    xhr.open("POST", `${API_URL}/v1/me/uploads/stage`);
    xhr.setRequestHeader("Accept", "application/json");
    if (storedToken) xhr.setRequestHeader("Authorization", `Bearer ${storedToken}`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.min(95, Math.floor((event.loaded / event.total) * 95)));
      }
    };
    xhr.onload = () => {
      cleanupSignal();
      let body: {
        message?: string;
        data?: StagedUserAudio;
        errors?: Record<string, string[]>;
      };
      try {
        body = JSON.parse(xhr.responseText || "{}") as typeof body;
      } catch {
        reject(new ApiError(xhr.status, "Máy chủ trả về phản hồi không hợp lệ khi tải file."));
        return;
      }
      if (xhr.status >= 200 && xhr.status < 300 && body.data) {
        onProgress(100);
        resolve(body as { message: string; data: StagedUserAudio });
        return;
      }
      const validationMessage = body.errors
        ? Object.values(body.errors).flat().find((message) => typeof message === "string")
        : undefined;
      reject(new ApiError(xhr.status, validationMessage ?? body.message ?? "Không thể tải file nhạc lên."));
    };
    xhr.onerror = () => {
      cleanupSignal();
      reject(new Error("Mất kết nối khi tải file nhạc lên. Vui lòng thử lại."));
    };
    xhr.onabort = () => {
      cleanupSignal();
      reject(new DOMException("Đã hủy tải file nhạc.", "AbortError"));
    };
    if (signal) {
      if (signal.aborted) {
        xhr.abort();
        return;
      }
      abortHandler = () => xhr.abort();
      signal.addEventListener("abort", abortHandler, { once: true });
    }
    xhr.send(form);
  });
}

export function deleteStagedUserAudio(uploadToken: string) {
  return apiFetch<{ message: string }>(`/v1/me/uploads/stage/${encodeURIComponent(uploadToken)}`, {
    method: "DELETE",
  });
}

export function uploadMySong(
  uploadToken: string,
  details: { title: string; artistName: string; artistId: string | null; genreId: string; coverFile: File },
) {
  const form = new FormData();
  form.append("title", details.title);
  form.append("artist_name", details.artistName);
  if (details.artistId) form.append("artist_id", details.artistId);
  form.append("genre_id", details.genreId);
  form.append("terms_accepted", "1");
  form.append("moderation_requested", "1");
  form.append("audio_upload_token", uploadToken);
  form.append("cover_image_file", details.coverFile);
  return apiFetch<{ message: string; data: UserUploadSummary }>("/v1/me/uploads", {
    method: "POST",
    body: form,
  });
}

export function createUserPlaylist(name: string, visibility: 'public' | 'private' = 'private') {
  return apiFetch<{ data: UserPlaylistSummary }>("/v1/me/playlists", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, visibility }),
  });
}

export function updateUserPlaylist(
  playlistId: string,
  details: { name: string; visibility: 'public' | 'private'; coverFile?: File | null },
) {
  const form = new FormData();
  form.append('name', details.name);
  form.append('visibility', details.visibility);
  if (details.coverFile) form.append('cover_image_file', details.coverFile);

  return apiFetch<{ message: string; data: UserPlaylistSummary }>(
    `/v1/me/playlists/${encodeURIComponent(playlistId)}`,
    { method: 'POST', body: form },
  );
}

export function deleteUserPlaylist(playlistId: string) {
  return apiFetch<{ message: string }>(
    `/v1/me/playlists/${encodeURIComponent(playlistId)}`,
    { method: 'DELETE' },
  );
}

export function addSongsToUserPlaylist(playlistId: string, songIds: string[]) {
  return apiFetch<{ message: string; added_count: number }>(
    `/v1/me/playlists/${encodeURIComponent(playlistId)}/songs`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ song_ids: songIds }),
    },
  );
}

export function reportSong(
  song: Pick<Song, "id" | "slug">,
  reason: SongReportReason,
  details: string,
  visitorId?: string,
) {
  return apiFetch<{ message: string; report_id: string }>(
    `/v1/songs/${encodeURIComponent(song.slug || song.id)}/report`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason, details, ...(visitorId ? { visitor_id: visitorId } : {}) }),
    },
  );
}

export function getSongDownloadUrl(song: Song, qualityId?: string | null) {
  const qualities = song.audio_qualities ?? [];
  const requestedQuality = qualityId
    ? qualities.find((quality) => quality.quality_id === qualityId)
    : undefined;
  const selectedQuality = requestedQuality?.available !== false && requestedQuality?.download_url
    ? requestedQuality
    : qualities.find((quality) => quality.available !== false && !quality.premium_only && quality.download_url)
      ?? qualities.find((quality) => quality.available !== false && quality.download_url);

  if (selectedQuality?.download_url) return selectedQuality.download_url;
  if (song.download_url) return song.download_url;

  // Keep downloads behind Melodify so it can enforce VIP access and return an attachment.
  return `${API_URL}/v1/songs/${encodeURIComponent(song.slug || song.id)}/audio?download=1`;
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
  options: { query?: string; page?: number; perPage?: number; visitorId?: string } = {},
) {
  const params = new URLSearchParams();
  if (options.query?.trim()) params.set("q", options.query.trim());
  if (options.page) params.set("page", String(options.page));
  if (options.perPage) params.set("per_page", String(options.perPage));
  if (options.visitorId) params.set("visitor_id", options.visitorId);

  const query = params.toString();
  return apiFetch<PaginatedResponse<SongVideo>>(
    `/v1/videos${query ? `?${query}` : ""}`,
  );
}

export async function getVideo(slug: string, visitorId?: string) {
  const query = visitorId ? `?visitor_id=${encodeURIComponent(visitorId)}` : "";
  return apiFetch<{ data: SongVideo }>(
    `/v1/videos/${encodeURIComponent(slug)}${query}`,
  );
}

export async function recordVideoView(videoId: string, visitorId?: string) {
  return apiFetch<{ recorded: boolean; views: number }>(
    `/v1/videos/${encodeURIComponent(videoId)}/view`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(visitorId ? { visitor_id: visitorId } : {}),
    },
  );
}

export async function toggleVideoFavorite(videoId: string, _visitorId?: string) {
  void _visitorId;
  requireAuthenticatedFavorite();
  return apiFetch<{ favorited: boolean; favorites: number }>(
    `/v1/videos/${encodeURIComponent(videoId)}/favorite`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    },
  );
}

export async function recordVideoShare(videoId: string, source = "copy_link", visitorId?: string) {
  return apiFetch<{ recorded: boolean; shares: number }>(
    `/v1/videos/${encodeURIComponent(videoId)}/share`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, ...(visitorId ? { visitor_id: visitorId } : {}) }),
    },
  );
}

export function reportVideo(
  video: Pick<SongVideo, "id" | "slug">,
  reason: VideoReportReason,
  details: string,
  visitorId?: string,
) {
  return apiFetch<{ message: string; report_id: string }>(
    `/v1/videos/${encodeURIComponent(video.slug || video.id)}/report`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason, details, ...(visitorId ? { visitor_id: visitorId } : {}) }),
    },
  );
}

export function getVideoDownloadUrl(video: Pick<SongVideo, "id" | "slug">) {
  return `${API_URL}/v1/videos/${encodeURIComponent(video.slug || video.id)}/download`;
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

export async function toggleSongFavorite(songId: string, _visitorId?: string) {
  void _visitorId;
  requireAuthenticatedFavorite();
  const response = await apiFetch<{ favorited: boolean; favorites: number }>(
    `/v1/songs/${encodeURIComponent(songId)}/favorite`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    },
  );
  rememberSongFavorite(songId, response.favorited);
  return response;
}

export async function setSongFavorite(songId: string, favorited: boolean, _visitorId?: string) {
  void _visitorId;
  requireAuthenticatedFavorite();
  const response = await apiFetch<{ favorited: boolean; favorites: number }>(
    `/v1/songs/${encodeURIComponent(songId)}/favorite`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ favorited }),
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
  options: { query?: string; perPage?: number; page?: number } = {},
) {
  const params = new URLSearchParams();

  if (options.query?.trim()) params.set("q", options.query.trim());
  params.set("per_page", String(options.perPage ?? 50));
  if (options.page) params.set("page", String(options.page));

  const query = params.toString();
  return apiFetch<PaginatedResponse<GenreRecord>>(
    `/v1/genres${query ? `?${query}` : ""}`,
  );
}

export async function listAllGenres() {
  const firstPage = await listGenres({ perPage: 50, page: 1 });
  if (firstPage.meta.last_page <= 1) return firstPage.data;

  const remainingPages = await Promise.all(
    Array.from({ length: firstPage.meta.last_page - 1 }, (_, index) =>
      listGenres({ perPage: 50, page: index + 2 }),
    ),
  );
  return [firstPage, ...remainingPages].flatMap((page) => page.data);
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

export async function toggleAlbumFavorite(albumId: string, _visitorId?: string) {
  void _visitorId;
  requireAuthenticatedFavorite();
  return apiFetch<{ favorited: boolean; favorites: number }>(
    `/v1/albums/${encodeURIComponent(albumId)}/favorite`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
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

export async function togglePlaylistFavorite(playlistId: string, _visitorId?: string) {
  void _visitorId;
  requireAuthenticatedFavorite();
  return apiFetch<{ favorited: boolean; favorites: number }>(
    `/v1/playlists/${encodeURIComponent(playlistId)}/favorite`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
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

export function getForYouArtists(genreIds: string[]) {
  const params = new URLSearchParams();
  genreIds.forEach((id) => params.append("genre_ids[]", id));
  return apiFetch<{ data: Artist[] }>(`/v1/for-you/artists?${params.toString()}`);
}

export function getForYouSong(genreIds: string[], artistIds: string[], excludeSongIds: string[] = [], visitorId?: string) {
  const params = new URLSearchParams();
  genreIds.forEach((id) => params.append("genre_ids[]", id));
  artistIds.forEach((id) => params.append("artist_ids[]", id));
  excludeSongIds.forEach((id) => params.append("exclude_song_ids[]", id));
  if (visitorId) params.set("visitor_id", visitorId);
  return apiFetch<{ data: Song | null }>(`/v1/for-you/song?${params.toString()}`);
}

export function getTrendingArtists() {
  return apiFetch<TrendingArtistsResponse>("/v1/artists/trending");
}

export function recordArtistView(artistId: string) {
  return apiFetch<{ recorded: boolean }>(
    `/v1/artists/${encodeURIComponent(artistId)}/view`,
    jsonRequest({ visitor_id: getVisitorId() }),
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
