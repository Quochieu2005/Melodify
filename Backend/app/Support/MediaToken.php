<?php

namespace App\Support;

use App\Models\User;

/**
 * A short-lived, signed ticket that only lets a browser play or download media.
 *
 * An <audio> element cannot send an Authorization header, so the player used to put the 30-day login token in
 * the URL, where it ends up in server logs. This ticket goes in the URL instead: it expires within an hour and is
 * accepted only on the media routes, so a leaked URL cannot log in, buy VIP or change anything.
 */
final class MediaToken
{
    private const PURPOSE = 'media';

    /** @return array{token: string, expires_at: string, ttl_seconds: int} */
    public static function issue(User $user): array
    {
        $ttl = max(1, (int) config('auth.media_token_ttl_minutes', 60)) * 60;
        $expiresAt = now()->addSeconds($ttl);
        $payload = self::encode(json_encode([
            'u' => (string) $user->getKey(),
            'e' => $expiresAt->getTimestamp(),
            'p' => self::PURPOSE,
        ], JSON_THROW_ON_ERROR));

        return [
            'token' => $payload.'.'.self::sign($payload),
            'expires_at' => $expiresAt->toISOString(),
            'ttl_seconds' => $ttl,
        ];
    }

    /** The user id the ticket was issued to, or null when it is malformed, tampered with or expired. */
    public static function userId(string $token): ?string
    {
        $parts = explode('.', trim($token));
        if (count($parts) !== 2 || $parts[0] === '' || $parts[1] === '') {
            return null;
        }

        [$payload, $signature] = $parts;
        if (! hash_equals(self::sign($payload), $signature)) {
            return null;
        }

        $data = json_decode(self::decode($payload), true);
        if (! is_array($data)
            || ($data['p'] ?? null) !== self::PURPOSE
            || ! is_string($data['u'] ?? null)
            || $data['u'] === ''
            || (int) ($data['e'] ?? 0) < now()->getTimestamp()) {
            return null;
        }

        return $data['u'];
    }

    private static function sign(string $payload): string
    {
        return self::encode(hash_hmac('sha256', 'melodify-media-token|'.$payload, app('encrypter')->getKey(), true));
    }

    private static function encode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    private static function decode(string $value): string
    {
        return (string) base64_decode(strtr($value, '-_', '+/'), true);
    }
}
