@extends('layouts.admin')

@section('content')
<section class="admin-page">
    @php($isSuperAdmin = auth('admin')->user()?->role === 'super_admin')
    @php($currentAdmin = auth('admin')->user())
    @php($canCreate = $resource !== 'admins' && $currentAdmin?->hasAdminResourcePermission($resource, 'create'))
    @php($canUpdate = $resource !== 'admins' && $currentAdmin?->hasAdminResourcePermission($resource, 'update'))
    @php($canDelete = $resource !== 'admins' && $currentAdmin?->hasAdminResourcePermission($resource, 'delete'))
    @php($supportsBulkDelete = $resource === 'albums')
    @php($canBulkDelete = $canDelete && $supportsBulkDelete)
    <div class="admin-page-header">
        <div class="admin-page-header-main">
            <h1 class="admin-page-title">Quản lý {{ $resourceTitle }}</h1>
            <p class="admin-page-description">Theo dõi, cập nhật và kiểm soát dữ liệu {{ $resourceTitle }} trong hệ thống.</p>
        </div>
        <div class="admin-page-header-actions">
            @if($canBulkDelete)
                <form action="{{ route("admin.$resource.bulk-destroy") }}" method="POST" id="{{ $resource }}-bulk-delete-form" class="admin-bulk-delete-form" data-confirm-delete-bulk data-confirm-resource="{{ $resourceTitle }}" data-confirm-count-selector="[data-catalog-select]:checked">
                    @csrf @method('DELETE')
                    <button type="submit" class="ant-btn admin-bulk-delete-btn" data-catalog-bulk-delete disabled>
                        Xóa đã chọn <span data-catalog-selected-count>(0)</span>
                    </button>
                </form>
                <form action="{{ route("admin.$resource.destroy-all") }}" method="POST" class="admin-bulk-delete-form" data-confirm-delete-all data-confirm-delete-count="{{ $items->total() }}" data-confirm-resource="{{ $resourceTitle }}">
                    @csrf @method('DELETE')
                    <button type="submit" class="ant-btn admin-delete-all-btn" @disabled($items->total() === 0)>Xóa toàn bộ</button>
                </form>
            @endif
            @if($resource === 'admins' && $isSuperAdmin)
                <form action="{{ route('admin.admins.credentials.bulk') }}" method="POST" id="admin-bulk-credentials-form" class="admin-bulk-credentials-form">
                    @csrf
                    <button type="submit" class="ant-btn admin-bulk-credentials-btn" data-admin-bulk-send disabled>
                        Gửi thông tin đăng nhập
                    </button>
                </form>
            @endif
            @if(($resource !== 'users' && $canCreate) || ($resource === 'admins' && $isSuperAdmin))
                <a href="{{ route("admin.$resource.create") }}" class="ant-btn ant-btn-primary admin-create-btn"><span aria-hidden="true">+</span> Thêm mới</a>
            @endif
        </div>
    </div>

    <div class="ant-card admin-table-card">
        <div class="admin-table-toolbar">
            <div><strong>Danh sách {{ $resourceTitle }}</strong><span>{{ $items->total() }} mục</span></div>
            @if(count($searchable ?? []) > 0)
                <form method="GET" action="{{ route("admin.$resource.index") }}" class="admin-table-filter-form">
                    <label class="admin-table-search">
                        <x-anticon name="search" aria-hidden="true" />
                        <input type="search" name="q" value="{{ $search ?? '' }}" maxlength="100" placeholder="Tìm tên, slug..." aria-label="Tìm kiếm {{ $resourceTitle }}">
                    </label>
                    <button type="submit" class="ant-btn">Tìm kiếm</button>
                    @if(filled($search ?? null))
                        <a href="{{ route("admin.$resource.index") }}" class="admin-action-link">Xóa lọc</a>
                    @endif
                </form>
            @else
                <span class="admin-table-hint">Cuộn ngang để xem thêm trên màn hình nhỏ</span>
            @endif
        </div>
        <div class="admin-table-scroll">
            <table class="ant-table admin-data-table">
                <thead class="ant-table-thead">
                    <tr>
                        <th>#</th>
                        @if($canBulkDelete)<th class="admin-select-column"><input type="checkbox" data-catalog-select-all aria-label="Chọn tất cả {{ $resourceTitle }}"></th>@endif
                        @if($resource === 'admins' && $isSuperAdmin)
                            <th class="admin-select-column"><input type="checkbox" data-admin-select-all aria-label="Chọn tất cả Admin nhỏ"></th>
                        @endif
                        @foreach($columns as $label)<th>{{ $label }}</th>@endforeach
                        <th class="admin-table-actions">Hành động</th>
                    </tr>
                </thead>
                <tbody class="ant-table-tbody">
                    @forelse($items as $item)
                        <tr>
                            <td>{{ $items->firstItem() + $loop->index }}</td>
                            @if($canBulkDelete)<td class="admin-select-column"><input type="checkbox" name="ids[]" value="{{ $item->getKey() }}" form="{{ $resource }}-bulk-delete-form" data-catalog-select aria-label="Chọn {{ $resourceTitle }}"></td>@endif
                            @if($resource === 'admins' && $isSuperAdmin)
                                <td class="admin-select-column">
                                    @php($credentialsSent = filled($item->credentials_sent_at))
                                    <input type="checkbox" name="admin_ids[]" value="{{ $item->getKey() }}" form="admin-bulk-credentials-form" data-admin-recipient @disabled($item->role === 'super_admin' || $credentialsSent) aria-label="Chọn {{ $item->name }}" @if($credentialsSent) title="Đã gửi thông tin đăng nhập" @endif>
                                </td>
                            @endif
                            @foreach($columns as $key => $label)
                                @php($value = data_get($item, $key))
                                <td>
                                    @if($key === 'avatar' && $resource === 'admins')
                                        <div class="admin-table-avatar">
                                            @if(filled($value))
                                                <img src="{{ $value }}" alt="Ảnh đại diện {{ $item->name }}" loading="lazy">
                                            @else
                                                <span aria-label="Chữ cái đầu tên quản trị viên">{{ mb_strtoupper(mb_substr($item->name ?: 'A', 0, 1)) }}</span>
                                            @endif
                                        </div>
                                    @elseif(in_array($key, ['avatar_url', 'image_url', 'cover_url'], true))
                                        @if(filled($value))
                                            <div class="admin-table-avatar">
                                                <img src="{{ $value }}" alt="Ảnh {{ data_get($item, 'name', data_get($item, 'title', 'Melodify')) }}" loading="lazy">
                                            </div>
                                        @else
                                            <span class="admin-catalog-image-empty">Chưa có ảnh</span>
                                        @endif
                                    @elseif($key === 'must_change_password')
                                        <span class="admin-status-indicator is-active" role="status" aria-label="Trạng thái mật khẩu: {{ $value ? 'Chưa đổi' : 'Đã đổi' }}">
                                            <span class="admin-status-toggle-dot" aria-hidden="true"></span>
                                            {{ $value ? 'Chưa đổi' : 'Đã đổi' }}
                                        </span>
                                    @elseif(is_bool($value))
                                        <span class="ant-tag {{ $value ? 'ant-tag-green' : 'ant-tag-default' }}">{{ $value ? 'Có' : 'Không' }}</span>
                                    @elseif($value instanceof \DateTimeInterface)
                                        {{ $value->format('d/m/Y') }}
                                    @elseif($key === 'status' && $resource === 'admins')
                                        @php($canToggleAdmin = (string) $item->getKey() !== (string) auth('admin')->id() && ($isSuperAdmin || $item->role !== 'super_admin'))
                                        @if($canToggleAdmin)
                                            <form action="{{ route('admin.admins.status', $item->getKey()) }}" method="POST" class="admin-inline-form">
                                                @csrf
                                                @method('PATCH')
                                                <button type="submit" class="admin-status-toggle {{ $value === 'active' ? 'is-active' : 'is-inactive' }}" title="Chuyển sang {{ $value === 'active' ? 'tắt' : 'bật' }}">
                                                    <span class="admin-status-toggle-dot" aria-hidden="true"></span>
                                                    {{ $value === 'active' ? 'Hoạt động' : 'Đã tắt' }}
                                                </button>
                                            </form>
                                        @else
                                            <span class="ant-tag {{ $value === 'active' ? 'ant-tag-green' : 'ant-tag-default' }}">{{ $value === 'active' ? 'Hoạt động' : 'Đã tắt' }}</span>
                                        @endif
                                    @elseif($key === 'status')
                                        @if($canUpdate && \Illuminate\Support\Facades\Route::has("admin.$resource.status"))
                                            <form action="{{ route("admin.$resource.status", $item->getKey()) }}" method="POST" class="admin-inline-form">
                                                @csrf @method('PATCH')
                                                <button type="submit" class="admin-status-toggle {{ in_array($value, ['active', 'published'], true) ? 'is-active' : 'is-inactive' }}" title="Chuyển trạng thái">
                                                    <span class="admin-status-toggle-dot" aria-hidden="true"></span>
                                                    {{ in_array($value, ['active', 'published'], true) ? 'Hoạt động' : 'Tạm ẩn' }}
                                                </button>
                                            </form>
                                        @else
                                            <span class="ant-tag {{ in_array($value, ['active', 'published'], true) ? 'ant-tag-green' : 'ant-tag-default' }}">{{ $value ?: '—' }}</span>
                                        @endif
                                    @else
                                        {{ filled($value) ? $value : '—' }}
                                    @endif
                                </td>
                            @endforeach
                            <td class="admin-table-actions">
                                @if($resource !== 'admins')
                                    @if(in_array($resource, ['albums', 'genres', 'topics', 'playlists'], true))<a href="{{ route("admin.$resource.show", $item->getKey()) }}" class="admin-action-link">Xem</a>@endif
                                    @if($canUpdate)<a href="{{ route("admin.$resource.edit", $item->getKey()) }}" class="admin-action-link">Sửa</a>@endif
                                    @if($canDelete)
                                        <form action="{{ route("admin.$resource.destroy", $item->getKey()) }}" method="POST" class="admin-inline-form" data-confirm-delete>
                                            @csrf @method('DELETE')
                                            <button type="submit" class="admin-action-link admin-action-danger">Xóa</button>
                                        </form>
                                    @endif
                                    @if(! $canUpdate && ! $canDelete)<span class="admin-text-muted">—</span>@endif
                                @elseif((string) $item->getKey() === (string) auth('admin')->id())
                                    <a href="{{ route("admin.$resource.edit", $item->getKey()) }}" class="admin-action-link">Sửa</a>
                                @elseif($isSuperAdmin && $item->role !== 'super_admin')
                                    <form action="{{ route("admin.$resource.destroy", $item->getKey()) }}" method="POST" class="admin-inline-form" data-confirm-delete>
                                        @csrf @method('DELETE')
                                        <button type="submit" class="admin-action-link admin-action-danger">Xóa</button>
                                    </form>
                                @endif
                            </td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="{{ count($columns) + 2 + (($resource === 'admins' && $isSuperAdmin) ? 1 : 0) + ($canBulkDelete ? 1 : 0) }}" class="admin-empty-state">
                                <span class="admin-empty-icon">＋</span>
                                <strong>Chưa có {{ $resourceTitle }}</strong>
                                @if($resource === 'users')
                                    <span>Người dùng sẽ xuất hiện tại đây sau khi đăng ký tài khoản.</span>
                                @else
                                    <span>Tạo mục đầu tiên để bắt đầu quản lý dữ liệu.</span>
                                @endif
                                @if(($resource !== 'users' && $canCreate) || ($resource === 'admins' && $isSuperAdmin))
                                    <a href="{{ route("admin.$resource.create") }}" class="ant-btn">Tạo {{ $resourceTitle }}</a>
                                @endif
                            </td>
                        </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
        @if($items->hasPages())<div class="admin-pagination">{{ $items->links() }}</div>@endif
    </div>
</section>
@endsection
