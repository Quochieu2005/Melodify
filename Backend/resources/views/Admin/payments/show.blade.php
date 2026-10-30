@extends('layouts.admin')

@section('content')
@php($transaction = $payment->transactions->sortByDesc('transaction_at')->first())
@php($subscription = $payment->subscription)
@php($plan = $subscription?->plan ?? $payment->details->first()?->plan)
@php($status = strtolower((string) ($payment->status ?? 'pending')))
<div class="admin-page">
    <div class="admin-page-header">
        <div>
            <a href="{{ route('admin.payments.index') }}" class="admin-back-link">← Quay lại lịch sử giao dịch</a>
            <h1 class="admin-page-title">Chi tiết thanh toán</h1>
            <p class="admin-page-description">Đối chiếu dữ liệu payment với transaction, gói đăng ký và thời hạn Premium.</p>
        </div>
    </div>

    <div class="admin-form-grid">
        <section class="ant-card admin-detail-card">
            <div class="admin-resource-form-heading"><div><strong>Payment</strong><span>Bản ghi thanh toán trong payments.</span></div><span class="ant-tag {{ in_array($status, ['success', 'paid', 'completed'], true) ? 'ant-tag-green' : 'ant-tag-orange' }}">{{ $payment->status ?: 'pending' }}</span></div>
            <dl class="admin-detail-list">
                <div><dt>Mã payment</dt><dd>{{ $payment->payment_code ?: '—' }}</dd></div>
                <div><dt>ID</dt><dd><code>{{ $payment->getKey() }}</code></dd></div>
                <div><dt>Người dùng</dt><dd>{{ $payment->user?->name ?: $payment->user?->email ?: $payment->user_id ?: '—' }}</dd></div>
                <div><dt>Số tiền</dt><dd>{{ number_format((float) ($payment->amount ?? 0), 0, ',', '.') }} {{ $payment->currency ?: 'VND' }}</dd></div>
                <div><dt>Phương thức</dt><dd>{{ $payment->method ?: '—' }}</dd></div>
                <div><dt>Đã thanh toán</dt><dd>{{ $payment->paid_at?->format('d/m/Y H:i:s') ?? 'Chưa ghi nhận' }}</dd></div>
                <div><dt>Tạo lúc</dt><dd>{{ $payment->created_at?->format('d/m/Y H:i:s') ?? '—' }}</dd></div>
            </dl>
        </section>

        <section class="ant-card admin-detail-card">
            <div class="admin-resource-form-heading"><div><strong>Gói đăng ký</strong><span>Dữ liệu liên kết từ subscription và subscription_plans.</span></div></div>
            <dl class="admin-detail-list">
                <div><dt>Tên gói</dt><dd>{{ $plan?->name ?: '—' }}</dd></div>
                <div><dt>Mã gói</dt><dd>{{ $plan?->code ?: '—' }}</dd></div>
                <div><dt>Chu kỳ</dt><dd>{{ ($plan?->billing_cycle ?? 'monthly') === 'yearly' ? 'Theo năm' : 'Theo tháng' }}</dd></div>
                <div><dt>Thời hạn</dt><dd>{{ (int) ($plan?->billing_months ?: max(1, (int) ceil(((int) ($plan?->duration_days ?? 30)) / 30))) }} tháng</dd></div>
                <div><dt>Bắt đầu</dt><dd>{{ $subscription?->start_date?->format('d/m/Y') ?? '—' }}</dd></div>
                <div><dt>Kết thúc</dt><dd>{{ $subscription?->end_date?->format('d/m/Y') ?? '—' }}</dd></div>
                <div><dt>Trạng thái gói</dt><dd>{{ $subscription?->status ?: '—' }}</dd></div>
            </dl>
        </section>
    </div>

    <section class="ant-card admin-table-card">
        <div class="admin-table-toolbar"><div><strong>Đối soát transaction</strong><span>{{ $payment->transactions->count() }} bản ghi</span></div><span class="admin-table-hint">Mã gateway giúp truy xuất thanh toán tại cổng tương ứng.</span></div>
        <div class="admin-table-scroll"><table class="ant-table admin-data-table"><thead class="ant-table-thead"><tr><th>Mã transaction</th><th>Mã gateway</th><th>Gateway</th><th>Số tiền</th><th>Trạng thái</th><th>Thời điểm</th></tr></thead><tbody class="ant-table-tbody">
            @forelse($payment->transactions as $transactionItem)
                <tr><td>{{ $transactionItem->transaction_code ?: '—' }}</td><td>{{ $transactionItem->gateway_transaction_id ?: '—' }}</td><td>{{ $transactionItem->gateway ?: '—' }}</td><td>{{ number_format((float) ($transactionItem->amount ?? $payment->amount ?? 0), 0, ',', '.') }} {{ $payment->currency ?: 'VND' }}</td><td>{{ $transactionItem->status ?: '—' }}</td><td>{{ $transactionItem->transaction_at?->format('d/m/Y H:i:s') ?? $transactionItem->created_at?->format('d/m/Y H:i:s') ?? '—' }}</td></tr>
            @empty
                <tr><td colspan="6" class="admin-empty-state"><strong>Chưa có transaction</strong><span>Payment này chưa có bản ghi đối soát tại transactions.</span></td></tr>
            @endforelse
        </tbody></table></div>
    </section>
</div>
@endsection
