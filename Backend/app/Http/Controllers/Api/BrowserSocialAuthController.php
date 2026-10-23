<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\ApiTokenService;
use App\Services\SocialAccountService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Str;
use Laravel\Socialite\Socialite;
use Throwable;

class BrowserSocialAuthController extends Controller
{
    public const FLOW_KEY = 'browser_social_auth_flow';

    private const PREFIX = 'browser-social-auth:';

    public function __construct(private readonly ApiTokenService $tokens, private readonly SocialAccountService $accounts) {}

    public function start(Request $request): JsonResponse
    {
        $data = $request->validate(['provider' => ['required', 'in:google,facebook']]);
        $provider = $data['provider'];
        $callback = (string) config("services.{$provider}.redirect");
        $parts = parse_url($callback);
        $host = strtolower($parts['host'] ?? '');
        if (($parts['scheme'] ?? '') !== 'https' || $host === '' || $host === 'localhost'
            || filter_var($host, FILTER_VALIDATE_IP) !== false
            || ($parts['path'] ?? '') !== "/auth/{$provider}/callback"
            || isset($parts['user']) || isset($parts['pass']) || isset($parts['query']) || isset($parts['fragment'])) {
            return $this->json(['message' => 'Backend đang dùng callback local hoặc chưa hợp lệ. Đăng nhập trên iPhone cần GOOGLE_REDIRECT_URI / FACEBOOK_REDIRECT_URI là URL HTTPS của backend local qua tunnel và đăng ký đúng URL đó trong Google/Meta.', 'code' => 'oauth_callback_not_public'], 503);
        }
        if (! config("services.{$provider}.client_id") || ! config("services.{$provider}.client_secret")) {
            return $this->json(['message' => 'Backend chưa có cấu hình Google/Facebook.', 'code' => 'provider_not_configured'], 503);
        }
        $id = Str::random(48);
        $proof = Str::random(64);
        $code = (string) random_int(10000000, 99999999);
        $expires = now()->addMinutes(10)->timestamp;
        Cache::put(self::PREFIX.$id, [
            'provider' => $provider, 'proof' => hash('sha256', $proof),
            'code' => hash('sha256', $code), 'attempts' => 0,
            'status' => 'pending', 'expires' => $expires,
        ], 600);
        $origin = 'https://'.$host.(isset($parts['port']) ? ':'.$parts['port'] : '');

        return $this->json([
            'session_id' => $id, 'poll_token' => $proof, 'pairing_code' => $code,
            'expires_at' => $expires * 1000,
            'browser_url' => $origin.route('social.browser.show', ['id' => $id], false),
        ]);
    }

    public function show(string $id): Response
    {
        $flow = $this->flow($id);

        return $this->page(['id' => $id, 'provider' => $flow['provider'], 'enterCode' => $flow['status'] === 'pending']);
    }

    public function authorizeBrowser(Request $request, string $id): Response|RedirectResponse
    {
        $data = $request->validate(['code' => ['required', 'digits:8']]);
        $result = Cache::lock(self::PREFIX.$id.':lock', 30)->block(3, function () use ($request, $id, $data) {
            $flow = $this->flow($id);
            abort_unless($flow['status'] === 'pending' && $flow['attempts'] < 5, 410, 'Phiên đã được sử dụng hoặc hết lượt thử.');
            $flow['attempts']++;
            if (! hash_equals($flow['code'], hash('sha256', $data['code']))) {
                $this->store($id, $flow);

                return false;
            }
            $flow['status'] = 'authorizing';
            $this->store($id, $flow);
            $request->session()->regenerate();
            $request->session()->forget('mobile_social_auth_flow');
            $request->session()->put(self::FLOW_KEY, ['id' => $id, 'provider' => $flow['provider']]);

            return Socialite::driver($flow['provider'])->redirect();
        });
        if ($result === false) {
            return $this->page(['id' => $id, 'provider' => $this->flow($id)['provider'], 'enterCode' => true, 'message' => 'Mã chưa đúng. Nhập 8 số đang hiện trong app Melodify.']);
        }

        return $result;
    }

