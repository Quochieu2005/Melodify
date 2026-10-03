@extends('layouts.admin')

@section('content')
<section class="admin-page">
    <div class="admin-page-header">
        <div>
            <h1 class="admin-page-title">Quản lý {{ $resourceTitle }}</h1>
            <p class="admin-page-description">Tạo mới, cập nhật và quản lý dữ liệu {{ $resourceTitle }}.</p>
        </div>
        <a href="{{ route("admin.$resource.create") }}" class="ant-btn ant-btn-primary admin-create-btn">+ Thêm mới</a>
    </div>

    <div class="ant-card admin-table-card">
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
                        <tr><td colspan="{{ count($columns) + 2 }}" class="admin-empty-state">Chưa có dữ liệu. Hãy tạo mục đầu tiên.</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
        <div class="admin-pagination">{{ $items->links() }}</div>
    </div>
</section>
@endsection
