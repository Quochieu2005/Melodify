<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class AdminResourceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth('admin')->check();
    }

    public function rules(): array
    {
        $resource = explode('.', (string) $this->route()?->getName())[1] ?? '';

        return match ($resource) {
            'songs' => [
                'title' => ['required', 'string', 'max:160'],
                'album_id' => ['nullable', 'string'],
                'release_date' => ['nullable', 'date'],
                'duration_seconds' => ['nullable', 'integer', 'min:0'],
                'explicit' => ['nullable', 'boolean'],
                'status' => ['required', 'in:draft,published,blocked'],
            ],
            'albums' => [
                'title' => ['required', 'string', 'max:160'],
                'artist_id' => ['nullable', 'string'],
                'release_date' => ['nullable', 'date'],
                'cover_url' => ['nullable', 'url', 'max:500'],
                'status' => ['required', 'in:draft,published,blocked'],
            ],
            'artists' => [
                'name' => ['required', 'string', 'max:120'],
                'bio' => ['nullable', 'string', 'max:2000'],
                'avatar_url' => ['nullable', 'url', 'max:500'],
                'verified' => ['nullable', 'boolean'],
                'status' => ['required', 'in:active,inactive,blocked'],
            ],
            'genres' => [
                'name' => ['required', 'string', 'max:80'],
                'slug' => ['required', 'alpha_dash', 'max:100'],
                'description' => ['nullable', 'string', 'max:1000'],
                'status' => ['required', 'in:active,inactive'],
            ],
            'playlists' => [
                'name' => ['required', 'string', 'max:160'],
                'description' => ['nullable', 'string', 'max:1500'],
                'cover_url' => ['nullable', 'url', 'max:500'],
                'is_system' => ['nullable', 'boolean'],
                'status' => ['required', 'in:active,inactive'],
            ],
            'users' => [
                'name' => ['required', 'string', 'max:120'],
                'email' => ['required', 'email', 'max:160'],
                'phone' => ['nullable', 'string', 'max:30'],
                'status' => ['required', 'in:active,blocked'],
                'password' => [$this->isMethod('post') ? 'required' : 'nullable', 'string', 'min:8', 'confirmed'],
            ],
            'subscriptions' => [
                'name' => ['required', 'string', 'max:120'],
                'price' => ['required', 'numeric', 'min:0'],
                'duration_days' => ['required', 'integer', 'min:1'],
                'description' => ['nullable', 'string', 'max:1000'],
                'offline_download' => ['nullable', 'boolean'],
                'ads_enabled' => ['nullable', 'boolean'],
                'unlimited_skip' => ['nullable', 'boolean'],
                'status' => ['required', 'in:active,inactive'],
            ],
            default => [],
        };
    }
}