    public function callback(Request $request, string $provider): Response
    {
        $binding = $request->session()->pull(self::FLOW_KEY);
        abort_unless(is_array($binding) && ($binding['provider'] ?? '') === $provider, 410);
        $id = $binding['id'];
        $flow = $this->flow($id);
        abort_unless($flow['status'] === 'authorizing', 410);
        $user = null;
        try {
            if (! $request->filled('error')) {
                $user = $this->accounts->resolveUser($provider, Socialite::driver($provider)->user());
            }
        } catch (Throwable $exception) {
            report($exception);
        }
        Cache::lock(self::PREFIX.$id.':lock', 30)->block(3, function () use ($id, $user) {
            $flow = $this->flow($id);
            abort_unless($flow['status'] === 'authorizing', 410);
            $flow['status'] = $user ? 'approved' : 'failed';
            $flow['user_id'] = $user ? (string) $user->getKey() : null;
            $this->store($id, $flow);
        });

        return $this->page(['message' => $user
            ? 'Đăng nhập thành công. Đóng trang này và quay lại Expo Go để tiếp tục trong Melodify.'
            : 'Đăng nhập đã bị hủy hoặc nhà cung cấp từ chối. Quay lại Expo Go để thử lại.']);
    }

    public function poll(Request $request): JsonResponse
    {
        $data = $request->validate([
            'session_id' => ['required', 'alpha_num:ascii', 'size:48'],
            'poll_token' => ['required', 'string', 'size:64'],
            'cancel' => ['sometimes', 'boolean'],
        ]);
        $id = $data['session_id'];

        return Cache::lock(self::PREFIX.$id.':lock', 30)->block(3, function () use ($data, $id) {
            $flow = $this->flow($id);
            abort_unless(hash_equals($flow['proof'], hash('sha256', $data['poll_token'])), 404);
            if ($data['cancel'] ?? false) {
                Cache::forget(self::PREFIX.$id);

                return $this->json(['status' => 'cancelled']);
            }
            if ($flow['status'] === 'completed') {
                return $this->json(['status' => 'completed', 'auth' => json_decode(Crypt::decryptString($flow['result']), true)]);
            }
            if ($flow['status'] !== 'approved') {
                return $this->json(['status' => $flow['status']]);
            }
            $user = User::find($flow['user_id']);
            abort_unless($user && ($user->status ?? 'active') === 'active', 403);
            $auth = ['message' => 'Đăng nhập thành công.'] + $this->tokens->issue($user, 'melodify-expo-go', true);
            $flow['status'] = 'completed';
            $flow['result'] = Crypt::encryptString(json_encode($auth, JSON_THROW_ON_ERROR));
            $flow['expires'] = min($flow['expires'], now()->addMinute()->timestamp);
            $this->store($id, $flow);

            return $this->json(['status' => 'completed', 'auth' => $auth]);
        });
    }

    private function flow(string $id): array
    {
        $flow = Cache::get(self::PREFIX.$id);
        abort_unless(is_array($flow) && $flow['expires'] > now()->timestamp, 410, 'Phiên đăng nhập hết hạn. Quay lại app để thử lại.');

        return $flow;
    }

    private function store(string $id, array $flow): void
    {
        Cache::put(self::PREFIX.$id, $flow, max(1, $flow['expires'] - now()->timestamp));
    }

    private function page(array $data): Response
    {
        return response()->view('auth.browser-social', $data)->withHeaders([
            'Cache-Control' => 'no-store, private', 'Referrer-Policy' => 'no-referrer',
            'X-Frame-Options' => 'DENY',
            'Content-Security-Policy' => "default-src 'none'; style-src 'unsafe-inline'; form-action 'self' https://accounts.google.com https://www.facebook.com; frame-ancestors 'none'",
        ]);
    }

    private function json(array $data, int $status = 200): JsonResponse
    {
        return response()->json($data, $status)->header('Cache-Control', 'no-store, private');
    }
}
