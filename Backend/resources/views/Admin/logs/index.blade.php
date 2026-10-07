@extends('layouts.admin')

@section('content')
<section class="admin-page admin-logs-page">
    <div class="admin-page-header">
        <div class="admin-page-header-main">
            <h1 class="admin-page-title">Nhật ký hoạt động</h1>
            <p class="admin-page-description">Theo dõi mọi thay đổi và hoạt động quan trọng của quản trị viên.</p>
        </div>
        <span class="admin-log-timezone">Múi giờ: Việt Nam (UTC+7)</span>
    </div>

    <form method="GET" action="{{ route('admin.logs.index') }}" class="ant-card admin-log-filters">
        <label class="admin-log-filter-field admin-log-filter-search">
            <span class="admin-log-filter-label">Tìm kiếm</span>
            <span class="admin-log-input-wrap">
                <x-anticon name="search" class="admin-log-input-icon" />
                <input class="ant-input" type="search" name="search" value="{{ $filters['search'] ?? '' }}" placeholder="Tên admin, hành động, IP..." aria-label="Tìm trong nhật ký">
            </span>
        </label>
        <label class="admin-log-filter-field">
            <span class="admin-log-filter-label">Quản trị viên</span>
            <span class="admin-log-select-wrap">
                <select class="ant-input" name="admin_id">
                    <option value="">Tất cả quản trị viên</option>
                    @foreach($admins as $admin)
                        <option value="{{ $admin['id'] }}" @selected(($filters['admin_id'] ?? '') === $admin['id'])>{{ $admin['name'] }} — {{ $admin['role'] === 'super_admin' ? 'Admin lớn' : 'Admin nhỏ' }}</option>
                    @endforeach
                </select>
            </span>
        </label>
        <label class="admin-log-filter-field">
            <span class="admin-log-filter-label">Từ ngày</span>
            <input class="ant-input" type="date" name="date_from" value="{{ $filters['date_from'] ?? '' }}">
        </label>
        <label class="admin-log-filter-field">
            <span class="admin-log-filter-label">Đến ngày</span>
            <input class="ant-input" type="date" name="date_to" value="{{ $filters['date_to'] ?? '' }}">
        </label>
        <div class="admin-log-filter-actions">
            <button class="ant-btn ant-btn-primary" type="submit">Lọc nhật ký</button>
            <a class="ant-btn" href="{{ route('admin.logs.index') }}">Xóa lọc</a>
        </div>
    </form>

    <div class="ant-card admin-table-card admin-log-table-card">
        <div class="admin-table-toolbar">
            <div><strong>Lịch sử thao tác</strong><span>{{ $logs->total() }} bản ghi</span></div>
            <span class="admin-table-hint">Dữ liệu được lưu theo thời gian Việt Nam</span>
        </div>
        <div class="admin-table-wrapper">
            <table class="ant-table admin-table admin-log-table">
                <thead class="ant-table-thead">
                    <tr>
                        <th>Thời gian</th>
                        <th>Quản trị viên</th>
                        <th>Địa chỉ IP</th>
                        <th>Hành động</th>
                        <th>Đối tượng</th>
                        <th>Kết quả</th>
                    </tr>
                </thead>
                <tbody class="ant-table-tbody">
                    @forelse($logs as $log)
                        @php
                            $createdAt = $log->created_at instanceof \DateTimeInterface
                                ? $log->created_at->setTimezone('Asia/Ho_Chi_Minh')
                                : \Illuminate\Support\Carbon::parse($log->created_at)->setTimezone('Asia/Ho_Chi_Minh');
                            $roleLabel = $log->admin_role === 'super_admin' ? 'Admin lớn' : 'Admin nhỏ';
                            $isSuccess = data_get($log->metadata, 'success', true);
                        @endphp
                        <tr>
                            <td class="admin-log-time">
                                <strong>{{ $createdAt->format('d/m/Y') }}</strong>
                                <span>{{ $createdAt->format('H:i:s') }}</span>
                            </td>
                            <td>
                                <div class="admin-log-admin">
                                    <strong>{{ $log->admin_name ?: '—' }}</strong>
                                    <span>{{ $roleLabel }} · {{ $log->admin_email ?: '—' }}</span>
                                </div>
                            </td>
                            <td><code class="admin-log-ip">{{ $log->ip_address ?: '—' }}</code></td>
                            <td>
                                <strong>{{ $log->description ?: $log->action }}</strong>
                                <span class="admin-log-route">{{ $log->method ?: '—' }} · {{ $log->route_name ?: $log->action }}</span>
                                @if(data_get($log->metadata, 'input'))
                                    <details class="admin-log-details">
                                        <summary>Chi tiết thay đổi</summary>
                                        <pre>{{ json_encode(data_get($log->metadata, 'input'), JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) }}</pre>
                                    </details>
                                @endif
                            </td>
                            <td>
                                <span>{{ $log->target_type ?: '—' }}</span>
                                @if($log->target_id)<small class="admin-log-target-id">#{{ $log->target_id }}</small>@endif
                            </td>
                            <td><span class="ant-tag {{ $isSuccess ? 'ant-tag-green' : 'ant-tag-red' }}">{{ $isSuccess ? 'Thành công' : 'Lỗi' }}{{ $log->status_code ? ' · '.$log->status_code : '' }}</span></td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="6" class="admin-empty-state">
                                <span class="admin-empty-icon">⌁</span>
                                <strong>Chưa có nhật ký hoạt động</strong>
                                <span>Các thao tác quản trị sẽ xuất hiện tại đây.</span>
                            </td>
                        </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
        @if($logs->hasPages())<div class="admin-pagination">{{ $logs->links() }}</div>@endif
    </div>
</section>
@endsection
