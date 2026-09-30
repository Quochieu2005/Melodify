@extends('layouts.admin')

@section('content')
<div class="admin-page">
    <div class="admin-page-header">
        <div class="admin-page-header-main">
            <h2 class="admin-page-title">Quản lý nghệ sĩ</h2>
            <p class="admin-page-desc">Danh sách tất cả nghệ sĩ trong hệ thống.</p>
        </div>
        <a href="#" class="ant-btn ant-btn-primary admin-create-btn">
            <x-anticon name="plus" />
            <span>Thêm nghệ sĩ</span>
        </a>
    </div>
    <div class="admin-table-card ant-card">
        <div class="ant-card-body" style="padding: 0;">
            <div class="admin-table-wrapper">
                <table class="ant-table admin-table">
                    <thead class="ant-table-thead">
                        <tr>
                            <th>#</th>
                            <th>Nghệ danh</th>
                            <th>Số bài hát</th>
                            <th>Số album</th>
                            <th>Lượt theo dõi</th>
                            <th>Trạng thái</th>
                            <th>Hành động</th>
                        </tr>
                    </thead>
                    <tbody class="ant-table-tbody">
                        <tr><td>1</td><td>Sơn Tùng M-TP</td><td>45</td><td>3</td><td>2.5M</td><td><span class="ant-tag ant-tag-green">Đã xác minh</span></td><td><a href="#" class="admin-action-link">Sửa</a></td></tr>
                        <tr><td>2</td><td>MONO</td><td>20</td><td>1</td><td>1.2M</td><td><span class="ant-tag ant-tag-green">Đã xác minh</span></td><td><a href="#" class="admin-action-link">Sửa</a></td></tr>
                        <tr><td>3</td><td>Hoàng Thùy Linh</td><td>35</td><td>4</td><td>800K</td><td><span class="ant-tag ant-tag-green">Đã xác minh</span></td><td><a href="#" class="admin-action-link">Sửa</a></td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>
@endsection