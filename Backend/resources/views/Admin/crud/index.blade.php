@extends('layouts.admin')

@section('content')
<section class="admin-page">
    @php($isSuperAdmin = auth('admin')->user()?->role === 'super_admin')
    <div class="admin-page-header">
        <div class="admin-page-header-main">
            <h1 class="admin-page-title">Quản lý {{ $resourceTitle }}</h1>
            <p class="admin-page-description">Theo dõi, cập nhật và kiểm soát dữ liệu {{ $resourceTitle }} trong hệ thống.</p>
        </div>
        @if($resource !== 'admins' || $isSuperAdmin)
            <a href="{{ route("admin.$resource.create") }}" class="ant-btn ant-btn-primary admin-create-btn"><span aria-hidden="true">+</span> Thêm mới</a>
        @endif
    </div>

    <div class="ant-card admin-table-card">
        <div class="admin-table-toolbar">
            <div><strong>Danh sách {{ $resourceTitle }}</strong><span>{{ $items->total() }} mục</span></div>
            <span class="admin-table-hint">Cuộn ngang để xem thêm trên màn hình nhỏ</span>
        </div>
        <div class="admin-table-scroll">
            <table class="ant-table admin-data-table">
                <thead class="ant-table-thead">
                    <tr>
                        <th>#</th>
                        @foreach($columns as $label)<th>{{ $label }}</th>@endforeach
                        <th class="admin-table-actions">Hành động</th>
                    </tr>
                </thead>
                <tbody class="ant-table-tbody">
                    @forelse($items as $item)
                        <tr>
                            <td>{{ $items->firstItem() + $loop->index }}</td>
                            @foreach($columns as $key => $label)
                                @php($value = data_get($item, $key))
                                <td>
                                    @if(is_bool($value))
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
                                        <span class="ant-tag {{ in_array($value, ['active', 'published'], true) ? 'ant-tag-green' : 'ant-tag-default' }}">{{ $value ?: '—' }}</span>
                                    @elseif($key === 'must_change_password')
                                        <span class="ant-tag {{ $value ? 'ant-tag-orange' : 'ant-tag-green' }}">{{ $value ? 'Cần đổi' : 'Đã đổi' }}</span>
                                    @else
                                        {{ filled($value) ? $value : '—' }}
                                    @endif
                                </td>
                            @endforeach
                            <td class="admin-table-actions">
                                @if($resource !== 'admins')
                                    <a href="{{ route("admin.$resource.edit", $item->getKey()) }}" class="admin-action-link">Sửa</a>
                                    <form action="{{ route("admin.$resource.destroy", $item->getKey()) }}" method="POST" class="admin-inline-form" data-confirm-delete>
                                        @csrf @method('DELETE')
                                        <button type="submit" class="admin-action-link admin-action-danger">Xóa</button>
                                    </form>
                                @elseif($isSuperAdmin)
                                    @if($item->role !== 'super_admin' || (string) $item->getKey() === (string) auth('admin')->id())
                                        <a href="{{ route("admin.$resource.edit", $item->getKey()) }}" class="admin-action-link">Sửa</a>
                                    @endif
                                    @if($item->role === 'admin')
                                        <form action="{{ route('admin.admins.credentials', $item->getKey()) }}" method="POST" class="admin-inline-form">
                                            @csrf
                                            <button type="submit" class="admin-action-link">Gửi mail</button>
                                        </form>
                                    @endif
                                    @if((string) $item->getKey() !== (string) auth('admin')->id())
                                        <form action="{{ route("admin.$resource.destroy", $item->getKey()) }}" method="POST" class="admin-inline-form" data-confirm-delete>
                                            @csrf @method('DELETE')
                                            <button type="submit" class="admin-action-link admin-action-danger">Xóa</button>
                                        </form>
                                    @endif
                                @endif
                            </td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="{{ count($columns) + 2 }}" class="admin-empty-state">
                                <span class="admin-empty-icon">＋</span>
                                <strong>Chưa có {{ $resourceTitle }}</strong>
                                <span>Tạo mục đầu tiên để bắt đầu quản lý dữ liệu.</span>
                                @if($resource !== 'admins' || $isSuperAdmin)
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
