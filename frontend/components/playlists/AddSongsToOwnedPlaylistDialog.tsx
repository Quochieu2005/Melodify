'use client';

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import { getAlbum, getPlaylist, getVisitorId, listFavoriteSongs, addSongsToUserPlaylist, type Song } from '@/lib/api';
import { getLibrary, type LibraryData } from '@/lib/library-api';
import { readRecentItems, subscribeRecentHistory, type RecentItem } from '@/lib/recent-history';

type SourceTab = 'all' | 'created' | 'favorite-playlists' | 'favorite-albums' | 'recent';
type SourceKind = 'playlist' | 'album' | 'favorite-songs' | 'recent-songs';
type SongSource = {
  key: string;
  kind: SourceKind;
  id: string;
  slug?: string | null;
  title: string;
  subtitle: string;
  coverUrl: string | null;
  songCount: number;
  songs?: Song[];
};
type SourceSection = { title: string; sources: SongSource[] };

const fallbackCover = '/images/cover-placeholder.svg';

function getRecentSongsSnapshot() {
  return JSON.stringify(readRecentItems().filter((item) => item.category === 'song'));
}

function recentItemToSong(item: RecentItem): Song {
  return {
    id: item.id,
    title: item.title,
    slug: null,
    duration_seconds: item.durationSeconds ?? null,
    artist: null,
    artists: item.artists ?? [],
    preview_url: null,
    cover_url: item.imageUrl,
  };
}

function formatDuration(duration: number | null | undefined) {
  if (duration === null || duration === undefined) return '--:--';
  return `${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')}`;
}

function songArtist(song: Song) {
  return song.artists?.map((artist) => artist.name).join(', ') || song.artist?.name || 'Nghệ sĩ chưa cập nhật';
}

