@extends('layouts.admin')

@section('content')
<div class="admin-page">
    <div class="admin-page-header">
        <div class="admin-page-header-main">
            <h2 class="admin-page-title">Cài đặt hệ thống</h2>
            <p class="admin-page-desc">Cấu hình chung cho nền tảng Melodify.</p>
        </div>
    </div>

    <div class="admin-settings-grid">
        <div class="ant-card admin-setting-card">
            <div class="ant-card-head">
                <div class="ant-card-head-title">Thông tin chung</div>
            </div>
            <div class="ant-card-body">
                <div class="admin-form-group">
                    <label class="admin-form-label">Tên ứng dụng</label>
                    <input type="text" class="ant-input admin-form-input" value="Melodify" />
                </div>
                <div class="admin-form-group">
                    <label class="admin-form-label">Mô tả</label>
                    <textarea class="ant-input admin-form-input admin-form-textarea" rows="3">Nền tảng nghe nhạc trực tuyến</textarea>
                </div>
                <div class="admin-form-group">
                    <label class="admin-form-label">Email liên hệ</label>
                    <input type="email" class="ant-input admin-form-input" value="contact@melodify.vn" />
                </div>
                <button type="button" class="ant-btn ant-btn-primary admin-create-btn">Lưu thay đổi</button>
            </div>
        </div>

        <div class="ant-card admin-setting-card">
            <div class="ant-card-head">
                <div class="ant-card-head-title">Cấu hình nội dung</div>
            </div>
            <div class="ant-card-body">
                <div class="admin-form-group">
                    <label class="admin-form-label">Dung lượng tối đa mỗi bài hát</label>
                    <input type="text" class="ant-input admin-form-input" value="50 MB" />
                </div>
                <div class="admin-form-group">
                    <label class="admin-form-label">Định dạng cho phép</label>
                    <input type="text" class="ant-input admin-form-input" value="mp3, flac, wav" />
                </div>
                <div class="admin-form-group">
                    <label class="admin-form-label">Tự động duyệt bài hát</label>
                    <select class="ant-input admin-form-input">
                        <option>Không</option>
                        <option>Có</option>
                    </select>
                </div>
                <button type="button" class="ant-btn ant-btn-primary admin-create-btn">Lưu thay đổi</button>
            </div>
        </div>
    </div>
</div>
@endsection