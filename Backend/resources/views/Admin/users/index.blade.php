@extends('layouts.admin')

@section('content')
@php($currentAdmin = auth('admin')->user())
@php($canUpdate = $currentAdmin?->hasAdminResourcePermission('users', 'update'))
@php($canDelete = $currentAdmin?->hasAdminResourcePermission('users', 'delete'))
<div class="admin-page">
    <div class="admin-page-header">
        <div class="admin-page-header-main">
            <h2 class="admin-page-title">Quản lý người dùng</h2>
            <p class="admin-page-desc">Premium được lấy từ trường <code>users.is_premium</code>: 1 là VIP, 0 là tài khoản thường.</p>
        </div>
    </div>
    <div class="admin-table-card ant-card">
        <div class="admin-table-toolbar">
            <div><strong>Danh sách người dùng</strong><span>{{ $items->total() }} mục</span></div>
            <form method="GET" action="{{ route('admin.users.index') }}" class="admin-table-filter-form">
                <label class="admin-table-search">
                    <x-anticon name="search" aria-hidden="true" />
                    <input type="search" name="q" value="{{ $search ?? '' }}" maxlength="100" placeholder="Tìm tên, username, email..." aria-label="Tìm kiếm người dùng">
                </label>
                <button type="submit" class="ant-btn">Tìm kiếm</button>
                @if(filled($search ?? null))<a href="{{ route('admin.users.index') }}" class="admin-action-link">Xóa lọc</a>@endif
            </form>
        </div>
        <div class="admin-table-scroll">
            <table class="ant-table admin-data-table">
                <thead class="ant-table-thead"><tr><th>Ảnh</th><th>Họ tên</th><th>Username</th><th>Email</th><th>Điện thoại</th><th>Ngày tham gia</th><th>Premium</th><th>Đăng nhập lần cuối</th><th>Trạng thái</th><th class="admin-table-actions">Hành động</th></tr></thead>
                <tbody class="ant-table-tbody">
                    @forelse($items as $user)
                        <tr>
                            <td>
                                <div class="admin-table-avatar">
                                    @if(filled($user->avatar_url))
                                        <img src="{{ $user->avatar_url }}" alt="Ảnh đại diện {{ $user->name ?: 'người dùng' }}" loading="lazy">
                                    @else
                                        <span aria-label="Chưa có ảnh đại diện">{{ mb_strtoupper(mb_substr($user->name ?: 'U', 0, 1)) }}</span>
                                    @endif
                                </div>
                            </td>
                            <td><strong>{{ $user->name ?: '—' }}</strong></td>
                            <td>{{ filled($user->username) ? '@'.$user->username : '—' }}</td>
                            <td>{{ $user->email ?: '—' }}</td>
                            <td>{{ $user->phone ?: '—' }}</td>
                            <td>{{ $user->created_at?->format('d/m/Y') ?? '—' }}</td>
                            <td><span class="ant-tag {{ $user->is_premium ? 'ant-tag-blue' : 'ant-tag-default' }}">{{ $user->is_premium ? 'Premium (1)' : 'Bình thường (0)' }}</span></td>
                            <td>{{ $user->last_login_at?->format('d/m/Y H:i:s') ?? 'Chưa đăng nhập' }}</td>
                            <td><span class="ant-tag {{ $user->status === 'active' ? 'ant-tag-green' : 'ant-tag-red' }}">{{ $user->status === 'active' ? 'Hoạt động' : 'Đã khóa' }}</span></td>
                            <td class="admin-table-actions">
                                @if($canUpdate)<a href="{{ route('admin.users.edit', $user->getKey()) }}" class="admin-action-link">Sửa</a>@endif
                                @if($canDelete)<form action="{{ route('admin.users.destroy', $user->getKey()) }}" method="POST" class="admin-inline-form" data-confirm-delete>@csrf @method('DELETE')<button type="submit" class="admin-action-link admin-action-danger">Xóa</button></form>@endif
                                @if(! $canUpdate && ! $canDelete)<span class="admin-text-muted">—</span>@endif
                            </td>
                        </tr>
                    @empty
                        <tr><td colspan="10" class="admin-empty-state"><span class="admin-empty-icon">◎</span><strong>Chưa có người dùng</strong><span>Người dùng sẽ xuất hiện tại đây sau khi đăng ký tài khoản.</span></td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
        @if($items->hasPages())<div class="admin-pagination">{{ $items->links() }}</div>@endif
    </div>
</div>
@endsection
