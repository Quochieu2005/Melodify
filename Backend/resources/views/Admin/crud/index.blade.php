@extends('layouts.admin')

@section('content')
<section class="admin-page">
    <div class="admin-page-header">
        <div class="admin-page-header-main">
            <h1 class="admin-page-title">Quản lý {{ $resourceTitle }}</h1>
            <p class="admin-page-description">Theo dõi, cập nhật và kiểm soát dữ liệu {{ $resourceTitle }} trong hệ thống.</p>
        </div>
        <a href="{{ route("admin.$resource.create") }}" class="ant-btn ant-btn-primary admin-create-btn"><span aria-hidden="true">+</span> Thêm mới</a>
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
                                    @elseif($key === 'status')
                                        <span class="ant-tag {{ in_array($value, ['active', 'published'], true) ? 'ant-tag-green' : 'ant-tag-default' }}">{{ $value ?: '—' }}</span>
                                    @else
                                        {{ filled($value) ? $value : '—' }}
                                    @endif
                                </td>
                            @endforeach
                            <td class="admin-table-actions">
                                <a href="{{ route("admin.$resource.edit", $item->getKey()) }}" class="admin-action-link">Sửa</a>
                                <form action="{{ route("admin.$resource.destroy", $item->getKey()) }}" method="POST" class="admin-inline-form" data-confirm-delete>
                                    @csrf @method('DELETE')
                                    <button type="submit" class="admin-action-link admin-action-danger">Xóa</button>
                                </form>
                            </td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="{{ count($columns) + 2 }}" class="admin-empty-state">
                                <span class="admin-empty-icon">＋</span>
                                <strong>Chưa có {{ $resourceTitle }}</strong>
                                <span>Tạo mục đầu tiên để bắt đầu quản lý dữ liệu.</span>
                                <a href="{{ route("admin.$resource.create") }}" class="ant-btn">Tạo {{ $resourceTitle }}</a>
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