export function AddSongsToOwnedPlaylistDialog({
  playlistId,
  playlistName,
  existingSongs,
  open,
  onClose,
  onAdded,
}: {
  playlistId: string;
  playlistName: string;
  existingSongs: Song[];
  open: boolean;
  onClose: () => void;
  onAdded: (message: string) => void;
}) {
  const [library, setLibrary] = useState<LibraryData | null>(null);
  const [favoriteSongs, setFavoriteSongs] = useState<Song[]>([]);
  const recentItemsSnapshot = useSyncExternalStore(subscribeRecentHistory, getRecentSongsSnapshot, () => '[]');
  const [activeTab, setActiveTab] = useState<SourceTab>('all');
  const [selectedSource, setSelectedSource] = useState<SongSource | null>(null);
  const [sourceSongs, setSourceSongs] = useState<Song[]>([]);
  const [addedIds, setAddedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSongs, setIsLoadingSongs] = useState(false);
  const [savingId, setSavingId] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const handleClose = useCallback(() => {
    if (savingId) return;
    setSelectedSource(null);
    setActiveTab('all');
    setAddedIds([]);
    setError('');
    setStatus('');
    setIsLoading(true);
    onClose();
  }, [onClose, savingId]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void Promise.allSettled([getLibrary(), listFavoriteSongs(getVisitorId())]).then(([libraryResult, favoritesResult]) => {
      if (cancelled) return;
      if (libraryResult.status === 'fulfilled') {
        setLibrary(libraryResult.value.data);
      } else {
        setError('Không thể tải thư viện của bạn. Vui lòng thử lại.');
      }
      if (favoritesResult.status === 'fulfilled') {
        setFavoriteSongs(favoritesResult.value.data);
      }
    }).finally(() => {
      if (!cancelled) setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [open]);

  const recentItems = useMemo(() => JSON.parse(recentItemsSnapshot) as RecentItem[], [recentItemsSnapshot]);
  useEffect(() => {
    if (!open) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !savingId) {
        if (selectedSource) setSelectedSource(null);
        else handleClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [handleClose, open, savingId, selectedSource]);

  const recentSongs = useMemo(() => recentItems.map(recentItemToSong), [recentItems]);
  const sources = useMemo(() => {
    if (!library) return [];
    const userCreated = library.created_playlists
      .filter((playlist) => playlist.id !== playlistId)
      .map((playlist): SongSource => ({
        key: `created:${playlist.id}`, kind: 'playlist', id: playlist.id, slug: playlist.slug,
        title: playlist.name, subtitle: 'Playlist của bạn', coverUrl: playlist.cover_url,
        songCount: playlist.song_count,
      }));
    const favoritePlaylists = library.favorite_playlists.map((playlist): SongSource => ({
      key: `favorite-playlist:${playlist.id}`, kind: 'playlist', id: playlist.id, slug: playlist.slug,
      title: playlist.name, subtitle: 'Playlist yêu thích', coverUrl: playlist.cover_url,
      songCount: playlist.song_count,
    }));
    const favoriteAlbums = library.favorite_albums.map((album): SongSource => ({
      key: `favorite-album:${album.id}`, kind: 'album', id: album.id, slug: album.slug,
      title: album.title, subtitle: 'Album yêu thích', coverUrl: album.cover_url,
      songCount: album.song_count ?? 0,
    }));
    const sections: SourceSection[] = [];
    if (favoriteSongs.length > 0) {
      sections.push({ title: 'Bài hát yêu thích', sources: [{
        key: 'favorite-songs', kind: 'favorite-songs', id: 'favorite-songs', title: 'Yêu Thích',
        subtitle: 'Các bài hát bạn đã yêu thích', coverUrl: null, songCount: favoriteSongs.length, songs: favoriteSongs,
      }] });
    }
    if (userCreated.length > 0) sections.push({ title: 'Playlist đã tạo', sources: userCreated });
    if (favoritePlaylists.length > 0) sections.push({ title: 'Playlist yêu thích', sources: favoritePlaylists });
    if (favoriteAlbums.length > 0) sections.push({ title: 'Album yêu thích', sources: favoriteAlbums });
    if (recentSongs.length > 0) {
      sections.push({ title: 'Nghe gần đây', sources: [{
        key: 'recent-songs', kind: 'recent-songs', id: 'recent-songs', title: 'Nghe gần đây',
        subtitle: 'Các bài hát bạn đã nghe gần đây', coverUrl: '/sidebar-history.png', songCount: recentSongs.length, songs: recentSongs,
      }] });
    }
    return sections;
  }, [favoriteSongs, library, playlistId, recentSongs]);

  const tabCounts = useMemo(() => ({
    created: library?.created_playlists.filter((playlist) => playlist.id !== playlistId).length ?? 0,
    'favorite-playlists': library?.favorite_playlists.length ?? 0,
    'favorite-albums': library?.favorite_albums.length ?? 0,
    recent: recentSongs.length,
  }), [library, playlistId, recentSongs.length]);

  const visibleSections = activeTab === 'all'
    ? sources
    : sources.filter((section) => {
      if (activeTab === 'created') return section.title === 'Playlist đã tạo';
      if (activeTab === 'favorite-playlists') return section.title === 'Playlist yêu thích';
      if (activeTab === 'favorite-albums') return section.title === 'Album yêu thích';
      return section.title === 'Nghe gần đây';
    });

  if (!open) return null;

  const openSource = async (source: SongSource) => {
    setError('');
    setStatus('');
    setSelectedSource(source);
    setSourceSongs(source.songs ?? []);
    if (source.songs) return;

    setIsLoadingSongs(true);
    try {
      const response = source.kind === 'album'
        ? await getAlbum(source.slug || source.id, getVisitorId())
        : await getPlaylist(source.slug || source.id, getVisitorId());
      setSourceSongs(response.data.songs ?? []);
    } catch {
      setError('Không thể tải danh sách bài hát từ mục này. Vui lòng thử lại.');
    } finally {
      setIsLoadingSongs(false);
    }
  };

  const addSong = async (song: Song) => {
    if (savingId) return;
    setSavingId(song.id);
    setError('');
    setStatus('');
    try {
      const response = await addSongsToUserPlaylist(playlistId, [song.id]);
      setAddedIds((current) => current.includes(song.id) ? current : [...current, song.id]);
      const message = response.added_count > 0
        ? `Đã thêm “${song.title}” vào playlist.`
        : `“${song.title}” đã có trong playlist.`;
      setStatus(message);
      onAdded(message);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể thêm bài hát vào playlist.');
    } finally {
      setSavingId('');
    }
  };

  const alreadyInPlaylist = new Set([...existingSongs.map((song) => song.id), ...addedIds]);
  const tabs: Array<{ key: SourceTab; label: string }> = [
    { key: 'all', label: 'Tất cả' },
    { key: 'created', label: `Playlist đã tạo (${tabCounts.created})` },
    { key: 'favorite-playlists', label: `Playlist yêu thích (${tabCounts['favorite-playlists']})` },
    { key: 'favorite-albums', label: `Album yêu thích (${tabCounts['favorite-albums']})` },
    { key: 'recent', label: `Nghe gần đây (${tabCounts.recent})` },
  ];

  return (
    <div className="fixed inset-0 z-[125] grid place-items-center bg-black/70 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) handleClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="add-owned-playlist-title" className="flex max-h-[min(84vh,840px)] w-full max-w-[850px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#202120] text-white shadow-2xl">
        <header className="flex shrink-0 items-start justify-between gap-4 px-6 pb-4 pt-6 sm:px-8">
          <div className="min-w-0">
            {selectedSource ? (
              <button type="button" onClick={() => { setSelectedSource(null); setError(''); setStatus(''); }} className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-white/60 hover:text-cyan-300"><span aria-hidden="true" className="text-xl leading-none">‹</span>Quay lại nguồn nhạc</button>
            ) : null}
            <h2 id="add-owned-playlist-title" className="truncate text-2xl font-extrabold">{selectedSource ? selectedSource.title : 'Thêm bài hát'}</h2>
            <p className="mt-1 text-sm text-white/60">{selectedSource ? `${sourceSongs.length || selectedSource.songCount} bài hát` : `Chọn nguồn nhạc để thêm vào “${playlistName}”`}</p>
          </div>
          <button type="button" aria-label="Đóng" onClick={handleClose} disabled={Boolean(savingId)} className="grid size-9 shrink-0 place-items-center rounded-full text-3xl leading-none text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-50">×</button>
        </header>

        {!selectedSource ? (
          <>
            <div role="tablist" aria-label="Nguồn bài hát" className="playlist-dialog-scrollbar-hidden flex shrink-0 gap-2 overflow-x-auto px-6 pb-4 sm:px-8">
              {tabs.map((tab) => (
                <button key={tab.key} type="button" role="tab" aria-selected={activeTab === tab.key} onClick={() => setActiveTab(tab.key)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-colors ${activeTab === tab.key ? 'bg-[#00cfe3] text-[#07363a]' : 'bg-[#393b3a] text-white hover:bg-[#4a4d4c]'}`}>{tab.label}</button>
              ))}
            </div>
            <div tabIndex={0} aria-label="Danh sách nguồn bài hát" className="playlist-dialog-scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-6 pb-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-300 sm:px-8">
              {isLoading ? <p className="py-8 text-center text-sm text-white/60">Đang tải thư viện…</p> : null}
              {!isLoading && visibleSections.length === 0 && !error ? <p className="py-10 text-center text-sm text-white/55">Chưa có nguồn nhạc trong mục này.</p> : null}
              {!isLoading ? visibleSections.map((section) => (
                <div key={section.title} className="mb-5 last:mb-0">
                  {activeTab === 'all' ? <h3 className="mb-2 text-lg font-extrabold">{section.title}</h3> : null}
                  <div className="space-y-1">
                    {section.sources.map((source) => (
                      <button key={source.key} type="button" onClick={() => void openSource(source)} className="group flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
                        <span role="img" aria-label={`Ảnh bìa ${source.title}`} className="grid size-[68px] shrink-0 place-items-center overflow-hidden rounded-md bg-[#393b3a] bg-cover bg-center" style={source.coverUrl ? { backgroundImage: `url("${source.coverUrl}")` } : undefined}>
                          {!source.coverUrl ? <span aria-hidden="true" className="text-3xl">{source.kind === 'favorite-songs' ? '♥' : '♫'}</span> : null}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-bold">{source.title}</span>
                          <span className="mt-1 block text-sm text-white/50">{source.songCount} bài hát</span>
                        </span>
                        <span aria-hidden="true" className="px-2 text-3xl leading-none text-white/80 transition-transform group-hover:translate-x-1">›</span>
                      </button>
                    ))}
                  </div>
                </div>
              )) : null}
            </div>
          </>
        ) : (
          <div tabIndex={0} aria-label="Danh sách bài hát" className="playlist-dialog-scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-6 pb-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-300 sm:px-8">
            {isLoadingSongs ? <p className="py-10 text-center text-sm text-white/60">Đang tải bài hát…</p> : null}
            {!isLoadingSongs && sourceSongs.length === 0 ? <p className="py-10 text-center text-sm text-white/55">Nguồn nhạc này chưa có bài hát.</p> : null}
            {!isLoadingSongs ? <ol className="space-y-1">
              {sourceSongs.map((song, index) => {
                const alreadyAdded = alreadyInPlaylist.has(song.id);
                return (
                  <li key={song.id} className="grid grid-cols-[30px_48px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/[0.05] sm:grid-cols-[34px_56px_minmax(0,1fr)_70px_112px] sm:gap-4">
                    <span className="text-center text-sm text-white/55">{index + 1}</span>
                    <span role="img" aria-label={`Ảnh bìa ${song.title}`} className="size-12 rounded-md bg-[#393b3a] bg-cover bg-center sm:size-14" style={{ backgroundImage: `url("${song.cover_url || fallbackCover}")` }} />
                    <span className="min-w-0">
                      <span className="block truncate font-bold">{song.title}</span>
                      <span className="mt-1 block truncate text-sm text-white/55">{songArtist(song)}</span>
                    </span>
                    <span className="hidden text-right text-sm text-white/55 sm:block">{formatDuration(song.duration_seconds)}</span>
                    <button type="button" onClick={() => void addSong(song)} disabled={alreadyAdded || savingId === song.id} className={`h-10 rounded-full border px-3 text-sm font-bold transition-colors sm:px-4 ${alreadyAdded ? 'border-white/10 text-white/45' : 'border-white/20 text-cyan-300 hover:border-cyan-300 hover:bg-cyan-300/10'} disabled:cursor-default`}>{savingId === song.id ? 'Đang thêm…' : alreadyAdded ? 'Đã thêm' : 'Thêm vào'}</button>
                  </li>
                );
              })}
            </ol> : null}
          </div>
        )}

        {error || status ? <p role={error ? 'alert' : 'status'} className={`shrink-0 border-t border-white/10 px-6 py-3 text-sm sm:px-8 ${error ? 'text-rose-300' : 'text-cyan-200'}`}>{error || status}</p> : null}
      </section>
    </div>
  );
}
