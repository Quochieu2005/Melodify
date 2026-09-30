@extends('layouts.admin')

@section('content')
<div class="admin-page">
    <div class="admin-page-header">
        <div class="admin-page-header-main">
            <h2 class="admin-page-title">Quản lý thể loại</h2>
            <p class="admin-page-desc">Danh sách tất cả thể loại nhạc.</p>
        </div>
        <a href="#" class="ant-btn ant-btn-primary admin-create-btn">
            <x-anticon name="plus" />
            <span>Thêm thể loại</span>
        </a>
    </div>
    <div class="admin-table-card ant-card">
        <div class="ant-card-body" style="padding: 0;">
            <div class="admin-table-wrapper">
                <table class="ant-table admin-table">
                    <thead class="ant-table-thead">
                        <tr>
                            <th>#</th>
                            <th>Tên thể loại</th>
                            <th>Slug</th>
                            <th>Số bài hát</th>
                            <th>Trạng thái</th>
                            <th>Hành động</th>
                        </tr>
                    </thead>
                    <tbody class="ant-table-tbody">
                        <tr><td>1</td><td>Pop</td><td>pop</td><td>450</td><td><span class="ant-tag ant-tag-green">Hoạt động</span></td><td><a href="#" class="admin-action-link">Sửa</a></td></tr>
                        <tr><td>2</td><td>Ballad</td><td>ballad</td><td>320</td><td><span class="ant-tag ant-tag-green">Hoạt động</span></td><td><a href="#" class="admin-action-link">Sửa</a></td></tr>
                        <tr><td>3</td><td>Rock</td><td>rock</td><td>180</td><td><span class="ant-tag ant-tag-green">Hoạt động</span></td><td><a href="#" class="admin-action-link">Sửa</a></td></tr>
                        <tr><td>4</td><td>Hip-Hop</td><td>hip-hop</td><td>220</td><td><span class="ant-tag ant-tag-green">Hoạt động</span></td><td><a href="#" class="admin-action-link">Sửa</a></td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>
@endsection