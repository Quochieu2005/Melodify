<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ApiTokenService;
use App\Services\SocialAccountService;
use App\Services\SocialAuthException;
use GuzzleHttp\Exception\ConnectException;
use GuzzleHttp\Exception\RequestException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Laravel\Socialite\Socialite;
use Throwable;

class SocialAuthController extends Controller
{
    private const PROVIDERS = ['google', 'facebook'];

    public function __construct(
        private readonly ApiTokenService $tokens,
        private readonly SocialAccountService $accounts,
    ) {}

    public function login(Request $request, ?string $provider = null): JsonResponse
    {
        $rules = [
            'access_token' => ['required', 'string', 'min:20', 'max:4096'],
            'device_name' => ['nullable', 'string', 'max:100'],
            'remember' => ['sometimes', 'boolean'],
        ];

        if ($provider === null) {
            $rules['provider'] = ['required', 'in:google,facebook'];
        }

        $data = $request->validate($rules);

        $provider = $provider ?: $data['provider'];

        if (! in_array($provider, self::PROVIDERS, true)) {
            return response()->json(['message' => 'Nhà cung cấp đăng nhập không được hỗ trợ.'], 422);
        }

        return $this->authenticateWithAccessToken(
            $provider,
            $data['access_token'],
            $data['device_name'] ?? null,
            array_key_exists('remember', $data) ? $request->boolean('remember') : null,
            verifyAudience: true,
        );
    }

    public function exchange(Request $request): JsonResponse
    {
        $data = $request->validate([
            'provider' => ['required', 'in:google,facebook'],
            'code' => ['required', 'string', 'min:8', 'max:4096'],
            'client_id' => ['required', 'string', 'max:512'],
            'redirect_uri' => ['required', 'string', 'max:2048'],
            'code_verifier' => ['nullable', 'string', 'min:43', 'max:128'],
            'device_name' => ['nullable', 'string', 'max:100'],
            'remember' => ['sometimes', 'boolean'],
        ]);

        $provider = $data['provider'];
        $expectedRedirect = (string) config("services.{$provider}.mobile_redirect", '');
        if ($expectedRedirect === '' || ! hash_equals($expectedRedirect, $data['redirect_uri'])) {
            return response()->json(['message' => 'OAuth redirect URI chưa được cấu hình đúng trên Backend.'], 503);
        }

        $form = [
            'client_id' => $data['client_id'],
            'code' => $data['code'],
            'redirect_uri' => $data['redirect_uri'],
            'grant_type' => 'authorization_code',
        ];

        if ($provider === 'google') {
            $allowedClientIds = array_filter(array_merge(
                [(string) config('services.google.client_id', '')],
                explode(',', (string) config('services.google.mobile_client_ids', '')),
            ));
            $allowedClientIds = array_map('trim', $allowedClientIds);
            if (! in_array($data['client_id'], $allowedClientIds, true)) {
                return response()->json(['message' => 'Google OAuth Client ID chưa được cho phép trên Backend.'], 503);
            }
            if (! empty($data['code_verifier'])) {
                $form['code_verifier'] = $data['code_verifier'];
            } else {
                return response()->json(['message' => 'Thiếu PKCE code verifier của Google.'], 422);
            }
            // Native Google OAuth clients are public clients and do not use a
            // client secret. A configured web client may still use its secret.
            if ($data['client_id'] === (string) config('services.google.client_id', '')
                && (string) config('services.google.client_secret', '') !== '') {
                $form['client_secret'] = (string) config('services.google.client_secret');
            }
            $tokenEndpoint = 'https://oauth2.googleapis.com/token';
        } else {
            $facebookClientId = (string) config('services.facebook.client_id', '');
            $facebookSecret = (string) config('services.facebook.client_secret', '');
            if ($facebookClientId === '' || $facebookSecret === '' || ! hash_equals($facebookClientId, $data['client_id'])) {
                return response()->json(['message' => 'Facebook App ID/Secret chưa được cấu hình đúng trên Backend.'], 503);
            }
            $form['client_secret'] = $facebookSecret;
            $version = (string) config('services.facebook.graph_version', 'v23.0');
            $tokenEndpoint = "https://graph.facebook.com/{$version}/oauth/access_token";
        }

        try {
            $tokenResponse = Http::asForm()->acceptJson()->timeout(12)->post($tokenEndpoint, $form);
        } catch (Throwable $exception) {
            report($exception);

            return response()->json(['message' => "Không thể kết nối {$provider} lúc này."], 503);
        }

        $accessToken = $tokenResponse->json('access_token');
        if (! $tokenResponse->successful() || ! is_string($accessToken) || $accessToken === '') {
            return response()->json(['message' => "{$provider} không chấp nhận mã đăng nhập. Vui lòng thử lại."], 422);
        }

        return $this->authenticateWithAccessToken(
            $provider,
            $accessToken,
            $data['device_name'] ?? 'melodify-mobile',
            array_key_exists('remember', $data) ? $request->boolean('remember') : true,
        );
    }

