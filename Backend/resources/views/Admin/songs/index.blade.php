@extends('layouts.admin')

@section('content')
<div class="admin-page">
    <div class="admin-page-header">
        <div class="admin-page-header-main">
            <h2 class="admin-page-title">Quản lý bài hát</h2>
            <p class="admin-page-desc">Danh sách tất cả bài hát trong hệ thống.</p>
        </div>
        <a href="#" class="ant-btn ant-btn-primary admin-create-btn">
            <x-anticon name="plus" />
            <span>Thêm bài hát</span>
        </a>
    </div>
    <div class="admin-table-card ant-card">
        <div class="ant-card-body" style="padding: 0;">
            <div class="admin-table-wrapper">
                <table class="ant-table admin-table">
                    <thead class="ant-table-thead">
                        <tr>
                            <th>#</th>
                            <th>Tên bài hát</th>
                            <th>Nghệ sĩ</th>
                            <th>Album</th>
                            <th>Thể loại</th>
                            <th>Thời lượng</th>
                            <th>Trạng thái</th>
                            <th>Hành động</th>
                        </tr>
                    </thead>
                    <tbody class="ant-table-tbody">
                        <tr>
                            <td>1</td><td>Chạy Ngay Đi</td><td>Sơn Tùng M-TP</td><td>Sky Tour</td><td>Pop</td><td>4:12</td>
                            <td><span class="ant-tag ant-tag-green">Hoạt động</span></td>
                            <td><a href="#" class="admin-action-link">Sửa</a></td>
                        </tr>
                        <tr>
                            <td>2</td><td>See Tình</td><td>Hoàng Thùy Linh</td><td>—</td><td>Pop</td><td>3:45</td>
                            <td><span class="ant-tag ant-tag-green">Hoạt động</span></td>
                            <td><a href="#" class="admin-action-link">Sửa</a></td>
                        </tr>
                        <tr>
                            <td>3</td><td>Waiting For You</td><td>MONO</td><td>22</td><td>Ballad</td><td>4:30</td>
                            <td><span class="ant-tag ant-tag-orange">Chờ duyệt</span></td>
                            <td><a href="#" class="admin-action-link">Sửa</a></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>
@endsection