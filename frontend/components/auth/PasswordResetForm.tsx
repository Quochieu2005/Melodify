'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { apiFetch } from '@/lib/api';

export default function PasswordResetForm({ onBack, initialEmail, light = false }: { onBack: () => void; initialEmail: string; light?: boolean }) {
  const [step, setStep] = useState<'email' | 'otp' | 'password' | 'done'>('email');
  const [email, setEmail] = useState(initialEmail.includes('@') ? initialEmail : '');
  const [code, setCode] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(0);
  const remaining = Math.max(0, Math.ceil((resendAt - now) / 1000));
  const fieldClass = `mt-2 block h-12 w-full rounded-lg border px-3 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 ${light ? 'border-slate-300 bg-white' : 'border-white/20 bg-white/5'}`;

  useEffect(() => {
    if (!resendAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [resendAt]);

  async function sendCode() {
    const result = await apiFetch<{ message: string; resend_after_seconds?: number }>('/v1/auth/password/forgot', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim() }),
    });
    setNotice(result.message);
    setNow(Date.now());
    setResendAt(Date.now() + (result.resend_after_seconds ?? 60) * 1000);
    setStep('otp');
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError('');
    try {
      if (step === 'email') await sendCode();
      else if (step === 'otp') {
        const result = await apiFetch<{ reset_token: string }>('/v1/auth/password/verify-otp', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim(), code }),
        });
        setToken(result.reset_token);
        setNotice('Mã xác thực chính xác. Hãy chọn mật khẩu mới.');
        setStep('password');
      } else if (step === 'password') {
        const result = await apiFetch<{ message: string }>('/v1/auth/password/reset', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), reset_token: token, password, password_confirmation: confirmation }),
        });
        setPassword('');
        setConfirmation('');
        setToken('');
        setNotice(result.message);
        setStep('done');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể đặt lại mật khẩu. Vui lòng thử lại.');
    } finally {
      setPending(false);
    }
  }

  return <form onSubmit={(event) => void submit(event)} className={`w-full ${light ? 'text-[#26343c]' : 'text-white'}`}>
    <h2 className="text-2xl font-bold">Khôi phục mật khẩu</h2>
    <p className="mt-2 text-sm opacity-65">{step === 'email' ? 'Nhập email đã đăng ký để nhận mã xác thực.' : step === 'otp' ? `Nhập mã 6 chữ số đã gửi đến ${email}.` : step === 'password' ? 'Mật khẩu mới tối thiểu 8 ký tự và khác mật khẩu cũ.' : 'Bạn có thể đăng nhập bằng mật khẩu mới.'}</p>
    {step === 'email' ? <label className="mt-5 block text-sm">Email<input autoFocus type="email" autoComplete="email" required maxLength={160} value={email} onChange={(event) => setEmail(event.target.value)} className={fieldClass} /></label> : null}
    {step === 'otp' ? <label className="mt-5 block text-sm">Mã OTP<input autoFocus type="text" inputMode="numeric" autoComplete="one-time-code" required pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} className={`${fieldClass} tracking-[0.3em]`} /></label> : null}
    {step === 'password' ? <><label className="mt-5 block text-sm">Mật khẩu mới<input autoFocus type="password" autoComplete="new-password" required minLength={8} maxLength={72} value={password} onChange={(event) => setPassword(event.target.value)} className={fieldClass} /></label><label className="mt-4 block text-sm">Xác nhận mật khẩu<input type="password" autoComplete="new-password" required minLength={8} maxLength={72} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className={fieldClass} /></label></> : null}
    {notice ? <p role="status" className={`mt-4 text-sm ${light ? 'text-[#168bd8]' : 'text-cyan-300'}`}>{notice}</p> : null}
    {error ? <p role="alert" className={`mt-4 text-sm ${light ? 'text-red-600' : 'text-rose-300'}`}>{error}</p> : null}
    {step !== 'done' ? <button type="submit" disabled={pending} className="mt-5 h-12 w-full rounded-full bg-[#00cfe3] font-bold text-[#07363a] hover:bg-[#34dbea] disabled:opacity-50">{pending ? 'Đang xử lý…' : step === 'email' ? 'Gửi mã xác thực' : step === 'otp' ? 'Xác thực mã' : 'Đặt lại mật khẩu'}</button> : null}
    {step === 'otp' ? <button type="button" disabled={pending || remaining > 0} onClick={async () => { setPending(true); setError(''); try { await sendCode(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không gửi được mã.'); } finally { setPending(false); } }} className="mt-4 block text-sm font-semibold disabled:opacity-50">{remaining > 0 ? `Gửi lại sau ${remaining}s` : 'Gửi lại mã'}</button> : null}
    <button type="button" disabled={pending} onClick={onBack} className="mt-5 text-sm font-semibold opacity-75 hover:opacity-100 disabled:opacity-40">Quay lại đăng nhập</button>
  </form>;
}
