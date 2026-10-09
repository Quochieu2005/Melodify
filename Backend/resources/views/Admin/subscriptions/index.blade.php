@extends('layouts.admin')

@section('content')
@php($currentAdmin = auth('admin')->user())
@php($canCreate = $currentAdmin?->hasAdminResourcePermission('subscriptions', 'create'))
@php($canUpdate = $currentAdmin?->hasAdminResourcePermission('subscriptions', 'update'))
@php($canDelete = $currentAdmin?->hasAdminResourcePermission('subscriptions', 'delete'))
<div class="admin-page">
    <div class="admin-page-header">
        <div class="admin-page-header-main">
            <h2 class="admin-page-title">Gói đăng ký</h2>
            <p class="admin-page-desc">Quản lý gói theo chu kỳ và thời hạn đã lưu trong cơ sở dữ liệu.</p>
        </div>
        @if($canCreate)
            <a href="{{ route('admin.subscriptions.create') }}" class="ant-btn ant-btn-primary admin-create-btn"><x-anticon name="plus" /><span>Thêm gói</span></a>
        @endif
    </div>
    <div class="admin-table-card ant-card">
        <div class="admin-table-toolbar">
            <div><strong>Danh sách gói</strong><span>{{ $items->total() }} mục</span></div>
            <form method="GET" action="{{ route('admin.subscriptions.index') }}" class="admin-table-filter-form">
                <label class="admin-table-search">
                    <x-anticon name="search" aria-hidden="true" />
                    <input type="search" name="q" value="{{ $search ?? '' }}" maxlength="100" placeholder="Tìm tên, mã gói, chu kỳ..." aria-label="Tìm kiếm gói đăng ký">
                </label>
                <button type="submit" class="ant-btn">Tìm kiếm</button>
                @if(filled($search ?? null))<a href="{{ route('admin.subscriptions.index') }}" class="admin-action-link">Xóa lọc</a>@endif
            </form>
        </div>
        <div class="admin-table-scroll">
                <table class="ant-table admin-data-table">
                    <thead class="ant-table-thead">
                        <tr>
                            <th>#</th>
                            <th>Tên gói</th>
                            <th>Mã gói</th>
                            <th>Giá</th>
                            <th>Chu kỳ</th>
                            <th>Thời hạn</th>
                            <th>Đang đăng ký</th>
                            <th>Trạng thái</th>
                            <th>Hành động</th>
                        </tr>
                    </thead>
                    <tbody class="ant-table-tbody">
                        @forelse($items as $plan)
                            @php($cycle = $plan->billing_cycle ?: 'monthly')
                            @php($months = (int) ($plan->billing_months ?: max(1, (int) ceil(((int) ($plan->duration_days ?? 30)) / 30))))
                            <tr>
                                <td>{{ $items->firstItem() + $loop->index }}</td>
                                <td><strong>{{ $plan->name ?: '—' }}</strong>@if(filled($plan->description))<div class="admin-text-muted">{{ \Illuminate\Support\Str::limit($plan->description, 70) }}</div>@endif</td>
                                <td><code>{{ $plan->code ?: '—' }}</code></td>
                                <td>{{ number_format((float) ($plan->price ?? 0), 0, ',', '.') }}₫</td>
                                <td><span class="ant-tag ant-tag-blue">{{ $cycle === 'yearly' ? 'Theo năm' : 'Theo tháng' }}</span></td>
                                <td>{{ $months }} tháng <div class="admin-text-muted">{{ (int) ($plan->duration_days ?? $months * 30) }} ngày</div></td>
                                <td>{{ $subscriberCounts[(string) $plan->getKey()] ?? 0 }}</td>
                                <td><span class="ant-tag {{ $plan->status === 'active' ? 'ant-tag-green' : 'ant-tag-default' }}">{{ $plan->status === 'active' ? 'Hoạt động' : 'Tạm dừng' }}</span></td>
                                <td class="admin-table-actions">
                                    @if($canUpdate)<a href="{{ route('admin.subscriptions.edit', $plan->getKey()) }}" class="admin-action-link">Sửa</a>@endif
                                    @if($canDelete)<form action="{{ route('admin.subscriptions.destroy', $plan->getKey()) }}" method="POST" class="admin-inline-form" data-confirm-delete>@csrf @method('DELETE')<button type="submit" class="admin-action-link admin-action-danger">Xóa</button></form>@endif
                                    @if(! $canUpdate && ! $canDelete)<span class="admin-text-muted">—</span>@endif
                                </td>
                            </tr>
                        @empty
                            <tr><td colspan="9" class="admin-empty-state"><span class="admin-empty-icon">₫</span><strong>Chưa có gói đăng ký</strong><span>Tạo gói đầu tiên để người dùng có thể đăng ký Premium.</span>@if($canCreate)<a href="{{ route('admin.subscriptions.create') }}" class="ant-btn">Tạo gói</a>@endif</td></tr>
                        @endforelse
                    </tbody>
                </table>
        </div>
        @if($items->hasPages())<div class="admin-pagination">{{ $items->links() }}</div>@endif
    </div>
</div>
@endsection
