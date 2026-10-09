<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\ApiTokenService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class QrAuthController extends Controller
{
    private const SESSION_CACHE_PREFIX = 'api-qr-login:session:';

    private const TOKEN_CACHE_PREFIX = 'api-qr-login:token:';

    public function __construct(private readonly ApiTokenService $tokens) {}

    public function start(Request $request): JsonResponse
    {
        $data = $request->validate([
            'device_name' => ['nullable', 'string', 'max:100'],
            'remember' => ['sometimes', 'boolean'],
        ]);

        $sessionId = (string) Str::uuid();
        $qrToken = Str::random(64);
        $pollToken = Str::random(64);
        $expiresAt = now()->addMinutes(3);

        $session = [
            'session_id' => $sessionId,
            'qr_token_hash' => hash('sha256', $qrToken),
            'poll_token_hash' => hash('sha256', $pollToken),
            'device_name' => $data['device_name'] ?? 'qr-web',
            'remember' => array_key_exists('remember', $data) ? $request->boolean('remember') : null,
            'status' => 'pending',
            'expires_at' => $expiresAt->toIso8601String(),
        ];

        $this->storeSession($session, $expiresAt);
        Cache::put($this->tokenCacheKey($session['qr_token_hash']), $sessionId, $expiresAt);

        return response()->json([
            'session_id' => $sessionId,
            'qr_payload' => "melodify://login?session={$sessionId}&token={$qrToken}",
            'poll_token' => $pollToken,
            'status' => 'pending',
            'expires_at' => $expiresAt->toISOString(),
            'poll_interval_seconds' => 2,
        ]);
    }

    public function scan(Request $request): JsonResponse
    {
        $data = $request->validate([
            'qr_payload' => ['nullable', 'string', 'max:4096'],
            'qr_token' => ['nullable', 'string', 'min:32', 'max:128'],
        ]);

        $token = $data['qr_token'] ?? $this->tokenFromPayload($data['qr_payload'] ?? '');

        if (! $token) {
            return response()->json(['message' => 'QR code không hợp lệ.'], 422);
        }

        $qrTokenHash = hash('sha256', $token);
        $sessionId = Cache::get($this->tokenCacheKey($qrTokenHash));
        $session = is_string($sessionId) ? $this->getSession($sessionId) : null;
        $expiresAt = is_array($session) && isset($session['expires_at'])
            ? Carbon::parse($session['expires_at'])
            : null;

        if (! is_array($session)
            || ($session['qr_token_hash'] ?? null) !== $qrTokenHash
            || ($session['status'] ?? null) !== 'pending'
            || ! $expiresAt
            || $expiresAt->isPast()
        ) {
            return response()->json(['message' => 'QR code đã hết hạn hoặc đã được sử dụng.'], 422);
        }

        $session['status'] = 'approved';
        $session['approved_user_id'] = (string) $request->user()->getKey();
        $session['approved_at'] = now()->toIso8601String();
        $this->storeSession($session, $expiresAt);

        return response()->json(['message' => 'Đã duyệt đăng nhập trên thiết bị mới.', 'status' => 'approved']);
    }

    public function status(Request $request, string $sessionId): JsonResponse
    {
        $data = $request->validate([
            'poll_token' => ['required', 'string', 'min:32', 'max:128'],
        ]);

        $session = $this->getSession($sessionId);

        if (! is_array($session)
            || ! hash_equals((string) ($session['poll_token_hash'] ?? ''), hash('sha256', $data['poll_token']))
        ) {
            return response()->json(['message' => 'Phiên QR không hợp lệ.'], 404);
        }

        $expiresAt = Carbon::parse((string) ($session['expires_at'] ?? now()->toIso8601String()));

        if (in_array($session['status'] ?? null, ['pending', 'approved'], true) && $expiresAt->isPast()) {
            $session['status'] = 'expired';
            $this->storeSession($session, now()->addMinute());
        }

        if (($session['status'] ?? null) !== 'approved') {
            return response()->json(['status' => $session['status'] ?? 'expired']);
        }

        $user = User::find($session['approved_user_id'] ?? null);

        if (! $user || ($user->status ?? 'active') !== 'active') {
            $session['status'] = 'expired';
            $this->storeSession($session, now()->addMinute());

            return response()->json(['message' => 'Tài khoản QR không tồn tại hoặc đã bị khóa.'], 403);
        }

        $session['status'] = 'completed';
        $session['completed_at'] = now()->toIso8601String();
        $this->storeSession($session, now()->addMinutes(5));

        $user->forceFill([
            'last_login_at' => now(),
            'last_login_method' => 'qr',
        ])->save();

        return response()->json([
            'message' => 'Đăng nhập QR thành công.',
            'status' => 'completed',
        ] + $this->tokens->issue($user, $session['device_name'] ?: 'qr-web', $session['remember'] ?? null));
    }

    private function getSession(string $sessionId): mixed
    {
        return Cache::get(self::SESSION_CACHE_PREFIX.$sessionId);
    }

    private function storeSession(array $session, \DateTimeInterface $expiration): void
    {
        Cache::put(self::SESSION_CACHE_PREFIX.$session['session_id'], $session, $expiration);
    }

    private function tokenCacheKey(string $tokenHash): string
    {
        return self::TOKEN_CACHE_PREFIX.$tokenHash;
    }

    private function tokenFromPayload(string $payload): ?string
    {
        $parts = parse_url($payload);
        parse_str((string) ($parts['query'] ?? ''), $query);

        return isset($query['token']) && is_string($query['token']) ? $query['token'] : null;
    }
}
