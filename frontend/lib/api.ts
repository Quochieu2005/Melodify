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

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { Accept: "application/json", ...init?.headers },
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

export async function listPlaylists(options: { query?: string; type?: string; perPage?: number } = {}) {
  const params = new URLSearchParams();

  if (options.query?.trim()) params.set('q', options.query.trim());
  if (options.type?.trim()) params.set('type', options.type.trim());
  if (options.perPage) params.set('per_page', String(options.perPage));

  const query = params.toString();
  return apiFetch<PaginatedResponse<Playlist>>(`/v1/playlists${query ? `?${query}` : ''}`);
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
