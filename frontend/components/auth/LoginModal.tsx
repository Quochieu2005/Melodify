'use client';

import QRCode from 'qrcode';
import Image from 'next/image';
import { useEffect, useState, type FormEvent } from 'react';
import {
  ApiError,
  getQrLoginStatus,
  loginWithPassword,
  loginWithPhone,
  loginWithSocial,
  requestPhoneOtp,
  saveAuthSession,
  startQrLogin,
  type AuthResponse,
  type QrLoginStartResponse,
  type SocialProvider,
} from '@/lib/api';

type LoginModalProps = {
  onClose: () => void;
  onLoginSuccess?: (auth: AuthResponse) => void;
};

type LoginMethod = 'username' | 'phone';

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

declare global {
  interface Window {
    FB?: {
      init: (options: { appId: string; cookie: boolean; xfbml: boolean; version: string }) => void;
      login: (
        callback: (response: { authResponse?: { accessToken?: string } }) => void,
        options: { scope: string; return_scopes: boolean },
      ) => void;
    };
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (options: {
            client_id: string;
            scope: string;
            callback: (response: GoogleTokenResponse) => void;
          }) => { requestAccessToken: (options?: { prompt?: string }) => void };
        };
      };
    };
  }
}

const loadedScripts = new Map<string, Promise<void>>();
let facebookInitialized = false;

function loadScript(id: string, src: string): Promise<void> {
  const current = loadedScripts.get(id);
  if (current) return current;

  const existing = document.getElementById(id);
  if (existing) return Promise.resolve();

  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.id = id;
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Không thể tải bộ đăng nhập bên thứ ba.'));
    document.head.appendChild(script);
  });

  loadedScripts.set(id, promise);
  return promise;
}

async function requestGoogleAccessToken(): Promise<string> {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  if (!clientId) {
    throw new Error('Chưa cấu hình NEXT_PUBLIC_GOOGLE_CLIENT_ID cho frontend.');
  }

  await loadScript('google-identity-services', 'https://accounts.google.com/gsi/client');

  if (!window.google?.accounts?.oauth2) {
    throw new Error('Google Login chưa sẵn sàng. Vui lòng thử lại.');
  }

  return new Promise((resolve, reject) => {
    const tokenClient = window.google?.accounts?.oauth2?.initTokenClient({
      client_id: clientId,
      scope: 'openid email profile',
      callback: (response) => {
        if (response.access_token) {
          resolve(response.access_token);
          return;
        }

        reject(new Error(response.error_description || 'Không lấy được token Google.'));
      },
    });

    tokenClient?.requestAccessToken({ prompt: 'select_account' });
  });
}

async function requestFacebookAccessToken(): Promise<string> {
  const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;

  if (!appId) {
    throw new Error('Chưa cấu hình NEXT_PUBLIC_FACEBOOK_APP_ID cho frontend.');
  }

  await loadScript('facebook-jssdk', 'https://connect.facebook.net/en_US/sdk.js');

  if (!window.FB) {
    throw new Error('Facebook Login chưa sẵn sàng. Vui lòng thử lại.');
  }

  if (!facebookInitialized) {
    window.FB.init({
      appId,
      cookie: true,
      xfbml: false,
      version: process.env.NEXT_PUBLIC_FACEBOOK_GRAPH_VERSION || 'v22.0',
    });
    facebookInitialized = true;
  }

  return new Promise((resolve, reject) => {
    window.FB?.login((response) => {
      const accessToken = response.authResponse?.accessToken;

      if (accessToken) {
        resolve(accessToken);
        return;
      }

      reject(new Error('Bạn đã hủy hoặc Facebook không cấp quyền đăng nhập.'));
    }, { scope: 'public_profile,email', return_scopes: true });
  });
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Đã xảy ra lỗi. Vui lòng thử lại.';
}

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
        <path d="m3 3 18 18M10.6 6.2A10.5 10.5 0 0 1 12 6c6.1 0 9.5 6 9.5 6a16 16 0 0 1-3.1 3.6M6.1 6.7C3.8 8.2 2.5 12 2.5 12s3.4 6 9.5 6c1.5 0 2.8-.3 4-.8" strokeLinecap="round" strokeLinejoin="round" />
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

