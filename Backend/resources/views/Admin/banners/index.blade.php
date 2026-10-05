@extends('layouts.admin')

@section('content')
<section class="admin-page admin-banners-page">
    <div class="admin-page-header">
        <div class="admin-page-header-main">
            <p class="admin-page-kicker">Melodify / Nội dung</p>
            <h1 class="admin-page-title">Quản lý banner</h1>
            <p class="admin-page-description">Quản lý hình ảnh nổi bật, đường dẫn đích và thứ tự hiển thị trên Melodify.</p>
        </div>
        <a href="{{ route('admin.banners.create') }}" class="ant-btn ant-btn-primary admin-create-btn">
            <x-anticon name="plus" aria-hidden="true" />
            Thêm banner
        </a>
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
                        <th>Ảnh</th>
                        <th>Thông tin banner</th>
                        <th>URL đích</th>
                        <th>Thứ tự</th>
                        <th>Trạng thái</th>
                        <th class="admin-table-actions">Hành động</th>
                    </tr>
                </thead>
                <tbody class="ant-table-tbody">
                    @forelse($items as $item)
                        <tr>
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
                            <td><span class="admin-banner-order">{{ $item->sort_order }}</span></td>
                            <td>
                                <span class="ant-tag {{ $item->status === 'active' ? 'ant-tag-green' : 'ant-tag-default' }}">
                                    {{ $item->status === 'active' ? 'Đang hiển thị' : 'Tạm ẩn' }}
                                </span>
                            </td>
                            <td class="admin-table-actions">
                                <a href="{{ route('admin.banners.edit', $item->getKey()) }}" class="admin-action-link">Sửa</a>
                                <form action="{{ route('admin.banners.destroy', $item->getKey()) }}" method="POST" class="admin-inline-form" data-confirm-delete>
                                    @csrf
                                    @method('DELETE')
                                    <button type="submit" class="admin-action-link admin-action-danger">Xóa</button>
                                </form>
                            </td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="6" class="admin-empty-state">
                                <span class="admin-empty-icon">＋</span>
                                <strong>Chưa có banner</strong>
                                <span>Tạo banner đầu tiên để bắt đầu sắp xếp nội dung nổi bật.</span>
                                <a href="{{ route('admin.banners.create') }}" class="ant-btn ant-btn-primary">Tạo banner</a>
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
