@extends('layouts.admin')

@section('content')
<section class="admin-page">
    <div class="admin-page-header">
        <div>
            <h1 class="admin-page-title">Cài đặt tài khoản</h1>
            <p class="admin-page-description">Quản lý bảo mật, thông báo và tùy chọn hiển thị của quản trị viên.</p>
        </div>
    </div>

    <div class="admin-account-settings">
        <aside class="ant-card admin-account-settings-nav" aria-label="Danh mục cài đặt tài khoản">
            <a href="#security" class="is-active"><x-anticon name="setting" /><span>Bảo mật</span></a>
            <a href="#notifications"><x-anticon name="bell" /><span>Thông báo</span></a>
            <a href="#appearance"><x-anticon name="setting" /><span>Giao diện</span></a>
            <a href="{{ route('admin.profile.edit') }}"><x-anticon name="user" /><span>Hồ sơ quản trị</span></a>
        </aside>

        <div class="admin-account-settings-content">
            <form id="security" method="POST" action="{{ route('admin.profile.password') }}" class="ant-card admin-settings-panel">
                @csrf @method('PUT')
                <div class="admin-settings-panel-heading"><div><h2>Đổi mật khẩu</h2><p>Nên sử dụng ít nhất 8 ký tự và không dùng lại mật khẩu cũ.</p></div><span class="ant-tag ant-tag-green">Bảo mật</span></div>
                <div class="admin-form-grid">
                    <div class="admin-form-group admin-form-span"><label class="admin-form-label">Mật khẩu hiện tại</label><input class="ant-input" type="password" name="current_password" placeholder="Nhập mật khẩu hiện tại"></div>
                    <div class="admin-form-group"><label class="admin-form-label">Mật khẩu mới</label><input class="ant-input" type="password" name="password" placeholder="Tối thiểu 8 ký tự"></div>
                    <div class="admin-form-group"><label class="admin-form-label">Xác nhận mật khẩu</label><input class="ant-input" type="password" name="password_confirmation" placeholder="Nhập lại mật khẩu mới"></div>
                </div>
                <div class="admin-form-actions"><button class="ant-btn ant-btn-primary" type="submit">Cập nhật mật khẩu</button></div>
            </form>

            <section id="notifications" class="ant-card admin-settings-panel">
                <div class="admin-settings-panel-heading"><div><h2>Thông báo quản trị</h2><p>Chọn những hoạt động bạn muốn được nhắc trong hệ thống.</p></div></div>
                <label class="admin-settings-switch"><span><strong>Báo cáo nội dung mới</strong><small>Nhận thông báo khi có báo cáo cần xử lý.</small></span><input type="checkbox" checked></label>
                <label class="admin-settings-switch"><span><strong>Thanh toán bất thường</strong><small>Cảnh báo giao dịch thất bại hoặc có rủi ro.</small></span><input type="checkbox" checked></label>
                <label class="admin-settings-switch"><span><strong>Tóm tắt hoạt động</strong><small>Nhận bản tóm tắt hoạt động quản trị hằng tuần.</small></span><input type="checkbox"></label>
            </section>

            <section id="appearance" class="ant-card admin-settings-panel">
                <div class="admin-settings-panel-heading"><div><h2>Giao diện</h2><p>Tùy chỉnh cách hiển thị bảng điều khiển trên thiết bị này.</p></div></div>
                <div class="admin-form-grid">
                    <div class="admin-form-group"><label class="admin-form-label">Ngôn ngữ</label><select class="ant-input"><option>Tiếng Việt</option><option>English</option></select></div>
                    <div class="admin-form-group"><label class="admin-form-label">Mật độ hiển thị</label><select class="ant-input"><option>Thoải mái</option><option>Thu gọn</option></select></div>
                </div>
            </section>
        </div>
    </div>
</section>
@endsection
