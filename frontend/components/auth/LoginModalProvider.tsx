'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import LoginModal from './LoginModal';

type LoginModalContextValue = {
  openLogin: () => void;
};

const LoginModalContext = createContext<LoginModalContextValue | null>(null);

export function LoginModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const openLogin = useCallback(() => setIsOpen(true), []);
  const closeLogin = useCallback(() => setIsOpen(false), []);
  const value = useMemo(() => ({ openLogin }), [openLogin]);

  return (
    <LoginModalContext.Provider value={value}>
      {children}
      {isOpen ? <LoginModal onClose={closeLogin} /> : null}
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
