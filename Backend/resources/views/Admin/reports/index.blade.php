@extends('layouts.admin')

@section('content')
<div class="admin-page">
    <div class="admin-page-header">
        <div class="admin-page-header-main">
            <h2 class="admin-page-title">Báo cáo vi phạm</h2>
            <p class="admin-page-desc">Các báo cáo từ người dùng cần được xử lý.</p>
        </div>
    </div>
    <div class="admin-table-card ant-card">
        <div class="admin-table-toolbar"><div><strong>Báo cáo</strong><span>{{ $reports->total() }} mục</span></div></div>
            <div class="admin-table-scroll">
                <table class="ant-table admin-data-table">
                    <thead class="ant-table-thead">
                        <tr>
                            <th>#</th>
                            <th>Người báo cáo</th>
                            <th>Loại</th>
                            <th>Đối tượng</th>
                            <th>Lý do</th>
                            <th>Ngày</th>
                            <th>Trạng thái</th>
                            <th>Hành động</th>
                        </tr>
                    </thead>
                    <tbody class="ant-table-tbody">
                        @forelse($reports as $report)
                            <tr><td>{{ $reports->firstItem() + $loop->index }}</td><td>{{ $report->reporter?->name ?? $report->reporter?->email ?? '—' }}</td><td>{{ $report->target_type ?? '—' }}</td><td>{{ $report->target_id ?? '—' }}</td><td title="{{ $report->reason }}">{{ $report->reason ?? '—' }}</td><td>{{ $report->created_at?->format('d/m/Y H:i') ?? '—' }}</td><td><span class="ant-tag {{ $report->status === 'resolved' ? 'ant-tag-green' : ($report->status === 'rejected' ? 'ant-tag-red' : 'ant-tag-orange') }}">{{ $report->status ?? 'pending' }}</span></td><td><form method="POST" action="{{ route('admin.reports.update', $report) }}" class="admin-report-action">@csrf @method('PATCH')<select name="status" class="ant-input" aria-label="Trạng thái báo cáo"><option value="pending" @selected($report->status === 'pending')>Chờ xử lý</option><option value="resolved" @selected($report->status === 'resolved')>Đã xử lý</option><option value="rejected" @selected($report->status === 'rejected')>Từ chối</option></select><button class="ant-btn" type="submit">Lưu</button></form></td></tr>
                        @empty
                            <tr><td colspan="8" class="admin-empty-state"><span class="admin-empty-icon">!</span><strong>Không có báo cáo cần xử lý</strong><span>Báo cáo mới từ người dùng sẽ xuất hiện tại đây.</span></td></tr>
                        @endforelse
                    </tbody>
                </table>
            </div>
        @if($reports->hasPages())<div class="admin-pagination">{{ $reports->links() }}</div>@endif
    </div>
</div>
@endsection
