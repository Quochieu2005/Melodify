import { apiFetch, getVisitorId, type AlbumRecord, type Artist, type Playlist, type Song, type SongVideo, type UserPlaylistSummary } from './api';

export type PublicUser = { id: string; name: string; username: string | null; avatar_url: string | null };
export type FollowedArtist = Pick<Artist, 'id' | 'name' | 'slug' | 'avatar_url'>;
export type LibraryData = {
  favorite_song_count: number;
  created_playlists: UserPlaylistSummary[];
  favorite_playlists: UserPlaylistSummary[];
  favorite_albums: Pick<AlbumRecord, 'id' | 'title' | 'slug' | 'cover_url'>[];
  following_artists: FollowedArtist[];
  following_users: PublicUser[];
  followers: PublicUser[];
  following_count: number;
  followers_count: number;
};
export function getLibrary() {
  return apiFetch<{ data: LibraryData }>(`/v1/me/library?visitor_id=${encodeURIComponent(getVisitorId())}`);
}
export function setFollowing(kind: 'artist' | 'user', id: string, following: boolean) {
  return apiFetch<{ following: boolean; followers_count: number }>(`/v1/${kind}s/${encodeURIComponent(id)}/follow`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ following }),
  });
}
export function getPublicUser(identifier: string) {
  return apiFetch<{ data: PublicUser & { following_count: number; followers_count: number; is_following: boolean } }>(`/v1/users/${encodeURIComponent(identifier)}`);
}
export type SearchKind = 'all' | 'song' | 'playlist' | 'artist' | 'album' | 'video' | 'user';
export type SearchResults = {
  data: { song?: Song[]; playlist?: Playlist[]; artist?: (Artist & { followers_count: number })[]; album?: AlbumRecord[]; video?: SongVideo[]; user?: PublicUser[] };
  meta: { query: string; type: SearchKind; page: number; per_page: number; totals: Partial<Record<SearchKind, number>> };
};
export function searchCatalog(query: string, type: SearchKind = 'all', page = 1, limit?: number, suggestions = false) {
  const params = new URLSearchParams({ q: query.trim(), type, page: String(page) });
  if (limit) params.set('limit', String(limit));
  if (suggestions) params.set('suggest', '1');
  return apiFetch<SearchResults>(`/v1/search?${params}`);
}
