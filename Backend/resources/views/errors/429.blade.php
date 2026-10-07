@include('errors.admin', [
    'status' => 429,
    'title' => 'Quá nhiều yêu cầu',
    'message' => 'Hệ thống đang giới hạn tạm thời. Vui lòng đợi một chút rồi thử lại.',
])
