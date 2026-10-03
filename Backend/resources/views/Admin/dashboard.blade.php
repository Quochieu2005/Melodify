@extends('layouts.admin')

@section('content')
<div class="admin-page">
    <div class="admin-page-header">
        <div class="admin-page-header-main">
            <h2 class="admin-page-title">Tổng quan</h2>
            <p class="admin-page-desc">Chào mừng trở lại! Đây là tổng quan hệ thống Melodify.</p>
        </div>
    </div>

    <div class="admin-stats-row">
        <div class="ant-card admin-stat-card">
            <div class="ant-card-body">
                <div class="admin-stat-label">Bài hát</div>
                <div class="admin-stat-value">1,240</div>
            </div>
        </div>
        <div class="ant-card admin-stat-card">
            <div class="ant-card-body">
                <div class="admin-stat-label">Nghệ sĩ</div>
                <div class="admin-stat-value">356</div>
            </div>
        </div>
        <div class="ant-card admin-stat-card">
            <div class="ant-card-body">
                <div class="admin-stat-label">Người dùng</div>
                <div class="admin-stat-value">8,920</div>
            </div>
        </div>
        <div class="ant-card admin-stat-card">
            <div class="ant-card-body">
                <div class="admin-stat-label">Lượt nghe hôm nay</div>
                <div class="admin-stat-value">24,580</div>
            </div>
        </div>
    </div>

    <div class="admin-table-card ant-card">
        <div class="ant-card-head">
            <div class="ant-card-head-title">Bài hát mới nhất</div>
        </div>
        <div class="ant-card-body" style="padding: 0;">
            <div class="admin-table-wrapper">
                <table class="ant-table admin-table">
                    <thead class="ant-table-thead">
                        <tr>
                            <th>Tên bài hát</th>
                            <th>Nghệ sĩ</th>
                            <th>Thể loại</th>
                            <th>Trạng thái</th>
                        </tr>
                    </thead>
                    <tbody class="ant-table-tbody">
                        <tr><td>Chạy Ngay Đi</td><td>Sơn Tùng M-TP</td><td>Pop</td><td><span class="ant-tag ant-tag-green">Đã duyệt</span></td></tr>
                        <tr><td>See Tình</td><td>Hoàng Thùy Linh</td><td>Pop</td><td><span class="ant-tag ant-tag-green">Đã duyệt</span></td></tr>
                        <tr><td>Waiting For You</td><td>MONO</td><td>Ballad</td><td><span class="ant-tag ant-tag-orange">Chờ duyệt</span></td></tr>
                        <tr><td>Đừng Làm Trái Tim Anh Đau</td><td>Sơn Tùng M-TP</td><td>Pop</td><td><span class="ant-tag ant-tag-green">Đã duyệt</span></td></tr>
                        <tr><td>Ngắm Hoa Lệ Rơi</td><td>Châu Khải Phong</td><td>Ballad</td><td><span class="ant-tag ant-tag-orange">Chờ duyệt</span></td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>
@endsection
