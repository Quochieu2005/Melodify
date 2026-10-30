import { API_URL, exchangeSocialLoginTicket, saveAuthSession } from './api';

// The auth-session listener and the deep-link route can receive the same ticket.
let completion: { ticket: string; promise: Promise<void> } | undefined;
const configuredOAuthBase = process.env.EXPO_PUBLIC_OAUTH_BASE_URL?.trim().replace(/\/api\/?$/, '').replace(/\/+$/, '');
const oauthApiBase = configuredOAuthBase && !/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(configuredOAuthBase)
  ? `${configuredOAuthBase}/api`
  : API_URL;

export function completeSocialLogin(ticket: string, apiBaseUrl = oauthApiBase): Promise<void> {
  if (completion?.ticket === ticket) return completion.promise;
  const promise = exchangeSocialLoginTicket(ticket, apiBaseUrl).then(saveAuthSession);
  completion = { ticket, promise };
  return promise;
}
