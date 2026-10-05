<x-mail::message>
# Tài khoản quản trị Melodify

Xin chào **{{ $adminName }}**,

Tài khoản quản trị của bạn đã được tạo trên hệ thống Melodify.

<x-mail::panel>
**Email:** {{ $email }}  
**Mật khẩu khởi tạo:** {{ $password }}
</x-mail::panel>

Bạn nên đăng nhập và đổi mật khẩu khởi tạo ở lần truy cập đầu tiên. Thông tin này chỉ nên được sử dụng bởi chủ tài khoản.

Nếu bạn không yêu cầu tài khoản này, hãy liên hệ quản trị viên hệ thống.

Trân trọng,<br>
{{ config('app.name') }}
</x-mail::message>
