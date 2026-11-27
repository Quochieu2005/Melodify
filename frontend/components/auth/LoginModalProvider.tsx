'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

import { AUTH_REQUIRED_EVENT, AUTH_TOKEN_STORAGE_KEY, AUTH_USER_STORAGE_KEY, apiFetch, clearAuthSession, getCurrentUser, type AuthResponse, type AuthUser } from '@/lib/api';
const LoginModal = dynamic(() => import('./LoginModal'));

type LoginModalContextValue = {
  openLogin: (returnTo?: string) => void;
  user: AuthUser | null;
  authReady: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const LoginModalContext = createContext<LoginModalContextValue | null>(null);

export function LoginModalProvider({ children, variant = 'default' }: { children: ReactNode; variant?: 'default' | 'vip' }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [loginReturnTo, setLoginReturnTo] = useState<string | null>(null);
  const openLogin = useCallback((returnTo?: string) => {
    setLoginReturnTo(returnTo ?? null);
    setIsOpen(true);
  }, []);
  const closeLogin = useCallback(() => {
    setIsOpen(false);
    setLoginReturnTo(null);
  }, []);

  useEffect(() => {
    const readStoredUser = () => {
      const storedUser = window.localStorage.getItem(AUTH_USER_STORAGE_KEY);
      const storedToken = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);

      if (!storedUser || !storedToken) {
        if (storedUser && !storedToken) clearAuthSession();
        setUser(null);
        setAuthReady(true);
        return;
      }

      try {
        const parsedUser = JSON.parse(storedUser) as AuthUser;
        if (!parsedUser || typeof parsedUser !== 'object' || !parsedUser.id) {
          clearAuthSession();
          setUser(null);
        } else {
          setUser(parsedUser);
        }
      } catch {
        clearAuthSession();
        setUser(null);
      }
      setAuthReady(true);
    };

    readStoredUser();
    window.addEventListener('storage', readStoredUser);
    window.addEventListener('melodify-auth-changed', readStoredUser);

    return () => {
      window.removeEventListener('storage', readStoredUser);
      window.removeEventListener('melodify-auth-changed', readStoredUser);
    };
  }, []);

  useEffect(() => {
    const handleAuthRequired = () => openLogin();
    window.addEventListener(AUTH_REQUIRED_EVENT, handleAuthRequired);
    return () => window.removeEventListener(AUTH_REQUIRED_EVENT, handleAuthRequired);
  }, [openLogin]);

  useEffect(() => {
    if (!toast) return;

    const timeout = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const handleLoginSuccess = useCallback((auth: AuthResponse) => {
    setUser(auth.user);
    setToast(`Đăng nhập thành công. Xin chào ${auth.user.name || 'bạn'}!`);
    setIsOpen(false);
    if (loginReturnTo?.startsWith('/')) router.replace(loginReturnTo);
    setLoginReturnTo(null);
  }, [loginReturnTo, router]);

  const logout = useCallback(async () => {
    try {
      await apiFetch('/v1/auth/logout', { method: 'POST' });
    } catch {
      // Vẫn xóa phiên cục bộ nếu token đã hết hạn hoặc API không phản hồi.
    } finally {
      clearAuthSession();
      setUser(null);
      setToast('Đã đăng xuất khỏi Melodify.');
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const response = await getCurrentUser();
      setUser(response.user);
      window.localStorage.setItem('melodify_auth_user', JSON.stringify(response.user));
      window.dispatchEvent(new Event('melodify-auth-changed'));
    } catch {
      // Keep the local session intact if refreshing profile data is temporarily unavailable.
    }
  }, []);

  useEffect(() => {
    if (authReady && user) void refreshUser();
  }, [authReady, refreshUser, user?.id]);

  const value = useMemo(() => ({ openLogin, user, authReady, logout, refreshUser }), [authReady, logout, openLogin, refreshUser, user]);

  return (
    <LoginModalContext.Provider value={value}>
      {children}
      {toast ? (
        <div role="status" className="fixed right-5 top-5 z-[70] flex max-w-[min(90vw,360px)] items-center gap-3 rounded-xl border border-emerald-300/25 bg-[#173d35] px-4 py-3 text-sm font-semibold text-emerald-100 shadow-2xl">
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-emerald-400 text-[#12362f]">✓</span>
          <span>{toast}</span>
        </div>
      ) : null}
      {isOpen ? <LoginModal variant={variant} onClose={closeLogin} onLoginSuccess={handleLoginSuccess} /> : null}
    </LoginModalContext.Provider>
  );
}

export function useLoginModal() {
  const context = useContext(LoginModalContext);

  if (!context) {
    throw new Error('useLoginModal must be used within LoginModalProvider');
  }

  return context;
}
