import { spawn, execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const backend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../Backend');
const envPath = path.join(backend, '.env');
const target = new URL(process.argv[2] || 'http://127.0.0.1:8000');
if (target.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(target.hostname)) {
  throw new Error('Chỉ nhận backend HTTP local, ví dụ http://127.0.0.1:8000.');
}
await fetch(target, { redirect: 'manual', signal: AbortSignal.timeout(5000) }).catch(() => {
  throw new Error(`Backend chưa chạy tại ${target.origin}. Chạy composer dev:mobile trong Backend trước.`);
});
const installed = path.join(process.env.LOCALAPPDATA || '', 'MelodifyTools', 'cloudflared-windows-amd64.exe');
const executable = existsSync(installed) ? installed : 'cloudflared';
let child;
let configuredOrigin;
let stopping = false;
const originalLines = new Map();
const clearConfig = () => execFileSync('php', ['artisan', 'config:clear', '--no-interaction'], { cwd: backend, windowsHide: true, stdio: 'pipe' });

function updateCallbacks(origin) {
  let content = readFileSync(envPath, 'utf8');
  for (const provider of ['google', 'facebook']) {
    const key = `${provider.toUpperCase()}_REDIRECT_URI`;
    const pattern = new RegExp(`^${key}=.*$`, 'm');
    originalLines.set(key, content.match(pattern)?.[0] ?? null);
    const line = `${key}=${origin}/auth/${provider}/callback`;
    content = pattern.test(content) ? content.replace(pattern, () => line) : `${content}\n${line}\n`;
  }
  writeFileSync(envPath, content, 'utf8');
  configuredOrigin = origin;
  clearConfig();
  console.log('\nĐã cấu hình callback trong Backend/.env. Thêm các URL sau vào nhà cung cấp:');
  console.log(`Google → Authorized redirect URIs: ${origin}/auth/google/callback`);
  console.log(`Meta → Valid OAuth Redirect URIs: ${origin}/auth/facebook/callback`);
  console.log('\nGiữ tiến trình này chạy. Terminal khác: npm start -- --clear rồi quét QR bằng Expo Go.');
  console.log('Chỉ các trang OAuth được đưa qua tunnel; API của app vẫn chạy LAN. Ctrl+C để dừng.');
}

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  child?.kill();
  proxy.close();
  if (configuredOrigin) {
    let content = readFileSync(envPath, 'utf8');
    for (const [key, original] of originalLines) {
      const provider = key.startsWith('GOOGLE') ? 'google' : 'facebook';
      const expected = `${key}=${configuredOrigin}/auth/${provider}/callback`;
      content = content.split(/\r?\n/).map((line) => line === expected ? original : line).filter((line) => line !== null).join('\n');
    }
    writeFileSync(envPath, content, 'utf8');
    try { clearConfig(); } catch { console.error('Chạy php artisan config:clear trong Backend khi khởi động lại.'); }
  }
  process.exit(code);
}

const proxy = http.createServer((request, response) => {
  const requested = new URL(request.url || '/', 'http://localhost');
  const pathname = requested.pathname;
  const allowed = (request.method === 'GET' && /^\/auth\/(google|facebook)\/callback$/.test(pathname))
    || (['GET', 'POST'].includes(request.method) && /^\/auth\/mobile\/browser\/[A-Za-z0-9]{48}$/.test(pathname));
  if (!allowed) { response.writeHead(404); response.end('Not found'); return; }
  const upstream = http.request(new URL(pathname + requested.search, target.origin), {
    method: request.method, headers: request.headers, timeout: 30000,
  }, (incoming) => {
    if ((incoming.statusCode || 500) >= 500) {
      incoming.resume();
      response.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Backend chưa xử lý được đăng nhập. Quay lại Expo Go để thử lại.');
      return;
    }
    response.writeHead(incoming.statusCode, incoming.headers);
    incoming.pipe(response);
  });
  upstream.on('timeout', () => upstream.destroy(new Error('timeout')));
  upstream.on('error', () => { if (!response.headersSent) response.writeHead(502); response.end('Backend unavailable'); });
  request.on('aborted', () => upstream.destroy());
  request.pipe(upstream);
});
proxy.listen(0, '127.0.0.1', () => {
  const address = proxy.address();
  child = spawn(executable, ['tunnel', '--no-autoupdate', '--protocol', 'http2', '--url', `http://127.0.0.1:${address.port}`], { windowsHide: true });
  let recent = '';
  const readLog = (chunk) => {
    const text = chunk.toString();
    recent = (recent + text).slice(-12000);
    if (!configuredOrigin) {
      const match = recent.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
      if (match) {
        try { updateCallbacks(match[0]); } catch (error) { console.error(error.message); stop(1); }
      }
    }
    if (/Registered tunnel connection/.test(text)) console.log('Tunnel đã kết nối.');
    if (/ERR/.test(text)) console.error(text.trim());
  };
  child.stdout.on('data', readLog);
  child.stderr.on('data', readLog);
  child.on('error', () => { console.error('Không tìm thấy cloudflared. Cài cloudflared rồi chạy lại lệnh.'); stop(1); });
  child.on('exit', (code) => stop(code || 0));
  console.log('Đang tạo HTTPS tạm thời cho backend local…');
});
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
