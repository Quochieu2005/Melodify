import type { Metadata } from 'next';

import LegalPage from '@/components/legal/LegalPage';

export const metadata: Metadata = {
  title: 'Chính sách bảo mật - Melodify',
  description: 'Melodify thu thập, sử dụng và bảo vệ dữ liệu cá nhân của bạn như thế nào.',
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Chính sách bảo mật"
      updatedAt="28/11/2026"
      intro="Chính sách này giải thích Melodify thu thập những dữ liệu nào, dùng chúng để làm gì và bạn có những quyền nào. Khi tạo tài khoản hoặc sử dụng Melodify, bạn đồng ý với cách xử lý dữ liệu được mô tả dưới đây."
      sections={[
        {
          title: 'Dữ liệu chúng tôi thu thập',
          body: (
            <>
              <p>Tùy cách bạn sử dụng dịch vụ, Melodify có thể thu thập:</p>
              <ul>
                <li><strong>Thông tin tài khoản:</strong> tên hiển thị, tên người dùng, email, số điện thoại, ảnh đại diện và mật khẩu (mật khẩu được lưu dưới dạng đã mã hóa một chiều, chúng tôi không đọc được mật khẩu gốc).</li>
                <li><strong>Đăng nhập qua Google hoặc Facebook:</strong> tên, email và ảnh đại diện mà nhà cung cấp chia sẻ khi bạn đồng ý. Chúng tôi không nhận mật khẩu của các tài khoản đó.</li>
                <li><strong>Hoạt động sử dụng:</strong> bài hát yêu thích, playlist, nghệ sĩ và người dùng bạn theo dõi, lịch sử nghe gần đây, lượt xem và chia sẻ.</li>
                <li><strong>Mã định danh trình duyệt:</strong> khi chưa đăng nhập, ứng dụng lưu một mã ngẫu nhiên trên thiết bị để ghi nhớ thư viện tạm thời và tránh đếm lặp lượt nghe, lượt xem.</li>
                <li><strong>Nội dung bạn tải lên:</strong> bài hát, ảnh bìa, ảnh đại diện và mô tả bạn đăng.</li>
                <li><strong>Giao dịch VIP:</strong> mã đơn, gói đã mua, số tiền, phương thức và trạng thái thanh toán. Chúng tôi không lưu số thẻ hay thông tin tài khoản ngân hàng của bạn.</li>
                <li><strong>Dữ liệu kỹ thuật và an ninh:</strong> địa chỉ IP, loại thiết bị và trình duyệt, thời điểm truy cập, dùng để chống lạm dụng và điều tra sự cố.</li>
                <li><strong>Báo cáo:</strong> nội dung báo cáo bài hát hoặc nội dung vi phạm mà bạn gửi.</li>
              </ul>
            </>
          ),
        },
        {
          title: 'Mục đích sử dụng',
          body: (
            <ul>
              <li>Tạo và quản lý tài khoản, xác thực đăng nhập (bao gồm mã OTP qua tin nhắn và đăng nhập bằng mã QR).</li>
              <li>Cung cấp tính năng nghe nhạc, thư viện cá nhân, playlist, theo dõi và gợi ý nội dung.</li>
              <li>Xử lý thanh toán và kích hoạt gói VIP.</li>
              <li>Thống kê lượt nghe, lượt yêu thích, lượt chia sẻ để xếp hạng và cải thiện dịch vụ.</li>
              <li>Phát hiện, ngăn chặn gian lận, spam và hành vi lạm dụng; xử lý báo cáo vi phạm.</li>
              <li>Tuân thủ yêu cầu hợp lệ của cơ quan nhà nước có thẩm quyền.</li>
            </ul>
          ),
        },
        {
          title: 'Bên thứ ba xử lý dữ liệu',
          body: (
            <>
              <p>Để vận hành, Melodify sử dụng một số dịch vụ bên ngoài và chỉ chia sẻ phần dữ liệu cần thiết cho từng việc:</p>
              <ul>
                <li>Dịch vụ lưu trữ máy chủ và cơ sở dữ liệu (Render, MongoDB Atlas).</li>
                <li>Dịch vụ lưu trữ ảnh và tệp tải lên (Cloudinary).</li>
                <li>Dịch vụ gửi mã OTP qua tin nhắn (Twilio).</li>
                <li>Cổng thanh toán SePay cho giao dịch VIP.</li>
                <li>Google và Facebook khi bạn chọn đăng nhập bằng các tài khoản này.</li>
              </ul>
              <p>Một số nội dung âm nhạc có thể đến từ nguồn bên thứ ba. Khi bạn mở các liên kết ra ngoài Melodify, chính sách của trang đó sẽ được áp dụng.</p>
            </>
          ),
        },
        {
          title: 'Chúng tôi không bán dữ liệu của bạn',
          body: <p>Melodify không bán dữ liệu cá nhân cho bên thứ ba. Dữ liệu chỉ được chia sẻ trong các trường hợp nêu ở mục 3, khi có yêu cầu hợp lệ của cơ quan có thẩm quyền, hoặc khi bạn đồng ý.</p>,
        },
        {
          title: 'Thời gian lưu trữ',
          body: <p>Chúng tôi lưu dữ liệu trong thời gian tài khoản còn hoạt động và trong khoảng thời gian cần thiết để cung cấp dịch vụ, giải quyết khiếu nại, đối soát giao dịch và đáp ứng nghĩa vụ pháp lý. Khi tài khoản bị xóa, dữ liệu cá nhân gắn với tài khoản sẽ được xóa hoặc ẩn danh, trừ phần pháp luật yêu cầu giữ lại.</p>,
        },
        {
          title: 'Bảo mật',
          body: <p>Chúng tôi áp dụng các biện pháp kỹ thuật và quản trị hợp lý như mã hóa mật khẩu, kết nối HTTPS, giới hạn tốc độ truy cập và phân quyền quản trị. Tuy nhiên, không có hệ thống nào an toàn tuyệt đối; bạn nên giữ bí mật thông tin đăng nhập và báo ngay cho chúng tôi khi nghi ngờ tài khoản bị truy cập trái phép.</p>,
        },
        {
          title: 'Quyền của bạn',
          body: (
            <>
              <p>Theo quy định về bảo vệ dữ liệu cá nhân của Việt Nam (Nghị định 13/2023/NĐ-CP), bạn có quyền:</p>
              <ul>
                <li>Được biết, truy cập và chỉnh sửa dữ liệu cá nhân của mình (bạn có thể sửa nhiều thông tin trực tiếp trong trang hồ sơ).</li>
                <li>Rút lại sự đồng ý, hạn chế hoặc phản đối việc xử lý dữ liệu.</li>
                <li>Yêu cầu xóa dữ liệu cá nhân và xóa tài khoản.</li>
                <li>Khiếu nại, khởi kiện theo quy định của pháp luật.</li>
              </ul>
              <p>Việc rút lại sự đồng ý hoặc xóa dữ liệu có thể khiến một số tính năng không còn sử dụng được.</p>
            </>
          ),
        },
        {
          title: 'Trẻ em',
          body: <p>Melodify không dành cho trẻ em dưới 13 tuổi. Người dùng dưới 16 tuổi nên được cha mẹ hoặc người giám hộ đồng ý trước khi sử dụng dịch vụ. Nếu bạn phát hiện trẻ em đã cung cấp dữ liệu cá nhân cho chúng tôi, hãy liên hệ để chúng tôi xóa.</p>,
        },
        {
          title: 'Thay đổi chính sách',
          body: <p>Chúng tôi có thể cập nhật chính sách này. Phiên bản mới sẽ được đăng tại trang này kèm ngày cập nhật. Việc tiếp tục sử dụng Melodify sau khi chính sách thay đổi nghĩa là bạn chấp nhận nội dung mới.</p>,
        },
      ]}
    />
  );
}
