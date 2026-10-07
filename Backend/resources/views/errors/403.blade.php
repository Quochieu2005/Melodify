@include('errors.admin', [
    'status' => 403,
    'title' => 'Không có quyền truy cập',
    'message' => 'Tài khoản của bạn không được phép thực hiện thao tác hoặc mở trang này.',
])
