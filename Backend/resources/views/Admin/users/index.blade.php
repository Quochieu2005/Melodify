@extends('layouts.admin')

@section('content')
<div class="admin-page">
    <div class="admin-page-header">
        <div class="admin-page-header-main">
            <h2 class="admin-page-title">Quản lý người dùng</h2>
            <p class="admin-page-desc">Danh sách tất cả người dùng đã đăng ký.</p>
        </div>
    </div>
    <div class="admin-table-card ant-card">
        <div class="ant-card-body" style="padding: 0;">
            <div class="admin-table-wrapper">
                <table class="ant-table admin-table">
                    <thead class="ant-table-thead">
                        <tr>
                            <th>#</th>
                            <th>Họ tên</th>
                            <th>Email</th>
                            <th>Gói đăng ký</th>
                            <th>Ngày tham gia</th>
                            <th>Trạng thái</th>
                            <th>Hành động</th>
                        </tr>
                    </thead>
                    <tbody class="ant-table-tbody">
                        <tr><td>1</td><td>Nguyễn Văn A</td><td>nguyenvana@gmail.com</td><td><span class="ant-tag ant-tag-blue">Premium</span></td><td>15/01/2026</td><td><span class="ant-tag ant-tag-green">Hoạt động</span></td><td><a href="#" class="admin-action-link">Xem</a></td></tr>
                        <tr><td>2</td><td>Trần Thị B</td><td>tranthib@gmail.com</td><td><span class="ant-tag ant-tag-default">Miễn phí</span></td><td>20/03/2026</td><td><span class="ant-tag ant-tag-green">Hoạt động</span></td><td><a href="#" class="admin-action-link">Xem</a></td></tr>
                        <tr><td>3</td><td>Lê Văn C</td><td>levanc@gmail.com</td><td><span class="ant-tag ant-tag-blue">Premium</span></td><td>05/06/2026</td><td><span class="ant-tag ant-tag-red">Bị khóa</span></td><td><a href="#" class="admin-action-link">Xem</a></td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>
@endsection