export default function LoginModal({ onClose, onLoginSuccess }: LoginModalProps) {
  const [method, setMethod] = useState<LoginMethod>('username');
  const [showPassword, setShowPassword] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [remember, setRemember] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [qrSession, setQrSession] = useState<QrLoginStartResponse | null>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.body.classList.add('overflow-hidden');
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.classList.remove('overflow-hidden');
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    if (!qrSession) return;

    let cancelled = false;
    const poll = async () => {
      try {
        const response = await getQrLoginStatus(qrSession.session_id, qrSession.poll_token);

        if (cancelled) return;

        if (response.status === 'completed' && response.token && response.user) {
          const auth: AuthResponse = {
            message: response.message || 'Đăng nhập QR thành công.',
            token: response.token,
            token_type: response.token_type || 'Bearer',
            expires_at: response.expires_at || qrSession.expires_at,
            remembered: response.remembered,
            user: response.user,
          };
          saveAuthSession(auth);
          onLoginSuccess?.(auth);
          onClose();
          return;
        }

        if (response.status === 'expired') {
          setError('Mã QR đã hết hạn. Vui lòng tạo mã mới.');
          setQrSession(null);
          setQrImage(null);
        }
      } catch (pollError) {
        if (!cancelled) setError(getErrorMessage(pollError));
      }
    };

    void poll();
    const interval = window.setInterval(() => { void poll(); }, Math.max(2, qrSession.poll_interval_seconds) * 1000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [onClose, onLoginSuccess, qrSession]);

  async function completeLogin(auth: AuthResponse) {
    saveAuthSession(auth);
    onLoginSuccess?.(auth);
    onClose();
  }

  function validateTerms() {
    if (termsAccepted) return true;

    setError('Vui lòng đồng ý với điều khoản sử dụng để tiếp tục.');
    return false;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (!validateTerms()) return;

    try {
      if (method === 'phone') {
        if (!phoneOtpSent) {
          setLoadingAction('phone-otp');
          const response = await requestPhoneOtp(phone);
          setPhoneOtpSent(true);
          setNotice(`${response.message} Kiểm tra tin nhắn để lấy mã xác thực.`);
          return;
        }

        setLoadingAction('phone-login');
        await completeLogin(await loginWithPhone(phone, phoneCode, remember));
        return;
      }

      setLoadingAction('password');
      await completeLogin(await loginWithPassword(identifier, password, remember));
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleSocialLogin(provider: SocialProvider) {
    setError(null);
    setNotice(null);

    if (!validateTerms()) return;

    try {
      setLoadingAction(provider);
      const accessToken = provider === 'google'
        ? await requestGoogleAccessToken()
        : await requestFacebookAccessToken();
      await completeLogin(await loginWithSocial(provider, accessToken, remember));
    } catch (socialError) {
      setError(getErrorMessage(socialError));
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleQrLogin() {
    setError(null);
    setNotice(null);

    if (!validateTerms()) return;

    try {
      setLoadingAction('qr');
      const session = await startQrLogin(remember);
      const image = await QRCode.toDataURL(session.qr_payload, {
        width: 240,
        margin: 2,
        color: { dark: '#111111', light: '#ffffff' },
      });
      setQrSession(session);
      setQrImage(image);
      setNotice('Mở ứng dụng Melodify trên điện thoại, quét mã và xác nhận đăng nhập.');
    } catch (qrError) {
      setError(getErrorMessage(qrError));
    } finally {
      setLoadingAction(null);
    }
  }

  function resetQrMode() {
    setQrSession(null);
    setQrImage(null);
    setError(null);
    setNotice(null);
  }

  const isLoading = loadingAction !== null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        aria-labelledby="login-dialog-title"
        aria-modal="true"
        className="max-h-[calc(100vh-2rem)] w-full max-w-[630px] overflow-y-auto rounded-lg border border-white/10 bg-[#242424] p-6 text-white shadow-2xl sm:p-7"
        role="dialog"
      >
        <div className="flex items-center justify-between">
          <h2 id="login-dialog-title" className="text-2xl font-extrabold tracking-[-0.03em] sm:text-[26px]">
            {qrSession ? 'Đăng nhập bằng mã QR' : 'Đăng nhập bằng mật khẩu'}
          </h2>
          <button type="button" aria-label="Đóng hộp thoại đăng nhập" onClick={onClose} className="rounded-full p-1 text-white/60 outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-cyan-300">
            <CloseIcon />
          </button>
        </div>

        {qrSession ? (
          <div className="mt-7 flex flex-col items-center text-center">
            {qrImage ? <Image src={qrImage} alt="Mã QR đăng nhập Melodify" width={240} height={240} unoptimized className="size-60 rounded-xl bg-white p-3" /> : null}
            <p className="mt-5 max-w-[360px] text-sm leading-6 text-white/70">
              Dùng ứng dụng Melodify trên điện thoại để quét mã này. Trang sẽ tự động đăng nhập sau khi bạn xác nhận.
            </p>
            {notice ? <p className="mt-3 text-sm text-cyan-300">{notice}</p> : null}
            {error ? <p role="alert" className="mt-3 text-sm text-red-300">{error}</p> : null}
            <button type="button" disabled={isLoading} onClick={handleQrLogin} className="mt-6 h-11 rounded-full bg-cyan-400 px-6 text-sm font-bold text-[#07363a] transition-colors hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60">
              {isLoading ? 'Đang tạo mã...' : 'Tạo mã QR mới'}
            </button>
            <button type="button" onClick={resetQrMode} className="mt-3 text-sm text-white/60 hover:text-white">
              Quay lại các cách đăng nhập
            </button>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="mt-5">
              <div className="grid grid-cols-2 border-b border-white/10">
                {(['username', 'phone'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => {
                      setMethod(tab);
                      setError(null);
                      setNotice(null);
                    }}
                    className={[
                      'border-b-4 py-3 text-sm font-bold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-inset',
                      method === tab ? 'border-cyan-400 text-white' : 'border-transparent text-white/45 hover:text-white/75',
                    ].join(' ')}
                  >
                    {tab === 'username' ? 'Tên đăng nhập' : 'Số điện thoại'}
                  </button>
                ))}
              </div>

              <div className="mt-6 space-y-4">
                {method === 'username' ? (
                  <>
                    <input
                      autoFocus
                      type="text"
                      value={identifier}
                      onChange={(event) => setIdentifier(event.target.value)}
                      placeholder="Tên đăng nhập hoặc email"
                      aria-label="Tên đăng nhập hoặc email"
                      required
                      className="h-12 w-full rounded bg-[#3a3a3a] px-4 text-sm text-white outline-none placeholder:text-[#a4a4a4] focus:ring-2 focus:ring-cyan-400"
                    />
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Mật khẩu"
                        aria-label="Mật khẩu"
                        required
                        className="h-12 w-full rounded bg-[#3a3a3a] px-4 pr-12 text-sm text-white outline-none placeholder:text-[#a4a4a4] focus:ring-2 focus:ring-cyan-400"
                      />
                      <button type="button" aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onClick={() => setShowPassword((visible) => !visible)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/55 outline-none hover:text-white focus-visible:text-cyan-300">
                        <EyeIcon visible={showPassword} />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <input
                      autoFocus
                      type="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="Số điện thoại, ví dụ 090..."
                      aria-label="Số điện thoại"
                      required
                      className="h-12 w-full rounded bg-[#3a3a3a] px-4 text-sm text-white outline-none placeholder:text-[#a4a4a4] focus:ring-2 focus:ring-cyan-400"
                    />
                    {phoneOtpSent ? (
                      <input
                        type="text"
                        inputMode="numeric"
                        value={phoneCode}
                        onChange={(event) => setPhoneCode(event.target.value)}
                        placeholder="Nhập mã xác thực"
                        aria-label="Mã xác thực qua SMS"
                        required
                        className="h-12 w-full rounded bg-[#3a3a3a] px-4 text-sm tracking-[0.35em] text-white outline-none placeholder:tracking-normal placeholder:text-[#a4a4a4] focus:ring-2 focus:ring-cyan-400"
                      />
                    ) : null}
                  </>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between text-xs">
                <label className="flex cursor-pointer items-center gap-2 text-white/85">
                  <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} className="size-4 accent-cyan-400" />
                  Ghi nhớ đăng nhập
                </label>
                {method === 'username' ? <button type="button" className="font-bold text-cyan-400 hover:text-cyan-300">Quên mật khẩu?</button> : null}
              </div>

              <label className="mt-4 flex cursor-pointer items-start gap-2 text-[11px] leading-[1.45] text-white/85">
                <input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} className="mt-0.5 size-4 shrink-0 accent-cyan-400" />
                <span>
                  Tôi đã đọc, hiểu và đồng ý với <button type="button" className="text-cyan-400 hover:underline">Chính sách bảo mật</button> và <button type="button" className="text-cyan-400 hover:underline">Điều khoản sử dụng</button> của Melodify.
                </span>
              </label>

              {error ? <p role="alert" className="mt-4 text-sm text-red-300">{error}</p> : null}
              {notice ? <p role="status" className="mt-4 text-sm text-cyan-300">{notice}</p> : null}

              <button type="submit" disabled={isLoading} className="mt-6 h-14 w-full rounded-full bg-cyan-400 text-base font-bold text-[#07363a] outline-none transition-colors hover:bg-cyan-300 focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-60">
                {loadingAction === 'phone-otp' ? 'Đang gửi mã...' : loadingAction === 'phone-login' ? 'Đang đăng nhập...' : loadingAction === 'password' ? 'Đang đăng nhập...' : method === 'phone' && !phoneOtpSent ? 'Gửi mã xác thực' : 'Đăng nhập'}
              </button>
            </form>

            <div className="my-6 flex items-center gap-3 text-xs text-white/55">
              <span className="h-px flex-1 bg-white/10" />
              <span>Hoặc đăng nhập bằng</span>
              <span className="h-px flex-1 bg-white/10" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button type="button" disabled={isLoading} onClick={() => { void handleSocialLogin('facebook'); }} className="flex h-11 items-center gap-3 rounded bg-[#3a3a3a] px-3 text-sm font-bold text-white outline-none transition-colors hover:bg-[#464646] focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-not-allowed disabled:opacity-60">
                <SocialIcon type="facebook" /> Facebook
              </button>
              <button type="button" disabled={isLoading} onClick={() => { void handleSocialLogin('google'); }} className="flex h-11 items-center gap-3 rounded bg-[#3a3a3a] px-3 text-sm font-bold text-white outline-none transition-colors hover:bg-[#464646] focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-not-allowed disabled:opacity-60">
                <SocialIcon type="google" /> Google
              </button>
              <button type="button" disabled={isLoading} onClick={() => setMethod('phone')} className="flex h-11 items-center gap-3 rounded bg-[#3a3a3a] px-3 text-sm font-bold text-white outline-none transition-colors hover:bg-[#464646] focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-not-allowed disabled:opacity-60">
                <SocialIcon type="phone" /> Số điện thoại
              </button>
              <button type="button" disabled={isLoading} onClick={() => { void handleQrLogin(); }} className="flex h-11 items-center gap-3 rounded bg-[#3a3a3a] px-3 text-sm font-bold text-white outline-none transition-colors hover:bg-[#464646] focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-not-allowed disabled:opacity-60">
                <SocialIcon type="qr" /> Mã QR
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
