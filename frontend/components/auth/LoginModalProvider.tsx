'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { apiFetch, clearAuthSession, type AuthResponse, type AuthUser } from '@/lib/api';
import LoginModal from './LoginModal';

type LoginModalContextValue = {
  openLogin: () => void;
  user: AuthUser | null;
  logout: () => Promise<void>;
};

const LoginModalContext = createContext<LoginModalContextValue | null>(null);

export function LoginModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const openLogin = useCallback(() => setIsOpen(true), []);
  const closeLogin = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    const readStoredUser = () => {
      const storedUser = window.localStorage.getItem('melodify_auth_user');

      if (!storedUser) {
        setUser(null);
        return;
      }

      try {
        setUser(JSON.parse(storedUser) as AuthUser);
      } catch {
        setUser(null);
      }
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
    if (!toast) return;

    const timeout = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const handleLoginSuccess = useCallback((auth: AuthResponse) => {
    setUser(auth.user);
    setToast(`Đăng nhập thành công. Xin chào ${auth.user.name || 'bạn'}!`);
  }, []);

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

  const value = useMemo(() => ({ openLogin, user, logout }), [logout, openLogin, user]);

  return (
    <LoginModalContext.Provider value={value}>
      {children}
      {toast ? (
        <div role="status" className="fixed right-5 top-5 z-[70] flex max-w-[min(90vw,360px)] items-center gap-3 rounded-xl border border-emerald-300/25 bg-[#173d35] px-4 py-3 text-sm font-semibold text-emerald-100 shadow-2xl">
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-emerald-400 text-[#12362f]">✓</span>
          <span>{toast}</span>
        </div>
      ) : null}
      {isOpen ? <LoginModal onClose={closeLogin} onLoginSuccess={handleLoginSuccess} /> : null}
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
