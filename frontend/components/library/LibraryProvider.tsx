'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLoginModal } from '@/components/auth/LoginModalProvider';
import { getLibrary, type LibraryData } from '@/lib/library-api';

const LibraryContext = createContext<{ data: LibraryData | null; error: string; refresh: () => void }>({ data: null, error: '', refresh: () => {} });

export function LibraryProvider({ children }: { children: ReactNode }) {
  const { user, authReady } = useLoginModal();
  const owner = user?.id || 'guest';
  const isAuthenticated = Boolean(user);
  const [state, setState] = useState<{ owner: string; data: LibraryData | null; error: string }>({ owner: '', data: null, error: '' });
  const generation = useRef(0);
  const mounted = useRef(false);
  const refresh = useCallback(() => {
    if (!authReady || !isAuthenticated) return;
    const version = ++generation.current;
    void getLibrary().then(({ data }) => {
      if (mounted.current && version === generation.current) setState({ owner, data, error: '' });
    }).catch((error: unknown) => {
      if (mounted.current && version === generation.current) setState((previous) => ({ owner, data: previous.owner === owner ? previous.data : null, error: error instanceof Error ? error.message : 'Không thể tải thư viện.' }));
    });
  }, [owner, authReady, isAuthenticated]);

  useEffect(() => {
    mounted.current = true;
    refresh();
    let timer: ReturnType<typeof setTimeout>;
    const changed = () => { clearTimeout(timer); timer = setTimeout(refresh, 80); };
    const storage = (event: StorageEvent) => { if (event.key === 'melodify_access_token') changed(); };
    window.addEventListener('melodify-library-changed', changed);
    window.addEventListener('focus', changed);
    window.addEventListener('storage', storage);
    return () => { mounted.current = false; clearTimeout(timer); window.removeEventListener('melodify-library-changed', changed); window.removeEventListener('focus', changed); window.removeEventListener('storage', storage); };
  }, [refresh]);

  return <LibraryContext.Provider value={{ data: state.owner === owner ? state.data : null, error: state.owner === owner ? state.error : '', refresh }}>{children}</LibraryContext.Provider>;
}

export function useLibrary() { return useContext(LibraryContext); }
