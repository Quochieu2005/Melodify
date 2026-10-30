@include('errors.admin', [
    'status' => 422,
    'title' => 'Dữ liệu chưa hợp lệ',
    'message' => 'Một hoặc nhiều thông tin chưa đúng. Hãy kiểm tra lại dữ liệu đã nhập.',
])
