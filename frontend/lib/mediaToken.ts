import { AUTH_TOKEN_STORAGE_KEY } from "@/lib/api";

// A short-lived ticket that only lets the browser play or download media. An <audio> element cannot send an
// Authorization header, so the player used to put the 30-day login token in the URL, where it ends up in server
// logs. The ticket goes there instead: it expires within an hour and works on the media routes only.

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

type MediaTicket = { token: string; owner: string; expiresAt: number };

let ticket: MediaTicket | null = null;
let inFlight: Promise<string | null> | null = null;

function loginToken(): string | null {
  return typeof window === "undefined" ? null : window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

/** The cached ticket, only while it belongs to the current login and has not expired. */
export function cachedMediaToken(): string | null {
  const owner = loginToken();
  if (!ticket || !owner || ticket.owner !== owner || ticket.expiresAt <= Date.now()) return null;
  return ticket.token;
}

/**
 * Ask the server for a ticket (a plain fetch: apiFetch clears the catalog cache after every POST).
 * Resolves to null when logged out or offline, so callers can fall back instead of failing.
 */
export function fetchMediaToken(force = false): Promise<string | null> {
  const owner = loginToken();
  if (!owner) {
    ticket = null;
    return Promise.resolve(null);
  }
  if (!force) {
    const cached = cachedMediaToken();
    if (cached) return Promise.resolve(cached);
  }
  inFlight ??= fetch(`${API_URL}/v1/auth/media-token`, {
    method: "POST",
    cache: "no-store",
    headers: { Accept: "application/json", Authorization: `Bearer ${owner}` },
  })
    .then(async (response) => {
      if (!response.ok) return null;
      const body = (await response.json()) as { token?: string; ttl_seconds?: number };
      if (!body.token) return null;
      // Stop using it two minutes early so a request never starts with a ticket about to expire.
      const ttlMs = Math.max(60, (body.ttl_seconds ?? 600) - 120) * 1000;
      ticket = { token: body.token, owner, expiresAt: Date.now() + ttlMs };
      return body.token;
    })
    .catch(() => null)
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

function withTicket(url: string, token: string): string {
  const parsed = new URL(url, window.location.origin);
  parsed.searchParams.delete("access_token");
  parsed.searchParams.set("media_token", token);
  // Keep a relative URL relative.
  return /^[a-z][a-z0-9+.-]*:/i.test(url) ? parsed.toString() : `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

/** The URL carrying the cached ticket, or null when there is none yet (callers then use the old token). */
export function attachMediaToken(url: string): string | null {
  if (typeof window === "undefined") return null;
  const token = cachedMediaToken();
  return token ? withTicket(url, token) : null;
}

/**
 * For a URL that already carries a token (a saved queue, an expired ticket): swap in the current ticket, which
 * also drops the old login token from the URL. Any other URL is returned unchanged.
 */
export function refreshMediaToken(url: string): string {
  if (typeof window === "undefined" || !/[?&](media_token|access_token)=/.test(url)) return url;
  const token = cachedMediaToken();
  return token ? withTicket(url, token) : url;
}
