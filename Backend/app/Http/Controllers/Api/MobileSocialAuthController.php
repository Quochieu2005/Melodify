<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\ApiTokenService;
use App\Services\SocialAccountService;
use App\Services\SocialAuthException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Laravel\Socialite\Socialite;
use Throwable;

class MobileSocialAuthController extends Controller
{
    private const PROVIDERS = ['google', 'facebook'];
    private const FLOW_SESSION_KEY = 'mobile_social_auth_flow';
    private const TICKET_PREFIX = 'mobile-social-auth:';

    public function __construct(
        private readonly ApiTokenService $tokens,
        private readonly SocialAccountService $accounts,
    ) {}

    public function redirectToProvider(Request $request, string $provider): RedirectResponse
    {
        abort_unless(in_array($provider, self::PROVIDERS, true), 404);

        $mobileRedirect = (string) $request->query(
            'redirect_uri',
            config("services.{$provider}.mobile_redirect", 'mobile://oauth/callback'),
        );
        if (! $this->isAllowedMobileRedirect($mobileRedirect)) {
            abort(503, 'Mobile OAuth redirect URI phải dùng mobile://oauth/callback.');
        }

        if (! filled(config("services.{$provider}.client_id")) || ! filled(config("services.{$provider}.client_secret"))) {
            return redirect()->away($this->mobileCallbackUrl($mobileRedirect, ['error' => 'provider_not_configured']));
        }

        $request->session()->put(self::FLOW_SESSION_KEY, [
            'provider' => $provider,
            'redirect' => $mobileRedirect,
            'started_at' => now()->timestamp,
        ]);

        return Socialite::driver($provider)->redirect();
    }

    public function handleProviderCallback(Request $request, string $provider): RedirectResponse
    {
        abort_unless(in_array($provider, self::PROVIDERS, true), 404);

        $flow = $request->session()->pull(self::FLOW_SESSION_KEY);
        $mobileRedirect = is_array($flow) && ($flow['provider'] ?? null) === $provider
            ? (string) ($flow['redirect'] ?? '')
            : (string) config("services.{$provider}.mobile_redirect", 'mobile://oauth/callback');

        if (! $this->isAllowedMobileRedirect($mobileRedirect)
            || ! is_array($flow)
            || ($flow['provider'] ?? null) !== $provider
            || now()->timestamp - (int) ($flow['started_at'] ?? 0) > 600) {
            return redirect()->away($this->mobileCallbackUrl($mobileRedirect, ['error' => 'login_expired']));
        }

        if ($request->filled('error')) {
            return redirect()->away($this->mobileCallbackUrl($mobileRedirect, ['error' => 'login_cancelled']));
        }

        try {
            $socialUser = Socialite::driver($provider)->user();
            $user = $this->accounts->resolveUser($provider, $socialUser);
        } catch (SocialAuthException $exception) {
            report($exception);

            return redirect()->away($this->mobileCallbackUrl($mobileRedirect, ['error' => 'account_unavailable']));
        } catch (Throwable $exception) {
            report($exception);

            return redirect()->away($this->mobileCallbackUrl($mobileRedirect, ['error' => 'provider_error']));
        }

        $ticket = Str::random(64);
        Cache::put(self::TICKET_PREFIX.hash('sha256', $ticket), [
            'user_id' => (string) $user->getKey(),
            'provider' => $provider,
        ], now()->addMinutes(2));

        return redirect()->away($this->mobileCallbackUrl($mobileRedirect, ['ticket' => $ticket]));
    }

    public function exchangeTicket(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ticket' => ['required', 'string', 'size:64'],
            'device_name' => ['nullable', 'string', 'max:100'],
        ]);

        $ticketData = Cache::pull(self::TICKET_PREFIX.hash('sha256', $data['ticket']));
        if (! is_array($ticketData) || empty($ticketData['user_id'])) {
            return response()->json(['message' => 'Liên kết đăng nhập đã hết hạn hoặc đã được sử dụng. Vui lòng thử lại.'], 410);
        }

        $user = User::find((string) $ticketData['user_id']);
        if (! $user || ($user->status ?? 'active') !== 'active') {
            return response()->json(['message' => 'Tài khoản không còn khả dụng.'], 403);
        }

        return response()->json([
            'message' => 'Đăng nhập thành công.',
        ] + $this->tokens->issue($user, $data['device_name'] ?? 'melodify-mobile', true));
    }

    private function isAllowedMobileRedirect(string $redirect): bool
    {
        $parts = parse_url($redirect);
        if (! is_array($parts)
            || isset($parts['user'])
            || isset($parts['pass'])
            || isset($parts['fragment'])
            || isset($parts['query'])) {
            return false;
        }

        if (($parts['scheme'] ?? null) === 'mobile') {
            return ($parts['host'] ?? null) === 'oauth'
                && ($parts['path'] ?? null) === '/callback'
                && ! isset($parts['port']);
        }

        if (($parts['scheme'] ?? null) !== 'exp' || ! isset($parts['host'], $parts['port'])) {
            return false;
        }

        $host = strtolower((string) $parts['host']);
        $isLocalIp = filter_var($host, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4) !== false;
        $isExpoHost = $host === 'u.expo.dev' || str_ends_with($host, '.exp.direct');
        $port = (int) $parts['port'];
        $path = (string) ($parts['path'] ?? '');
        $isCallbackPath = preg_match('~^/(?:--/|[^/]+/--/)oauth/callback$~', $path) === 1;

        return ($isLocalIp || $isExpoHost)
            && $port >= 1 && $port <= 65535
            && $isCallbackPath;
    }

    private function mobileCallbackUrl(string $redirect, array $query): string
    {
        $separator = str_contains($redirect, '?') ? '&' : '?';

        return $redirect.$separator.http_build_query($query, '', '&', PHP_QUERY_RFC3986);
    }
}
