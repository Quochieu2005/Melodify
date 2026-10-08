@extends('layouts.admin')

@section('content')
<section class="admin-page admin-banners-page">
    @php($currentAdmin = auth('admin')->user())
    @php($canCreate = $currentAdmin?->hasAdminResourcePermission('banners', 'create'))
    @php($canUpdate = $currentAdmin?->hasAdminResourcePermission('banners', 'update'))
    @php($canDelete = $currentAdmin?->hasAdminResourcePermission('banners', 'delete'))
    <div class="admin-page-header">
        <div class="admin-page-header-main">
            <p class="admin-page-kicker">Melodify / Nội dung</p>
            <h1 class="admin-page-title">Quản lý banner</h1>
            <p class="admin-page-description">Quản lý hình ảnh nổi bật, đường dẫn đích và thứ tự hiển thị trên Melodify.</p>
        </div>
        <div class="admin-page-header-actions">
            @if($canDelete)
                <form action="{{ route('admin.banners.bulk-destroy') }}" method="POST" id="banner-bulk-delete-form" class="admin-bulk-delete-form" data-confirm-delete-bulk>
                    @csrf
                    @method('DELETE')
                    <button type="submit" class="ant-btn admin-bulk-delete-btn" data-banner-bulk-delete disabled>
                        <x-anticon name="alert" aria-hidden="true" />
                        Xóa đã chọn <span data-banner-selected-count>(0)</span>
                    </button>
                </form>
                <form action="{{ route('admin.banners.destroy-all') }}" method="POST" id="banner-delete-all-form" class="admin-bulk-delete-form" data-confirm-delete-all data-confirm-delete-count="{{ $items->total() }}">
                    @csrf
                    @method('DELETE')
                    <button type="submit" class="ant-btn admin-delete-all-btn" data-banner-delete-all @disabled($items->total() === 0)>
                        <x-anticon name="alert" aria-hidden="true" />
                        Xóa tất cả
                    </button>
                </form>
            @endif
            @if($canCreate)
                <a href="{{ route('admin.banners.create') }}" class="ant-btn ant-btn-primary admin-create-btn">
                    <x-anticon name="plus" aria-hidden="true" />
                    Thêm banner
                </a>
            @endif
        </div>
    </div>

    <div class="ant-card admin-table-card admin-banner-table-card">
        <div class="admin-table-toolbar">
            <div>
                <strong>Danh sách banner</strong>
                <span>{{ $items->total() }} banner</span>
            </div>
            <span class="admin-table-hint">Banner có thứ tự nhỏ hơn sẽ hiển thị trước.</span>
        </div>
        <div class="admin-table-scroll">
            <table class="ant-table admin-data-table admin-banner-table">
                <thead class="ant-table-thead">
                    <tr>
                        @if($canDelete)<th class="admin-select-column"><input type="checkbox" data-banner-select-all aria-label="Chọn tất cả banner"></th>@endif
                        <th>Ảnh</th>
                        <th>Thông tin banner</th>
                        <th>URL đích</th>
                        <th class="admin-sort-order-column">Thứ tự hiển thị</th>
                        <th>Trạng thái</th>
                        <th class="admin-table-actions">Hành động</th>
                    </tr>
                </thead>
                <tbody class="ant-table-tbody">
                    @forelse($items as $item)
                        <tr>
                            @if($canDelete)
                                <td class="admin-select-column">
                                    <input type="checkbox" name="banner_ids[]" value="{{ $item->getKey() }}" form="banner-bulk-delete-form" data-banner-select aria-label="Chọn banner {{ $item->title }}">
                                </td>
                            @endif
                            <td>
                                <div class="admin-banner-thumb-wrap">
                                    <img class="admin-banner-thumb" src="{{ $item->image_url }}" alt="{{ $item->title }}" loading="lazy">
                                </div>
                            </td>
                            <td>
                                <div class="admin-banner-meta">
                                    <strong>{{ $item->title }}</strong>
                                    <span>{{ $item->slug }}</span>
                                </div>
                            </td>
                            <td>
                                @if(filled($item->link_url))
                                    <a class="admin-banner-link" href="{{ $item->link_url }}" target="_blank" rel="noopener noreferrer">
                                        {{ \Illuminate\Support\Str::limit($item->link_url, 42) }}
                                    </a>
                                @else
                                    <span class="admin-text-muted">Không có liên kết</span>
                                @endif
                            </td>
                            <td class="admin-sort-order-column"><span class="admin-banner-order">{{ $item->sort_order }}</span></td>
                            <td>
                                <span class="ant-tag {{ $item->status === 'active' ? 'ant-tag-green' : 'ant-tag-default' }}">
                                    {{ $item->status === 'active' ? 'Đang hiển thị' : 'Tạm ẩn' }}
                                </span>
                            </td>
                            <td class="admin-table-actions">
                                @if($canUpdate)<a href="{{ route('admin.banners.edit', $item->slug) }}" class="admin-action-link">Sửa</a>@endif
                                @if($canDelete)
                                    <form action="{{ route('admin.banners.destroy', $item->slug) }}" method="POST" class="admin-inline-form" data-confirm-delete>
                                        @csrf
                                        @method('DELETE')
                                        <button type="submit" class="admin-action-link admin-action-danger">Xóa</button>
                                    </form>
                                @endif
                                @if(! $canUpdate && ! $canDelete)<span class="admin-text-muted">—</span>@endif
                            </td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="{{ 6 + ($canDelete ? 1 : 0) }}" class="admin-empty-state">
                                <span class="admin-empty-icon">＋</span>
                                <strong>Chưa có banner</strong>
                                <span>Tạo banner đầu tiên để bắt đầu sắp xếp nội dung nổi bật.</span>
                                @if($canCreate)<a href="{{ route('admin.banners.create') }}" class="ant-btn ant-btn-primary">Tạo banner</a>@endif
                            </td>
                        </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
        @if($items->hasPages())
            <div class="admin-pagination">{{ $items->links() }}</div>
        @endif
    </div>
</section>
@endsection
