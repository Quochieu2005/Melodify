<?php

namespace App\Support;

final class PublicUrl
{
    /**
     * True when the URL is plain http(s) and does not point at a private, loopback or link-local address.
     * Used before the server fetches a URL on behalf of a visitor (SSRF guard). A host that does not resolve
     * is allowed: it cannot reach an internal service and the fetch simply fails.
     */
    public static function isSafe(string $url): bool
    {
        $parts = parse_url($url);
        if (! is_array($parts)
            || ! in_array(strtolower((string) ($parts['scheme'] ?? '')), ['http', 'https'], true)
            || ($parts['host'] ?? '') === ''
            || isset($parts['user'])
            || isset($parts['pass'])) {
            return false;
        }

        $host = strtolower(trim((string) $parts['host'], '[]'));
        if ($host === 'localhost' || str_ends_with($host, '.localhost') || str_ends_with($host, '.local') || str_ends_with($host, '.internal')) {
            return false;
        }

        $addresses = filter_var($host, FILTER_VALIDATE_IP) !== false
            ? [$host]
            : [...(gethostbynamel($host) ?: []), ...array_column(@dns_get_record($host, DNS_AAAA) ?: [], 'ipv6')];

        foreach ($addresses as $address) {
            if (filter_var($address, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false) {
                return false;
            }
        }

        return true;
    }
}
