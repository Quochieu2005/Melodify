@extends('layouts.admin')

@section('content')
    <div class="admin-page">
        <div class="admin-page-header">
            <div class="admin-page-header-main">
                <h2 class="admin-page-title">Quản lý Album</h2>
                <p class="admin-page-desc">Danh sách tất cả album trong hệ thống.</p>
            </div>
            <a href="#" class="ant-btn ant-btn-primary admin-create-btn">
                <x-anticon name="plus" />
                <span>Thêm album</span>
            </a>
        </div>
        <div class="admin-table-card ant-card">
            <div class="ant-card-body" style="padding: 0;">
                <div class="admin-table-wrapper">
                    <table class="ant-table admin-table">
                        <thead class="ant-table-thead">
                            <tr>
                                <th>#</th>
                                <th>Tên album</th>
                                <th>Nghệ sĩ</th>
                                <th>Số bài hát</th>
                                <th>Năm phát hành</th>
                                <th>Trạng thái</th>
                                <th>Hành động</th>
                            </tr>
                        </thead>
                        <tbody class="ant-table-tbody">
                            <tr>
                                <td>1</td>
                                <td>Sky Tour</td>
                                <td>Sơn Tùng M-TP</td>
                                <td>8</td>
                                <td>2020</td>
                                <td><span class="ant-tag ant-tag-green">Công khai</span></td>
                                <td><a href="#" class="admin-action-link">Sửa</a></td>
                            </tr>
                            <tr>
                                <td>2</td>
                                <td>22</td>
                                <td>MONO</td>
                                <td>10</td>
                                <td>2022</td>
                                <td><span class="ant-tag ant-tag-green">Công khai</span></td>
                                <td><a href="#" class="admin-action-link">Sửa</a></td>
                            </tr>
                            <tr>
                                <td>3</td>
                                <td>Hoàng</td>
                                <td>Hoàng Thùy Linh</td>
                                <td>12</td>
                                <td>2019</td>
                                <td><span class="ant-tag ant-tag-green">Công khai</span></td>
                                <td><a href="#" class="admin-action-link">Sửa</a></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
@endsection
