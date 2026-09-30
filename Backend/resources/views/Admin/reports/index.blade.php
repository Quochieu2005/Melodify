@extends('layouts.admin')

@section('content')
<div class="admin-page">
    <div class="admin-page-header">
        <div class="admin-page-header-main">
            <h2 class="admin-page-title">Báo cáo vi phạm</h2>
            <p class="admin-page-desc">Các báo cáo từ người dùng cần được xử lý.</p>
        </div>
    </div>
    <div class="admin-table-card ant-card">
        <div class="ant-card-body" style="padding: 0;">
            <div class="admin-table-wrapper">
                <table class="ant-table admin-table">
                    <thead class="ant-table-thead">
                        <tr>
                            <th>#</th>
                            <th>Người báo cáo</th>
                            <th>Loại</th>
                            <th>Đối tượng</th>
                            <th>Lý do</th>
                            <th>Ngày</th>
                            <th>Trạng thái</th>
                            <th>Hành động</th>
                        </tr>
                    </thead>
                    <tbody class="ant-table-tbody">
                        <tr><td>1</td><td>user456</td><td>Bài hát</td><td>Bài hát XYZ</td><td>Vi phạm bản quyền</td><td>29/09/2026</td><td><span class="ant-tag ant-tag-orange">Chờ xử lý</span></td><td><a href="#" class="admin-action-link">Xử lý</a></td></tr>
                        <tr><td>2</td><td>user789</td><td>Bình luận</td><td>Comment #123</td><td>Nội dung xấu</td><td>28/09/2026</td><td><span class="ant-tag ant-tag-orange">Chờ xử lý</span></td><td><a href="#" class="admin-action-link">Xử lý</a></td></tr>
                        <tr><td>3</td><td>user321</td><td>Người dùng</td><td>Lê Văn C</td><td>Spam</td><td>27/09/2026</td><td><span class="ant-tag ant-tag-green">Đã xử lý</span></td><td><a href="#" class="admin-action-link">Xem</a></td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>
@endsection