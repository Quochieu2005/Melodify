@extends('layouts.admin')

@section('content')
<div class="admin-page">
    <div class="admin-page-header">
        <div class="admin-page-header-main">
            <h2 class="admin-page-title">Gói đăng ký</h2>
            <p class="admin-page-desc">Quản lý các gói đăng ký Premium.</p>
        </div>
        <a href="#" class="ant-btn ant-btn-primary admin-create-btn">
            <x-anticon name="plus" />
            <span>Thêm gói</span>
        </a>
    </div>
    <div class="admin-table-card ant-card">
        <div class="ant-card-body" style="padding: 0;">
            <div class="admin-table-wrapper">
                <table class="ant-table admin-table">
                    <thead class="ant-table-thead">
                        <tr>
                            <th>#</th>
                            <th>Tên gói</th>
                            <th>Giá / tháng</th>
                            <th>Thời hạn</th>
                            <th>Số người dùng</th>
                            <th>Trạng thái</th>
                            <th>Hành động</th>
                        </tr>
                    </thead>
                    <tbody class="ant-table-tbody">
                        <tr><td>1</td><td>Premium Individual</td><td>59,000₫</td><td>1 tháng</td><td>5,230</td><td><span class="ant-tag ant-tag-green">Hoạt động</span></td><td><a href="#" class="admin-action-link">Sửa</a></td></tr>
                        <tr><td>2</td><td>Premium Family</td><td>89,000₫</td><td>1 tháng</td><td>1,450</td><td><span class="ant-tag ant-tag-green">Hoạt động</span></td><td><a href="#" class="admin-action-link">Sửa</a></td></tr>
                        <tr><td>3</td><td>Premium Student</td><td>29,000₫</td><td>1 tháng</td><td>3,100</td><td><span class="ant-tag ant-tag-green">Hoạt động</span></td><td><a href="#" class="admin-action-link">Sửa</a></td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>
@endsection