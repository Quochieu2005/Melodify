<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AdminResourceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth('admin')->check() || app()->environment('local');
    }

    public function rules(): array
    {
        $resource = explode('.', (string) $this->route()?->getName())[1] ?? '';
        $routeId = $this->route($this->routeParameterName($resource));

        return match ($resource) {
            'songs' => [
                'title' => ['required', 'string', 'max:160'],
                'slug' => ['required', 'alpha_dash', 'max:180', Rule::unique('songs', 'slug')->ignore($routeId)],
                'album_id' => ['nullable', 'string'],
                'release_date' => ['nullable', 'date'],
                'duration_seconds' => ['nullable', 'integer', 'min:0'],
                'explicit' => ['nullable', 'boolean'],
                'status' => ['required', 'in:draft,published,blocked'],
            ],
            'albums' => [
                'title' => ['required', 'string', 'max:160'],
                'slug' => ['required', 'alpha_dash', 'max:180', Rule::unique('albums', 'slug')->ignore($routeId)],
                'artist_id' => ['nullable', 'string'],
                'release_date' => ['nullable', 'date'],
                'cover_url' => ['nullable', 'url', 'max:500'],
                'status' => ['required', 'in:draft,published,blocked'],
            ],
            'artists' => [
                'name' => ['required', 'string', 'max:120'],
                'slug' => ['required', 'alpha_dash', 'max:140', Rule::unique('artists', 'slug')->ignore($routeId)],
                'user_id' => ['nullable', 'string'],
                'bio' => ['nullable', 'string', 'max:2000'],
                'avatar_url' => ['nullable', 'url', 'max:500'],
                'verified' => ['nullable', 'boolean'],
                'status' => ['required', 'in:active,inactive,blocked'],
            ],
            'genres' => [
                'name' => ['required', 'string', 'max:80'],
                'slug' => ['required', 'alpha_dash', 'max:100', Rule::unique('genres', 'slug')->ignore($routeId)],
                'description' => ['nullable', 'string', 'max:1000'],
                'status' => ['required', 'in:active,inactive'],
            ],
            'playlists' => [
                'name' => ['required', 'string', 'max:160'],
                'slug' => ['required', 'alpha_dash', 'max:180', Rule::unique('playlists', 'slug')->ignore($routeId)],
                'user_id' => ['nullable', 'string'],
                'description' => ['nullable', 'string', 'max:1500'],
                'cover_url' => ['nullable', 'url', 'max:500'],
                'is_system' => ['nullable', 'boolean'],
                'visibility' => ['required', 'in:public,private,unlisted'],
            ],
            'users' => [
                'name' => ['required', 'string', 'max:120'],
                'email' => ['required', 'email', 'max:160', Rule::unique('users', 'email')->ignore($routeId)],
                'username' => ['nullable', 'alpha_dash', 'max:80'],
                'slug' => ['required', 'alpha_dash', 'max:140', Rule::unique('users', 'slug')->ignore($routeId)],
                'phone' => ['nullable', 'string', 'max:30'],
                'status' => ['required', 'in:active,blocked'],
                'password' => [$this->isMethod('post') ? 'required' : 'nullable', 'string', 'min:8', 'confirmed'],
            ],
            'subscriptions' => [
                'name' => ['required', 'string', 'max:120'],
                'code' => ['required', 'alpha_dash', 'max:60', Rule::unique('subscription_plans', 'code')->ignore($routeId)],
                'slug' => ['required', 'alpha_dash', 'max:140', Rule::unique('subscription_plans', 'slug')->ignore($routeId)],
                'price' => ['required', 'numeric', 'min:0'],
                'duration_days' => ['required', 'integer', 'min:1'],
                'description' => ['nullable', 'string', 'max:1000'],
                'offline_download' => ['nullable', 'boolean'],
                'ads_enabled' => ['nullable', 'boolean'],
                'unlimited_skip' => ['nullable', 'boolean'],
                'status' => ['required', 'in:active,inactive'],
            ],
            'admins' => [
                'name' => ['required', 'string', 'max:120'],
                'email' => ['required', 'email', 'max:160', Rule::unique('admins', 'email')->ignore($routeId)],
                'slug' => ['required', 'alpha_dash', 'max:140', Rule::unique('admins', 'slug')->ignore($routeId)],
                'role' => ['required', 'in:super_admin,content_manager,support'],
                'status' => ['required', 'in:active,inactive'],
                'password' => [$this->isMethod('post') ? 'required' : 'nullable', 'string', 'min:8', 'confirmed'],
            ],
            default => [],
        };
    }

    private function routeParameterName(string $resource): string
    {
        return match ($resource) {
            'subscriptions' => 'subscription',
            default => rtrim($resource, 's'),
        };
    }
}
