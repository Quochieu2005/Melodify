import type { Metadata } from 'next';

import LegalPage from '@/components/legal/LegalPage';

export const metadata: Metadata = {
  title: 'Điều khoản sử dụng - Melodify',
  description: 'Các điều khoản khi bạn sử dụng Melodify.',
};

export default function TermsOfUsePage() {
  return (
    <LegalPage
      title="Điều khoản sử dụng"
      updatedAt="28/11/2026"
      intro="Khi truy cập hoặc sử dụng Melodify, bạn đồng ý tuân theo các điều khoản dưới đây. Nếu không đồng ý, vui lòng ngừng sử dụng dịch vụ."
      sections={[
        {
          title: 'Dịch vụ',
          body: <p>Melodify là nền tảng nghe và chia sẻ âm nhạc, cho phép bạn khám phá bài hát, tạo playlist, theo dõi nghệ sĩ và người dùng khác, đăng tải nội dung và mua gói VIP. Chúng tôi có thể thay đổi, bổ sung hoặc ngừng một phần dịch vụ khi cần thiết.</p>,
        },
        {
          title: 'Tài khoản',
          body: (
            <ul>
              <li>Bạn cung cấp thông tin chính xác và chịu trách nhiệm về mọi hoạt động diễn ra trong tài khoản của mình.</li>
              <li>Bạn giữ bí mật thông tin đăng nhập và không chia sẻ tài khoản VIP cho người khác khai thác trái phép.</li>
              <li>Chúng tôi có quyền tạm khóa hoặc chấm dứt tài khoản vi phạm điều khoản hoặc có dấu hiệu lạm dụng.</li>
            </ul>
          ),
        },
        {
          title: 'Nội dung bạn đăng tải',
          body: (
            <>
              <p>Bạn giữ quyền sở hữu nội dung của mình, nhưng cho phép Melodify lưu trữ, hiển thị, phát và phân phối nội dung đó trong phạm vi cần thiết để vận hành dịch vụ.</p>
              <p>Bằng việc đăng tải, bạn cam kết bạn có đủ quyền đối với nội dung (bao gồm quyền tác giả và quyền liên quan) và nội dung không vi phạm pháp luật hoặc quyền của người khác. Bạn chịu trách nhiệm về nội dung do mình đăng.</p>
            </>
          ),
        },
        {
          title: 'Hành vi bị cấm',
          body: (
            <ul>
              <li>Đăng tải nội dung vi phạm bản quyền, trái pháp luật, xúc phạm, kích động bạo lực, thù ghét hoặc xâm phạm quyền riêng tư.</li>
              <li>Tạo lượt nghe, lượt xem, lượt chia sẻ hoặc lượt theo dõi giả bằng công cụ tự động hoặc cách thức gian lận khác.</li>
              <li>Tải xuống, sao chép hoặc phân phối lại nội dung vượt quá phạm vi cho phép, hoặc bẻ khóa các hạn chế truy cập (ví dụ nội dung chỉ dành cho VIP).</li>
              <li>Can thiệp, làm quá tải, dò quét lỗ hổng hoặc truy cập trái phép vào hệ thống.</li>
              <li>Mạo danh người khác hoặc cung cấp thông tin sai lệch.</li>
            </ul>
          ),
        },
        {
          title: 'Bản quyền và báo cáo vi phạm',
          body: <p>Melodify tôn trọng quyền sở hữu trí tuệ. Nếu bạn cho rằng một nội dung xâm phạm quyền của mình, hãy dùng chức năng Báo cáo trên bài hát đó và nêu rõ căn cứ. Chúng tôi sẽ xem xét và có thể gỡ hoặc hạn chế nội dung bị báo cáo trong khi xử lý.</p>,
        },
        {
          title: 'Gói VIP và thanh toán',
          body: (
            <>
              <p>Giá, thời hạn và quyền lợi của từng gói được hiển thị tại trang Mua VIP trước khi bạn thanh toán. Thanh toán được xử lý qua cổng SePay.</p>
              <p>Nếu tài khoản ngân hàng đã bị trừ tiền nhưng VIP chưa được kích hoạt, vui lòng không thanh toán lại; hãy dùng chức năng kiểm tra thanh toán trong Lịch sử giao dịch hoặc gửi mã đơn cho chúng tôi để đối soát.</p>
            </>
          ),
        },
        {
          title: 'Nội dung từ bên thứ ba',
          body: <p>Một số bài hát, lời bài hát và hình ảnh có thể đến từ nguồn bên thứ ba. Chúng tôi không đảm bảo các nguồn này luôn sẵn sàng hoặc không thay đổi, và liên kết ra ngoài Melodify không có nghĩa là chúng tôi bảo chứng nội dung đó.</p>,
        },
        {
          title: 'Quyền sở hữu của Melodify',
          body: <p>Giao diện, mã nguồn, nhãn hiệu và các nội dung do Melodify tạo ra thuộc quyền của Melodify hoặc bên cấp phép. Bạn không được sao chép, sửa đổi hay khai thác thương mại nếu chưa được đồng ý bằng văn bản.</p>,
        },
        {
          title: 'Miễn trừ và giới hạn trách nhiệm',
          body: <p>Dịch vụ được cung cấp trên cơ sở &quot;như hiện có&quot;. Trong phạm vi pháp luật cho phép, Melodify không chịu trách nhiệm đối với gián đoạn dịch vụ, mất dữ liệu ngoài ý muốn hoặc thiệt hại gián tiếp phát sinh từ việc sử dụng dịch vụ, trừ khi do lỗi cố ý hoặc vi phạm nghiêm trọng của chúng tôi.</p>,
        },
        {
          title: 'Thay đổi điều khoản và luật áp dụng',
          body: <p>Chúng tôi có thể cập nhật điều khoản này và sẽ đăng phiên bản mới tại trang này kèm ngày cập nhật. Việc tiếp tục sử dụng sau khi điều khoản thay đổi nghĩa là bạn chấp nhận nội dung mới. Điều khoản được điều chỉnh bởi pháp luật Việt Nam.</p>,
        },
      ]}
    />
  );
}
