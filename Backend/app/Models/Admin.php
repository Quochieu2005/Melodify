<?php

namespace App\Models;

use Illuminate\Auth\Passwords\CanResetPassword;
use Illuminate\Contracts\Auth\CanResetPassword as CanResetPasswordContract;
use Illuminate\Notifications\Notifiable;
use MongoDB\Laravel\Auth\User as Authenticatable;

class Admin extends Authenticatable implements CanResetPasswordContract
{
    use CanResetPassword, Notifiable;

    protected $connection = 'mongodb';

    protected $collection = 'admins';

    protected $fillable = ['name', 'email', 'slug', 'password', 'avatar', 'avatar_public_id', 'role', 'permissions', 'notification_preferences', 'appearance_preferences', 'status', 'is_active', 'must_change_password', 'credentials_sent_at'];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'is_active' => 'boolean',
            'permissions' => 'array',
            'notification_preferences' => 'array',
            'appearance_preferences' => 'array',
            'email_verified_at' => 'datetime',
            'must_change_password' => 'boolean',
            'credentials_sent_at' => 'datetime',
        ];
    }

    public function hasAdminPermission(string $permission): bool
    {
        if ($this->role === 'super_admin') {
            return true;
        }

        $permissions = array_values((array) ($this->permissions ?? []));
        if (in_array($permission, $permissions, true)) {
            return true;
        }

        if ($permission !== 'admins.manage' && in_array('admin.manage', $permissions, true)) {
            return true;
        }

        if (! str_ends_with($permission, '.manage')) {
            return false;
        }

        foreach ((array) config('admin-permissions.resource_groups', []) as $resource => $group) {
            if ($group === $permission && $this->hasAdminResourcePermission($resource, 'view')) {
                return true;
            }
        }

        return false;
    }

    public function hasAdminResourcePermission(string $resource, string $action): bool
    {
        if ($this->role === 'super_admin') {
            return true;
        }

        $permissions = array_values((array) ($this->permissions ?? []));
        $group = config("admin-permissions.resource_groups.{$resource}");

        if ($resource !== 'admins' && in_array('admin.manage', $permissions, true)) {
            return true;
        }

        if (in_array("{$resource}.{$action}", $permissions, true)
            || in_array("{$resource}.manage", $permissions, true)
            || ($group && in_array($group, $permissions, true))) {
            return true;
        }

        if ($action !== 'view') {
            return false;
        }

        return collect($permissions)->contains(function (string $permission) use ($resource): bool {
            [$permissionResource, $permissionAction] = array_pad(explode('.', $permission, 2), 2, null);

            return $permissionResource === $resource
                && in_array($permissionAction, ['create', 'update', 'delete', 'view', 'manage'], true);
        });
    }

    public function songs()
    {
        return $this->hasMany(Song::class, 'created_by_admin_id');
    }

    public function playlists()
    {
        return $this->hasMany(Playlist::class, 'created_by_admin_id');
    }

    public function logs()
    {
        return $this->hasMany(Log::class, 'admin_id');
    }

    public function reports()
    {
        return $this->hasMany(Report::class, 'reviewed_by_admin_id');
    }
}
