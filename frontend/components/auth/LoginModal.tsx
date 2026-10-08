'use client';

import { useEffect, useState, type FormEvent } from 'react';

type LoginModalProps = {
  onClose: () => void;
};

type LoginMethod = 'username' | 'phone';

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-7 fill-none stroke-current stroke-2">
      <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" />
    </svg>
  );
}

function EyeIcon({ visible }: { visible: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 fill-none stroke-current stroke-2">
      {visible ? (
        <>
          <path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z" />
          <circle cx="12" cy="12" r="2.5" />
        </>
      ) : (
        <>
          <path d="m3 3 18 18M10.6 6.2A10.5 10.5 0 0 1 12 6c6.1 0 9.5 6 9.5 6a16 16 0 0 1-3.1 3.6M6.1 6.7C3.8 8.2 2.5 12 2.5 12s3.4 6 9.5 6c1.5 0 2.8-.3 4-.8" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
    </svg>
  );
}

function SocialIcon({ type }: { type: 'facebook' | 'google' | 'phone' | 'qr' }) {
  if (type === 'facebook') {
    return <span className="grid size-7 place-items-center rounded-full bg-[#2d83ed] text-lg font-bold text-white">f</span>;
  }

  if (type === 'google') {
    return <span className="text-[22px] font-bold leading-none text-[#4285f4]">G</span>;
  }

  if (type === 'phone') {
    return <span className="grid size-7 place-items-center rounded-md border-2 border-cyan-400 text-sm text-cyan-400">▯</span>;
  }

  return <span className="grid size-7 place-items-center text-2xl leading-none text-cyan-400">⌗</span>;
}

export default function LoginModal({ onClose }: LoginModalProps) {
  const [method, setMethod] = useState<LoginMethod>('username');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.body.classList.add('overflow-hidden');
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.classList.remove('overflow-hidden');
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        aria-labelledby="login-dialog-title"
        aria-modal="true"
        className="w-full max-w-[630px] rounded-lg border border-white/10 bg-[#242424] p-6 text-white shadow-2xl sm:p-7"
        role="dialog"
      >
        <div className="flex items-center justify-between">
          <h2 id="login-dialog-title" className="text-2xl font-extrabold tracking-[-0.03em] sm:text-[26px]">Login with password</h2>
          <button type="button" aria-label="Close login dialog" onClick={onClose} className="rounded-full p-1 text-white/60 outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-cyan-300">
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5">
          <div className="grid grid-cols-2 border-b border-white/10">
            {(['username', 'phone'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setMethod(tab)}
                className={[
                  'border-b-4 py-3 text-sm font-bold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-inset',
                  method === tab ? 'border-cyan-400 text-white' : 'border-transparent text-white/45 hover:text-white/75',
                ].join(' ')}
              >
                {tab === 'username' ? 'Username' : 'Phone number'}
              </button>
            ))}
          </div>

          <div className="mt-6 space-y-4">
            <input
              autoFocus
              type={method === 'username' ? 'text' : 'tel'}
              placeholder={method === 'username' ? 'Username/Email' : 'Phone number'}
              aria-label={method === 'username' ? 'Username or email' : 'Phone number'}
              className="h-12 w-full rounded bg-[#3a3a3a] px-4 text-sm text-white outline-none placeholder:text-[#a4a4a4] focus:ring-2 focus:ring-cyan-400"
            />
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                aria-label="Password"
                className="h-12 w-full rounded bg-[#3a3a3a] px-4 pr-12 text-sm text-white outline-none placeholder:text-[#a4a4a4] focus:ring-2 focus:ring-cyan-400"
              />
              <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((visible) => !visible)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/55 outline-none hover:text-white focus-visible:text-cyan-300">
                <EyeIcon visible={showPassword} />
              </button>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs">
            <label className="flex cursor-pointer items-center gap-2 text-white/85">
              <input type="checkbox" className="size-4 accent-cyan-400" />
              Remember me
            </label>
            <button type="button" className="font-bold text-cyan-400 hover:text-cyan-300">Forgot password?</button>
          </div>

          <label className="mt-4 flex cursor-pointer items-start gap-2 text-[11px] leading-[1.45] text-white/85">
            <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-cyan-400" />
            <span>
              I have read, fully understood, and voluntarily agreed to the terms regarding the collection, processing of personal data, rights, and obligations as stipulated in the <button type="button" className="text-cyan-400 hover:underline">Privacy Policy</button> and <button type="button" className="text-cyan-400 hover:underline">Terms of Use</button>, as well as other policies issued by NCT
            </span>
          </label>

          <button type="submit" className="mt-6 h-14 w-full rounded-full bg-cyan-400 text-base font-bold text-[#07363a] outline-none transition-colors hover:bg-cyan-300 focus-visible:ring-2 focus-visible:ring-white">
            Log in
          </button>
        </form>

        <div className="my-6 flex items-center gap-3 text-xs text-white/55">
          <span className="h-px flex-1 bg-white/10" />
          <span>Or log in with</span>
          <span className="h-px flex-1 bg-white/10" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {([
            ['facebook', 'Facebook'],
            ['google', 'Google'],
            ['phone', 'Phone number'],
            ['qr', 'QR code'],
          ] as const).map(([type, label]) => (
            <button key={type} type="button" className="flex h-11 items-center gap-3 rounded bg-[#3a3a3a] px-3 text-sm font-bold text-white outline-none transition-colors hover:bg-[#464646] focus-visible:ring-2 focus-visible:ring-cyan-300">
              <SocialIcon type={type} />
              {label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
