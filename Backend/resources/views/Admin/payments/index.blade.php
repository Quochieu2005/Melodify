@extends('layouts.admin')

@section('content')
<div class="admin-page">
    <div class="admin-page-header">
        <div class="admin-page-header-main">
            <h2 class="admin-page-title">Lịch sử giao dịch</h2>
            <p class="admin-page-desc">Tất cả giao dịch thanh toán trong hệ thống.</p>
        </div>
    </div>
    <div class="admin-table-card ant-card">
        <div class="admin-table-toolbar"><div><strong>Giao dịch</strong><span>{{ $payments->total() }} mục</span></div></div>
            <div class="admin-table-scroll">
                <table class="ant-table admin-data-table">
                    <thead class="ant-table-thead">
                        <tr>
                            <th>#</th>
                            <th>Mã giao dịch</th>
                            <th>Người dùng</th>
                            <th>Gói</th>
                            <th>Số tiền</th>
                            <th>Phương thức</th>
                            <th>Ngày</th>
                            <th>Trạng thái</th>
                        </tr>
                    </thead>
                    <tbody class="ant-table-tbody">
                        @forelse($payments as $payment)
                            <tr><td>{{ $payments->firstItem() + $loop->index }}</td><td>{{ $payment->payment_code ?? '—' }}</td><td>{{ $payment->user?->name ?? $payment->user?->email ?? '—' }}</td><td>{{ $payment->details->first()?->plan?->name ?? '—' }}</td><td>{{ number_format((float) ($payment->amount ?? 0), 0, ',', '.') }}₫</td><td>{{ $payment->method ?? '—' }}</td><td>{{ $payment->paid_at?->format('d/m/Y H:i') ?? $payment->created_at?->format('d/m/Y H:i') ?? '—' }}</td><td><span class="ant-tag {{ $payment->status === 'success' ? 'ant-tag-green' : ($payment->status === 'failed' ? 'ant-tag-red' : 'ant-tag-orange') }}">{{ $payment->status ?? 'pending' }}</span></td></tr>
                        @empty
                            <tr><td colspan="8" class="admin-empty-state"><span class="admin-empty-icon">₫</span><strong>Chưa có giao dịch</strong><span>Giao dịch thanh toán sẽ xuất hiện tại đây.</span></td></tr>
                        @endforelse
                    </tbody>
                </table>
            </div>
        @if($payments->hasPages())<div class="admin-pagination">{{ $payments->links() }}</div>@endif
    </div>
</div>
@endsection
