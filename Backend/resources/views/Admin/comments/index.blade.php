@extends('layouts.admin')

@section('content')
<div class="admin-page">
    <div class="admin-page-header">
        <div class="admin-page-header-main">
            <h2 class="admin-page-title">Quản lý bình luận</h2>
            <p class="admin-page-desc">Tất cả bình luận từ người dùng.</p>
        </div>
    </div>
    <div class="admin-table-card ant-card">
        <div class="ant-card-body" style="padding: 0;">
            <div class="admin-table-wrapper">
                <table class="ant-table admin-table">
                    <thead class="ant-table-thead">
                        <tr>
                            <th>#</th>
                            <th>Người dùng</th>
                            <th>Bài hát</th>
                            <th>Nội dung</th>
                            <th>Ngày</th>
                            <th>Trạng thái</th>
                            <th>Hành động</th>
                        </tr>
                    </thead>
                    <tbody class="ant-table-tbody">
                        <tr><td>1</td><td>Nguyễn Văn A</td><td>Chạy Ngay Đi</td><td>Bài hát hay quá!</td><td>28/09/2026</td><td><span class="ant-tag ant-tag-green">Hiển thị</span></td><td><a href="#" class="admin-action-link">Ẩn</a></td></tr>
                        <tr><td>2</td><td>Trần Thị B</td><td>See Tình</td><td>Nghe hoài không chán ❤️</td><td>27/09/2026</td><td><span class="ant-tag ant-tag-green">Hiển thị</span></td><td><a href="#" class="admin-action-link">Ẩn</a></td></tr>
                        <tr><td>3</td><td>Lê Văn C</td><td>Waiting For You</td><td>Spam comment...</td><td>26/09/2026</td><td><span class="ant-tag ant-tag-red">Đã ẩn</span></td><td><a href="#" class="admin-action-link">Hiện</a></td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>
@endsection