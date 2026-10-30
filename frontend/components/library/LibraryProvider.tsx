'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLoginModal } from '@/components/auth/LoginModalProvider';
import { getLibrary, type LibraryData } from '@/lib/library-api';

const CACHE_KEY = 'melodify-library-cache:v1:';
const LibraryContext = createContext<{ data: LibraryData | null; error: string; loading: boolean; refresh: () => void }>({ data: null, error: '', loading: false, refresh: () => {} });

function readLibraryCache(owner: string): LibraryData | null {
  try {
    const raw = window.localStorage.getItem(`${CACHE_KEY}${owner}`);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<LibraryData>;
    if (!Array.isArray(value.created_playlists) || !Array.isArray(value.favorite_playlists) || !Array.isArray(value.favorite_albums)) return null;
    return value as LibraryData;
  } catch {
    return null;
  }
}

export function LibraryProvider({ children }: { children: ReactNode }) {
  const { user, authReady } = useLoginModal();
  const owner = user?.id || 'guest';
  const [state, setState] = useState<{ owner: string; data: LibraryData | null; error: string; loading: boolean }>({ owner: '', data: null, error: '', loading: false });
  const generation = useRef(0);
  const mounted = useRef(false);
  const refresh = useCallback(() => {
    if (!authReady) return;
    const version = ++generation.current;
    const cached = readLibraryCache(owner);
    setState({ owner, data: cached, error: '', loading: true });
    void getLibrary().then(({ data }) => {
      if (mounted.current && version === generation.current) {
        try { window.localStorage.setItem(`${CACHE_KEY}${owner}`, JSON.stringify(data)); } catch { /* Keep the server response usable when storage is unavailable. */ }
        setState({ owner, data, error: '', loading: false });
      }
    }).catch((error: unknown) => {
      if (mounted.current && version === generation.current) setState((previous) => ({ owner, data: cached || (previous.owner === owner ? previous.data : null), error: error instanceof Error ? error.message : 'Không thể tải thư viện.', loading: false }));
    });
  }, [owner, authReady]);

  useEffect(() => {
    mounted.current = true;
    const initialLoad = window.setTimeout(refresh, 0);
    let timer: ReturnType<typeof setTimeout>;
    const changed = () => { clearTimeout(timer); timer = setTimeout(refresh, 80); };
    const storage = (event: StorageEvent) => { if (event.key === 'melodify_access_token') changed(); };
    window.addEventListener('melodify-library-changed', changed);
    window.addEventListener('focus', changed);
    window.addEventListener('storage', storage);
    return () => { mounted.current = false; clearTimeout(initialLoad); clearTimeout(timer); window.removeEventListener('melodify-library-changed', changed); window.removeEventListener('focus', changed); window.removeEventListener('storage', storage); };
  }, [refresh]);

  const stateMatchesOwner = state.owner === owner;
  return <LibraryContext.Provider value={{
    data: stateMatchesOwner ? state.data : null,
    error: stateMatchesOwner ? state.error : '',
    loading: !authReady || !stateMatchesOwner || state.loading,
    refresh,
  }}>{children}</LibraryContext.Provider>;
}

export function useLibrary() { return useContext(LibraryContext); }
