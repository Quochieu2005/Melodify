<?php

namespace App\Http\Requests\Admin;

use App\Models\Artist;
use App\Models\Album;
use App\Models\User;
use App\Rules\PlainText;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AdminResourceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth('admin')->check();
    }

    protected function prepareForValidation(): void
    {
        $resource = explode('.', (string) $this->route()?->getName())[1] ?? '';

        $clean = [];
        foreach ($this->all() as $key => $value) {
            if (is_string($value) && ! in_array($key, ['password', 'password_confirmation'], true)) {
                $clean[$key] = trim($value);
            }
        }

        if ($clean !== []) {
            $this->merge($clean);
        }

        if ($resource === 'admins' && $this->filled('email')) {
            $this->merge(['email' => Str::lower(trim((string) $this->input('email')))]);
        }
    }

    public function rules(): array
    {
        $resource = explode('.', (string) $this->route()?->getName())[1] ?? '';
        $routeId = $this->route($this->routeParameterName($resource));

        return match ($resource) {
            'songs' => [
                'title' => ['required', 'string', 'max:160', new PlainText()],
                'slug' => ['required', 'alpha_dash', 'max:180', new PlainText(), Rule::unique('songs', 'slug')->ignore($routeId)],
                'album_id' => ['nullable', 'string', 'max:64'],
                'release_date' => ['nullable', 'date'],
                'duration_seconds' => ['nullable', 'integer', 'min:0', 'max:86400'],
                'explicit' => ['nullable', 'boolean'],
                'status' => ['required', 'in:draft,published,blocked'],
            ],
            'albums' => [
                'title' => ['required', 'string', 'max:160', new PlainText()],
                'slug' => ['required', 'alpha_dash', 'max:180', new PlainText(), Rule::unique('albums', 'slug')->ignore($routeId)],
                'artist_id' => ['required', 'string', 'max:64'],
                'release_date' => ['nullable', 'date'],
                'cover_url' => ['nullable', 'url', 'max:500', new PlainText()],
                'status' => ['required', 'in:draft,published,blocked'],
            ],
            'artists' => [
                'name' => ['required', 'string', 'max:120', new PlainText()],
                'slug' => ['required', 'alpha_dash', 'max:140', new PlainText(), Rule::unique('artists', 'slug')->ignore($routeId)],
                'user_id' => ['nullable', 'string', 'max:64'],
                'bio' => ['nullable', 'string', 'max:2000', new PlainText()],
                'avatar_url' => ['nullable', 'url', 'max:500', new PlainText()],
                'verified' => ['nullable', 'boolean'],
                'status' => ['required', 'in:active,inactive,blocked'],
            ],
            'genres' => [
                'name' => ['required', 'string', 'max:80', new PlainText()],
                'slug' => ['required', 'alpha_dash', 'max:100', new PlainText(), Rule::unique('genres', 'slug')->ignore($routeId)],
                'description' => ['nullable', 'string', 'max:1000', new PlainText()],
                'status' => ['required', 'in:active,inactive'],
            ],
            'playlists' => [
                'name' => ['required', 'string', 'max:160', new PlainText()],
                'slug' => ['required', 'alpha_dash', 'max:180', new PlainText(), Rule::unique('playlists', 'slug')->ignore($routeId)],
                'user_id' => ['nullable', 'string', 'max:64'],
                'description' => ['nullable', 'string', 'max:1500', new PlainText()],
                'cover_url' => ['nullable', 'url', 'max:500', new PlainText()],
                'is_system' => ['nullable', 'boolean'],
                'visibility' => ['required', 'in:public,private,unlisted'],
            ],
            'users' => [
                'name' => ['required', 'string', 'max:120', new PlainText()],
                'email' => ['required', 'email', 'max:160', new PlainText(), Rule::unique('users', 'email')->ignore($routeId)],
                'username' => ['nullable', 'alpha_dash', 'max:80', new PlainText()],
                'slug' => ['required', 'alpha_dash', 'max:140', new PlainText(), Rule::unique('users', 'slug')->ignore($routeId)],
                'phone' => ['nullable', 'string', 'max:30', new PlainText()],
                'status' => ['required', 'in:active,blocked'],
                'password' => [$this->isMethod('post') ? 'required' : 'nullable', 'string', 'min:8', 'max:72', 'confirmed'],
            ],
            'subscriptions' => [
                'name' => ['required', 'string', 'max:120', new PlainText()],
                'code' => ['required', 'alpha_dash', 'max:60', new PlainText(), Rule::unique('subscription_plans', 'code')->ignore($routeId)],
                'slug' => ['required', 'alpha_dash', 'max:140', new PlainText(), Rule::unique('subscription_plans', 'slug')->ignore($routeId)],
                'price' => ['required', 'numeric', 'min:0', 'max:999999999.99'],
                'duration_days' => ['required', 'integer', 'min:1', 'max:36500'],
                'description' => ['nullable', 'string', 'max:1000', new PlainText()],
                'offline_download' => ['nullable', 'boolean'],
                'ads_enabled' => ['nullable', 'boolean'],
                'unlimited_skip' => ['nullable', 'boolean'],
                'status' => ['required', 'in:active,inactive'],
            ],
            'admins' => [
                'name' => ['required', 'string', 'max:120', new PlainText()],
                'email' => ['required', 'email', 'max:160', new PlainText(), Rule::unique('admins', 'email')->ignore($routeId)],
                'slug' => ['nullable', 'alpha_dash', 'max:140', new PlainText(), Rule::unique('admins', 'slug')->ignore($routeId)],
                'role' => ['required', 'in:super_admin,admin'],
                'permissions' => ['nullable', 'array'],
                'permissions.*' => ['string', Rule::in(array_keys(config('admin-permissions.groups', [])))],
                'status' => ['required', 'in:active,inactive'],
                'password' => ['nullable', 'string', 'min:8', 'max:72', 'confirmed'],
            ],
            default => [],
        };
    }

    public function withValidator($validator): void
    {
        $resource = explode('.', (string) $this->route()?->getName())[1] ?? '';

        if (! in_array($resource, ['songs', 'albums', 'artists'], true)) {
            return;
        }

        $validator->after(function ($validator): void {
            if ($this->route()?->getName() && str_contains($this->route()->getName(), 'albums') && ! Artist::query()->find($this->input('artist_id'))) {
                $validator->errors()->add('artist_id', 'Nghệ sĩ đã chọn không tồn tại.');
            }

            if ($this->route()?->getName() && str_contains($this->route()->getName(), 'songs') && filled($this->input('album_id')) && ! Album::query()->find($this->input('album_id'))) {
                $validator->errors()->add('album_id', 'Album đã chọn không tồn tại.');
            }

            if ($this->route()?->getName() && str_contains($this->route()->getName(), 'artists') && filled($this->input('user_id')) && ! User::query()->find($this->input('user_id'))) {
                $validator->errors()->add('user_id', 'Tài khoản liên kết không tồn tại.');
            }
        });
    }

    private function routeParameterName(string $resource): string
    {
        return match ($resource) {
            'subscriptions' => 'subscription',
            default => rtrim($resource, 's'),
        };
    }
}
