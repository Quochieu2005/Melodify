@extends('layouts.admin')

@section('content')
<div class="admin-page">
    <div class="admin-page-header">
        <div class="admin-page-header-main">
            <h2 class="admin-page-title">Lịch sử giao dịch</h2>
            <p class="admin-page-desc">Tra cứu thanh toán, giao dịch cổng thanh toán và thời hạn gói từ dữ liệu thực tế.</p>
        </div>
    </div>

    <div class="admin-stats-row">
        <div class="ant-card admin-stat-card"><div class="ant-card-body"><div class="admin-stat-label">Tổng giao dịch</div><div class="admin-stat-value">{{ $payments->total() }}</div><div class="admin-stat-help">Bản ghi trong payments</div></div></div>
        <div class="ant-card admin-stat-card"><div class="ant-card-body"><div class="admin-stat-label">Thanh toán thành công</div><div class="admin-stat-value">{{ $successfulPaymentCount }}</div><div class="admin-stat-help">Trạng thái paid / success / completed</div></div></div>
        <div class="ant-card admin-stat-card"><div class="ant-card-body"><div class="admin-stat-label">Doanh thu đã ghi nhận</div><div class="admin-stat-value">{{ number_format($totalAmount, 0, ',', '.') }}₫</div><div class="admin-stat-help">Tổng amount từ payments</div></div></div>
        <div class="ant-card admin-stat-card"><div class="ant-card-body"><div class="admin-stat-label">Đang xử lý</div><div class="admin-stat-value">{{ $pendingCount }}</div><div class="admin-stat-help">Cần kiểm tra thêm</div></div></div>
    </div>

    <div class="admin-table-card ant-card">
        <div class="admin-table-toolbar">
            <div><strong>Danh sách thanh toán</strong><span>{{ $payments->total() }} mục</span></div>
            <form method="GET" action="{{ route('admin.payments.index') }}" class="admin-table-filter-form">
                <label class="admin-table-search">
                    <x-anticon name="search" aria-hidden="true" />
                    <input type="search" name="q" value="{{ $search ?? '' }}" maxlength="100" placeholder="Tìm payment, người dùng, gateway..." aria-label="Tìm kiếm thanh toán">
                </label>
                <button type="submit" class="ant-btn">Tìm kiếm</button>
                @if(filled($search ?? null))<a href="{{ route('admin.payments.index') }}" class="admin-action-link">Xóa lọc</a>@endif
            </form>
        </div>
        <div class="admin-table-scroll">
            <table class="ant-table admin-data-table">
                <thead class="ant-table-thead"><tr><th>#</th><th>Payment</th><th>Transaction / Gateway</th><th>Người dùng</th><th>Gói & thời hạn</th><th>Số tiền</th><th>Phương thức</th><th>Thời điểm</th><th>Trạng thái</th><th class="admin-table-actions">Tra cứu</th></tr></thead>
                <tbody class="ant-table-tbody">
                    @forelse($payments as $payment)
                        @php($transaction = $payment->transactions->sortByDesc('transaction_at')->first())
                        @php($subscription = $payment->subscription)
                        @php($plan = $subscription?->plan ?? $payment->details->first()?->plan)
                        @php($status = strtolower((string) ($payment->status ?? 'pending')))
                        <tr>
                            <td>{{ $payments->firstItem() + $loop->index }}</td>
                            <td><strong>{{ $payment->payment_code ?: '—' }}</strong><div class="admin-text-muted">ID: {{ $payment->getKey() }}</div></td>
                            <td>{{ $transaction?->transaction_code ?: '—' }}<div class="admin-text-muted">{{ $transaction?->gateway_transaction_id ?: ($transaction?->gateway ?: 'Chưa có gateway') }}</div></td>
                            <td>{{ $payment->user?->name ?: $payment->user?->email ?: $payment->user_id ?: '—' }}</td>
                            <td>{{ $plan?->name ?: '—' }}@if($subscription)<div class="admin-text-muted">{{ $subscription->start_date?->format('d/m/Y') ?? '—' }} → {{ $subscription->end_date?->format('d/m/Y') ?? '—' }}</div>@endif</td>
                            <td><strong>{{ number_format((float) ($payment->amount ?? 0), 0, ',', '.') }} {{ $payment->currency ?: 'VND' }}</strong></td>
                            <td>{{ $payment->method ?: '—' }}</td>
                            <td>{{ $payment->paid_at?->format('d/m/Y H:i') ?? $payment->created_at?->format('d/m/Y H:i') ?? '—' }}</td>
                            <td><span class="ant-tag {{ in_array($status, ['success', 'paid', 'completed'], true) ? 'ant-tag-green' : (in_array($status, ['failed', 'cancelled'], true) ? 'ant-tag-red' : 'ant-tag-orange') }}">{{ $payment->status ?: 'pending' }}</span></td>
                            <td class="admin-table-actions"><a href="{{ route('admin.payments.show', $payment->getKey()) }}" class="admin-action-link">Chi tiết</a></td>
                        </tr>
                    @empty
                        <tr><td colspan="10" class="admin-empty-state"><span class="admin-empty-icon">₫</span><strong>Chưa có giao dịch</strong><span>Giao dịch thanh toán sẽ xuất hiện tại đây sau khi được lưu vào payments.</span></td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
        @if($payments->hasPages())<div class="admin-pagination">{{ $payments->links() }}</div>@endif
    </div>
</div>
@endsection
