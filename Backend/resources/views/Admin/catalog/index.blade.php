@extends('layouts.admin')

@section('content')
<section class="admin-page admin-catalog-page">
    @php($currentAdmin = auth('admin')->user())
    @php($canCreate = $currentAdmin?->hasAdminResourcePermission($resource, 'create'))
    @php($canUpdate = $currentAdmin?->hasAdminResourcePermission($resource, 'update'))
    @php($canDelete = $currentAdmin?->hasAdminResourcePermission($resource, 'delete'))
    <div class="admin-page-header">
        <div class="admin-page-header-main">
            <h1 class="admin-page-title">Quản lý {{ $resourceTitle }}</h1>
            <p class="admin-page-description">Tạo, chỉnh sửa, sắp xếp và bật/tắt {{ $resourceTitle }} trong hệ thống.</p>
        </div>
        @if($canCreate)<a href="{{ route("admin.$resource.create") }}" class="ant-btn ant-btn-primary admin-create-btn"><span aria-hidden="true">+</span> Thêm {{ $resourceTitle }}</a>@endif
    </div>

    <div class="ant-card admin-table-card">
        <div class="admin-table-toolbar">
            <div><strong>Danh sách {{ $resourceTitle }}</strong><span>{{ $items->total() }} mục</span></div>
            <span class="admin-table-hint">Ảnh được lưu trong kho Cloudinary folder melodify</span>
        </div>
        <div class="admin-table-scroll">
            <table class="ant-table admin-data-table admin-catalog-table">
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
                                    @if($key === $imageUrlField)
                                        @if(filled($value))
                                            <img src="{{ $value }}" alt="" class="admin-catalog-thumb">
                                        @else
                                            <span class="admin-catalog-image-empty">Chưa có ảnh</span>
                                        @endif
                                    @elseif($key === 'status')
                                        @if($canUpdate)
                                            <form action="{{ route("admin.$resource.status", $item->getKey()) }}" method="POST" class="admin-inline-form">
                                                @csrf @method('PATCH')
                                                <button type="submit" class="admin-status-toggle {{ $value === 'active' ? 'is-active' : 'is-inactive' }}" title="Chuyển trạng thái">
                                                    <span class="admin-status-toggle-dot" aria-hidden="true"></span>
                                                    {{ $value === 'active' ? 'Hoạt động' : 'Tạm ẩn' }}
                                                </button>
                                            </form>
                                        @else
                                            <span class="ant-tag {{ $value === 'active' ? 'ant-tag-green' : 'ant-tag-default' }}">{{ $value === 'active' ? 'Hoạt động' : 'Tạm ẩn' }}</span>
                                        @endif
                                    @elseif(is_bool($value))
                                        <span class="ant-tag {{ $value ? 'ant-tag-green' : 'ant-tag-default' }}">{{ $value ? 'Có' : 'Không' }}</span>
                                    @elseif($key === 'visibility')
                                        <span class="ant-tag ant-tag-blue">{{ ['public' => 'Công khai', 'private' => 'Riêng tư', 'unlisted' => 'Không công khai'][$value] ?? $value }}</span>
                                    @else
                                        {{ filled($value) ? $value : '—' }}
                                    @endif
                                </td>
                            @endforeach
                            <td class="admin-table-actions">
                                @if($canUpdate)<a href="{{ route("admin.$resource.edit", $item->getKey()) }}" class="admin-action-link">Sửa</a>@endif
                                @if($canDelete)
                                    <form action="{{ route("admin.$resource.destroy", $item->getKey()) }}" method="POST" class="admin-inline-form" data-confirm-delete>
                                        @csrf @method('DELETE')
                                        <button type="submit" class="admin-action-link admin-action-danger">Xóa</button>
                                    </form>
                                @endif
                                @if(! $canUpdate && ! $canDelete)<span class="admin-text-muted">—</span>@endif
                            </td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="{{ count($columns) + 2 }}" class="admin-empty-state">
                                <span class="admin-empty-icon">＋</span>
                                <strong>Chưa có {{ $resourceTitle }}</strong>
                                <span>Tạo mục đầu tiên để bắt đầu quản lý.</span>
                                @if($canCreate)<a href="{{ route("admin.$resource.create") }}" class="ant-btn">Tạo {{ $resourceTitle }}</a>@endif
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
