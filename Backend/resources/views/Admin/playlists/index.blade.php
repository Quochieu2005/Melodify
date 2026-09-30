@extends('layouts.admin')

@section('content')
<div class="admin-page">
    <div class="admin-page-header">
        <div class="admin-page-header-main">
            <h2 class="admin-page-title">Quản lý Playlist</h2>
            <p class="admin-page-desc">Danh sách tất cả playlist trong hệ thống.</p>
        </div>
        <a href="#" class="ant-btn ant-btn-primary admin-create-btn">
            <x-anticon name="plus" />
            <span>Thêm playlist</span>
        </a>
    </div>
    <div class="admin-table-card ant-card">
        <div class="ant-card-body" style="padding: 0;">
            <div class="admin-table-wrapper">
                <table class="ant-table admin-table">
                    <thead class="ant-table-thead">
                        <tr>
                            <th>#</th>
                            <th>Tên playlist</th>
                            <th>Người tạo</th>
                            <th>Số bài hát</th>
                            <th>Công khai</th>
                            <th>Hành động</th>
                        </tr>
                    </thead>
                    <tbody class="ant-table-tbody">
                        <tr><td>1</td><td>Top Hits Việt Nam</td><td>Admin</td><td>50</td><td><span class="ant-tag ant-tag-green">Có</span></td><td><a href="#" class="admin-action-link">Sửa</a></td></tr>
                        <tr><td>2</td><td>Nhạc Chill Buổi Tối</td><td>Admin</td><td>30</td><td><span class="ant-tag ant-tag-green">Có</span></td><td><a href="#" class="admin-action-link">Sửa</a></td></tr>
                        <tr><td>3</td><td>Workout Mix</td><td>user123</td><td>25</td><td><span class="ant-tag ant-tag-default">Không</span></td><td><a href="#" class="admin-action-link">Sửa</a></td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>
@endsection