    /**
     * A token handed to us by a client may have been issued to another app (a malicious "Sign in with Google"
     * button). Only trust it when the provider says it was issued to one of our own apps. Tokens we got by
     * exchanging a code ourselves are already ours and skip this.
     */
    private function audienceError(string $provider, string $accessToken): ?JsonResponse
    {
        try {
            if ($provider === 'google') {
                $allowed = array_values(array_filter(array_map('trim', array_merge(
                    [(string) config('services.google.client_id', '')],
                    explode(',', (string) config('services.google.mobile_client_ids', '')),
                ))));
                if ($allowed === []) {
                    return response()->json(['message' => 'Google Client ID chưa được cấu hình trên Backend.', 'code' => 'provider_not_configured'], 503);
                }
                $info = Http::acceptJson()->timeout(8)->get('https://oauth2.googleapis.com/tokeninfo', ['access_token' => $accessToken]);
                if ($info->serverError()) {
                    return response()->json(['message' => 'Google đang tạm thời không khả dụng.', 'code' => 'provider_unavailable'], 503);
                }
                $valid = $info->successful()
                    && (in_array((string) $info->json('aud'), $allowed, true) || in_array((string) $info->json('azp'), $allowed, true));
            } else {
                $appId = (string) config('services.facebook.client_id', '');
                $secret = (string) config('services.facebook.client_secret', '');
                if ($appId === '' || $secret === '') {
                    return response()->json(['message' => 'Facebook App ID/Secret chưa được cấu hình trên Backend.', 'code' => 'provider_not_configured'], 503);
                }
                $version = (string) config('services.facebook.graph_version', 'v23.0');
                $info = Http::acceptJson()->timeout(8)->get("https://graph.facebook.com/{$version}/debug_token", [
                    'input_token' => $accessToken,
                    'access_token' => $appId.'|'.$secret,
                ]);
                if ($info->serverError()) {
                    return response()->json(['message' => 'Facebook đang tạm thời không khả dụng.', 'code' => 'provider_unavailable'], 503);
                }
                $valid = $info->successful()
                    && $info->json('data.is_valid') === true
                    && hash_equals($appId, (string) $info->json('data.app_id'));
            }
        } catch (Throwable $exception) {
            report($exception);

            return response()->json(['message' => 'Không thể xác minh token Google/Facebook lúc này.', 'code' => 'provider_unavailable'], 503);
        }

        return $valid ? null : response()->json(['message' => 'Access token không được cấp cho ứng dụng Melodify.', 'code' => 'invalid_social_token'], 422);
    }

    private function authenticateWithAccessToken(string $provider, string $accessToken, ?string $deviceName, ?bool $remember, bool $verifyAudience = false): JsonResponse
    {
        if ($verifyAudience && ($error = $this->audienceError($provider, $accessToken))) {
            return $error;
        }

        try {
            $socialUser = Socialite::driver($provider)->userFromToken($accessToken);
        } catch (ConnectException $exception) {
            return response()->json(['message' => 'Backend chưa kết nối được Google/Facebook. Vui lòng thử lại.', 'code' => 'provider_unavailable'], 503);
        } catch (RequestException $exception) {
            $status = $exception->getResponse()?->getStatusCode();
            if ($status === null || $status === 429 || $status >= 500) {
                return response()->json(['message' => 'Google/Facebook đang phản hồi chậm hoặc tạm thời không khả dụng.', 'code' => 'provider_unavailable'], 503);
            }

            return response()->json(['message' => 'Access token Google/Facebook không hợp lệ hoặc đã hết hạn.', 'code' => 'invalid_social_token'], 422);
        } catch (Throwable $exception) {
            return response()->json([
                'message' => 'Không thể xử lý đăng nhập Google/Facebook lúc này.',
                'code' => 'social_login_unavailable',
            ], 503);
        }

        try {
            $user = $this->accounts->resolveUser($provider, $socialUser);
        } catch (SocialAuthException $exception) {
            return response()->json(['message' => $exception->getMessage()], $exception->status);
        }

        return response()->json([
            'message' => $user->wasRecentlyCreated ? 'Đăng ký tài khoản thành công.' : 'Đăng nhập thành công.',
            'is_new_user' => $user->wasRecentlyCreated,
        ] + $this->tokens->issue($user, $deviceName, $remember));
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['user' => $this->tokens->userPayload($request->user())]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->attributes->get('api_token')?->delete();

        return response()->json(['message' => 'Đăng xuất thành công.']);
    }
}
