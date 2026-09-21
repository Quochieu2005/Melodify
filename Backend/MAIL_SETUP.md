# Gửi email thật cho Melodify

Laravel đang dùng SMTP. Với Gmail, hãy bật xác thực 2 bước và tạo **App Password**; không dùng mật khẩu Gmail thường.

Điền vào `Backend/.env`:

```env
MAIL_MAILER=smtp
MAIL_SCHEME=tls
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-16-character-app-password
MAIL_FROM_ADDRESS=your-email@gmail.com
MAIL_FROM_NAME=Melodify
```

Sau đó chạy:

```bash
cd Backend
php artisan config:clear
php artisan mail:test email-nhan-that@example.com
```

Lệnh `mail:test` chỉ gửi khi bạn chủ động chạy, không mở endpoint công khai để tránh bị lạm dụng gửi spam.
