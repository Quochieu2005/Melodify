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
        <div class="ant-card-body" style="padding: 0;">
            <div class="admin-table-wrapper">
                <table class="ant-table admin-table">
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
                        <tr><td>1</td><td>TXN-20260901</td><td>Nguyễn Văn A</td><td>Premium</td><td>59,000₫</td><td>MoMo</td><td>01/09/2026</td><td><span class="ant-tag ant-tag-green">Thành công</span></td></tr>
                        <tr><td>2</td><td>TXN-20260902</td><td>Trần Thị B</td><td>Student</td><td>29,000₫</td><td>ZaloPay</td><td>02/09/2026</td><td><span class="ant-tag ant-tag-green">Thành công</span></td></tr>
                        <tr><td>3</td><td>TXN-20260903</td><td>Lê Văn C</td><td>Family</td><td>89,000₫</td><td>VNPAY</td><td>03/09/2026</td><td><span class="ant-tag ant-tag-red">Thất bại</span></td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>
@endsection